import { Injectable } from "@nestjs/common";
import { TRPCError } from "@trpc/server";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { z } from "zod";
import { procedure, protectedProcedure, t } from "../base/index.js";
import {
  Match as MatchEntity,
  Set as MatchSet,
  Team,
  MatchAction,
  PlayerMatchStats,
} from "@repo/db";
import { MatchAction as MatchActionEnum } from "@repo/constants";
import { GetRotationStateQuery,
  GetStartingRotationQuery, RecordActionCommand, SetStartingRotationCommand, DeleteActionCommand, DeleteStartingRotationCommand } from "@repo/services";

const recordActionInput = z.object({
  matchId: z.string().uuid(),
  setId: z.string().uuid(),
  teamId: z.string().uuid(),
  playerId: z.string().uuid(),
  actionType: z.nativeEnum(MatchActionEnum),
  outcome: z.string().min(1),
  pointDelta: z.number().int(),
  occurredAt: z.coerce.date().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const getScoreInput = z.object({ matchId: z.string().uuid() });
const getActionsInput = z.object({ matchId: z.string().uuid(), setId: z.string().uuid() });
const getPlayerStatsInput = z.object({ matchId: z.string().uuid(), playerId: z.string().uuid() });
const createMatchInput = z.object({ teamAId: z.string().uuid(), teamBId: z.string().uuid() });
const listByTeamInput = z.object({ teamId: z.string().uuid() });
const setStartingRotationInput = z.object({
  setId: z.string().uuid(),
  teamId: z.string().uuid(),
  positions: z.array(z.string().uuid()).length(6),
  liberoId: z.string().uuid(),
});
const getStartingRotationInput = z.object({ setId: z.string().uuid(), teamId: z.string().uuid() });
const deleteStartingRotationInput = z.object({ setId: z.string().uuid(), teamId: z.string().uuid() });
const getRotationStateInput = z.object({ setId: z.string().uuid() });
const deleteActionInput = z.object({ id: z.string().uuid() });
const getMatchTotalsInput = z.object({ matchId: z.string().uuid() });
const getMatchTotalsByPlayerInput = z.object({ matchId: z.string().uuid() });

@Injectable()
export class MatchRouter {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @InjectRepository(MatchSet) private readonly setRepo: Repository<MatchSet>,
    @InjectRepository(MatchAction) private readonly actionRepo: Repository<MatchAction>,
    @InjectRepository(PlayerMatchStats) private readonly statsRepo: Repository<PlayerMatchStats>,
    @InjectRepository(MatchEntity) private readonly matchRepo: Repository<MatchEntity>,
    @InjectRepository(Team) private readonly teamRepo: Repository<Team>,
  ) {}

  public readonly router = t.router({
    listByTeam: protectedProcedure
      .input(listByTeamInput)
      .query(async ({ input, ctx }) => {
        const userId = ctx.auth.userId;
        if (!userId) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        const team = await this.teamRepo.findOne({ where: { id: input.teamId, ownerClerkId: userId } });
        if (!team) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found or not owned by user" });
        }

        const matches = await this.matchRepo.find({
          where: [
            { teamA: { id: input.teamId } },
            { teamB: { id: input.teamId } },
          ],
          relations: ["teamA", "teamB"],
          order: { createdAt: "DESC" },
        });

        return matches.map((m) => ({
          id: m.id,
          teamAId: m.teamAId,
          teamBId: m.teamBId,
          teamAName: m.teamA?.name,
          teamBName: m.teamB?.name,
          createdAt: m.createdAt,
        }));
      }),

    create: protectedProcedure
      .input(createMatchInput)
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.auth.userId;
        if (!userId) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        if (input.teamAId === input.teamBId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Teams must be different" });
        }

        const result = await this.matchRepo.manager.transaction(async (manager) => {
          const teamRepository = manager.getRepository(Team);
          const matchRepository = manager.getRepository(Match);
          const setRepository = manager.getRepository(MatchSet);

          const [teamA, teamB] = await Promise.all([
            teamRepository.findOne({ where: { id: input.teamAId, ownerClerkId: userId } }),
            teamRepository.findOne({ where: { id: input.teamBId, ownerClerkId: userId } }),
          ]);

          if (!teamA || !teamB) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Teams not found or not owned by user" });
          }

          const match = matchRepository.create({ teamA, teamB });
          const savedMatch = await matchRepository.save(match);

          const setsToCreate = Array.from({ length: 5 }, (v, k) =>
            setRepository.create({ match: savedMatch, pointsA: 0, pointsB: 0, key: k}),
          );
          const savedSets = await setRepository.save(setsToCreate);

          return { savedMatch, savedSets };
        });

        return {
          id: result.savedMatch.id,
          teamAId: result.savedMatch.teamAId,
          teamBId: result.savedMatch.teamBId,
          createdAt: result.savedMatch.createdAt,
          sets: result.savedSets.map((s, idx) => ({
            id: s.id,
            pointsA: s.pointsA,
            pointsB: s.pointsB,
            order: idx + 1,
          })),
        };
      }),

    recordAction: protectedProcedure
      .input(recordActionInput)
      .mutation(async ({ input }) => {
        const match = await this.matchRepo.findOne({ where: { id: input.matchId } });
        if (!match) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Match not found" });
        }
        const set = await this.setRepo.findOne({ where: { id: input.setId }, relations: ["match"] });
        if (!set || set.match.id !== input.matchId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Set not found for match" });
        }
        const action = await this.commandBus.execute(
          new RecordActionCommand(
            input.matchId,
            input.setId,
            input.teamId,
            input.playerId,
            input.actionType,
            input.outcome,
            input.pointDelta,
            input.occurredAt ?? new Date(),
            input.metadata ?? null,
          ),
        );
        return {
          id: action.id,
          sequence: action.sequence,
          rally: action.rally,
          occurredAt: action.occurredAt,
          score: { pointsA: set.pointsA, pointsB: set.pointsB },
        };
      }),

    getScore: protectedProcedure
      .input(getScoreInput)
      .query(async ({ input }) => {
        const sets = await this.setRepo.find({
          where: { match: { id: input.matchId } },
          order: { createdAt: "ASC" },
        });
        if (!sets.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Match or sets not found" });
        }
        return sets.map((s, idx) => ({
          id: s.id,
          pointsA: s.pointsA,
          pointsB: s.pointsB,
          matchId: input.matchId,
          order: idx + 1,
        }));
      }),

    getSets: protectedProcedure.input(getScoreInput)
      .query(async ({ input }) => {
        return await this.setRepo.find({
          where: { match: { id: input.matchId } },
          order: { createdAt: "ASC" },
        });
      }),

    setStartingRotation: protectedProcedure
      .input(setStartingRotationInput)
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.auth.userId;
        if (!userId) throw new TRPCError({ code: "UNAUTHORIZED" });
        // Ownership: ensure team belongs to user
        const team = await this.teamRepo.findOne({ where: { id: input.teamId, ownerClerkId: userId } });
        if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found or not owned by user" });

        await this.commandBus.execute(
          new SetStartingRotationCommand(
            input.setId,
            input.teamId,
            input.positions as [string, string, string, string, string, string],
            input.liberoId,
          ),
        );
        return { success: true } as const;
      }),

    getStartingRotation: protectedProcedure
      .input(getStartingRotationInput)
      .query(async ({ input, ctx }) => {
        const userId = ctx.auth.userId;
        if (!userId) throw new TRPCError({ code: "UNAUTHORIZED" });
        const team = await this.teamRepo.findOne({ where: { id: input.teamId, ownerClerkId: userId } });
        if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found or not owned by user" });
        return this.queryBus.execute(new GetStartingRotationQuery(input.setId, input.teamId));
      }),

    deleteStartingRotation: protectedProcedure
      .input(deleteStartingRotationInput)
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.auth.userId;
        if (!userId) throw new TRPCError({ code: "UNAUTHORIZED" });
        const team = await this.teamRepo.findOne({ where: { id: input.teamId, ownerClerkId: userId } });
        if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found or not owned by user" });

        await this.commandBus.execute(new DeleteStartingRotationCommand(input.setId, input.teamId));
        return { success: true } as const;
      }),

    getRotationState: protectedProcedure
      .input(getRotationStateInput)
      .query(async ({ input }) => {
        return this.queryBus.execute(new GetRotationStateQuery(input.setId));
      }),

    getActions: protectedProcedure
      .input(getActionsInput)
      .query(async ({ input }) => {
        const actions = await this.actionRepo.find({
          where: { set: { id: input.setId }, match: { id: input.matchId } },
          order: { sequence: "ASC" },
        });
        return actions.map((a) => ({
          id: a.id,
          matchId: a.matchId,
          setId: a.setId,
          teamId: a.teamId,
          playerId: a.playerId,
          actionType: a.actionType,
          outcome: a.outcome,
          pointDelta: a.pointDelta,
          sequence: a.sequence,
          rally: a.rally,
          occurredAt: a.occurredAt,
          metadata: a.metadata,
        }));
      }),

    deleteAction: protectedProcedure
      .input(deleteActionInput)
      .mutation(async ({ input }) => {
        const score = await this.commandBus.execute(new DeleteActionCommand(input.id));
        return { success: true, score } as const;
      }),

    getMatchTotalsByPlayer: protectedProcedure
      .input(getMatchTotalsByPlayerInput)
      .query(async ({ input }) => {
        const match = await this.matchRepo.findOne({ where: { id: input.matchId }, relations: ["teamA", "teamB"] });
        if (!match) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Match not found" });
        }

        const actions = await this.actionRepo.find({ where: { match: { id: input.matchId } }, order: { sequence: "ASC" } });

        type CategoryTotals = { attempts: number; scored: number; errors: number; successPct?: number; errorPct?: number };
        type ByTypeTotals = { attempts: number; scored: number; errors: number };

        const initCategory = (): CategoryTotals => ({ attempts: 0, scored: 0, errors: 0 });
        const initPlayerTotals = (playerId: string, teamId: string) => ({
          playerId,
          teamId,
          categories: {
            attacks: initCategory(),
            serves: initCategory(),
            blocks: initCategory(),
            reception: initCategory(),
          },
          byType: {} as Record<string, ByTypeTotals>,
        });

        const totals = new Map<string, ReturnType<typeof initPlayerTotals>>();

        const sets = {
          attacks: new globalThis.Set<MatchActionEnum>([
            MatchActionEnum.EarnedSpike,
            MatchActionEnum.EarnedTip,
            MatchActionEnum.EarnedDump,
            MatchActionEnum.EarnedDownBallHit,
            MatchActionEnum.ErrorSpike,
            MatchActionEnum.ErrorTip,
            MatchActionEnum.ErrorDump,
            MatchActionEnum.ErrorDownBallHit,
            MatchActionEnum.InRallyHitStillInPlay,
          ]),
          serves: new globalThis.Set<MatchActionEnum>([
            MatchActionEnum.EarnedAce,
            MatchActionEnum.ErrorServe,
            MatchActionEnum.InRallyOneServe,
            MatchActionEnum.InRallyTwoServe,
            MatchActionEnum.InRallyThreeServe,
          ]),
          blocks: new globalThis.Set<MatchActionEnum>([
            MatchActionEnum.EarnedBlock,
            MatchActionEnum.ErrorBlock,
            MatchActionEnum.InRallyBlockStillInPlay,
          ]),
          reception: new globalThis.Set<MatchActionEnum>([
            MatchActionEnum.ErrorReceive,
            MatchActionEnum.ErrorDig,
            MatchActionEnum.ErrorFreeBallReceive,
            MatchActionEnum.ErrorWhoseBall,
          ]),
        } as const;

        const addByType = (playerTotals: ReturnType<typeof initPlayerTotals>, actionType: MatchActionEnum, pointDelta: number) => {
          const current = playerTotals.byType[actionType] ?? { attempts: 0, scored: 0, errors: 0 };
          current.attempts += 1;
          if (pointDelta > 0) current.scored += 1;
          if (pointDelta < 0) current.errors += 1;
          playerTotals.byType[actionType] = current;
        };

        const applyCategory = (
          playerTotals: ReturnType<typeof initPlayerTotals>,
          category: keyof typeof sets,
          pointDelta: number,
        ) => {
          const cat = playerTotals.categories[category];
          cat.attempts += 1;
          if (pointDelta > 0) cat.scored += 1;
          if (pointDelta < 0) cat.errors += 1;
        };

        for (const action of actions) {
          const { actionType, pointDelta, playerId, teamId } = action;
          if (!playerId) continue;
          const playerTotals = totals.get(playerId) ?? initPlayerTotals(playerId, teamId);

          if (sets.attacks.has(actionType)) applyCategory(playerTotals, "attacks", pointDelta);
          if (sets.serves.has(actionType)) applyCategory(playerTotals, "serves", pointDelta);
          if (sets.blocks.has(actionType)) applyCategory(playerTotals, "blocks", pointDelta);
          if (sets.reception.has(actionType)) applyCategory(playerTotals, "reception", pointDelta);

          addByType(playerTotals, actionType, pointDelta);

          totals.set(playerId, playerTotals);
        }

        const finalize = (cat: CategoryTotals): CategoryTotals => {
          const attempts = cat.attempts || 0;
          return {
            ...cat,
            successPct: attempts ? Number((cat.scored / attempts).toFixed(2)) : 0,
            errorPct: attempts ? Number((cat.errors / attempts).toFixed(2)) : 0,
          };
        };

        return {
          matchId: input.matchId,
          players: Array.from(totals.values()).map((p) => ({
            playerId: p.playerId,
            teamId: p.teamId,
            categories: {
              attacks: finalize(p.categories.attacks),
              serves: finalize(p.categories.serves),
              blocks: finalize(p.categories.blocks),
              reception: finalize(p.categories.reception),
            },
            byType: p.byType,
          })),
        } as const;
      }),

    getPlayerStats: protectedProcedure
      .input(getPlayerStatsInput)
      .query(async ({ input }) => {
        const stats = await this.statsRepo.findOne({ where: { match: { id: input.matchId }, player: { id: input.playerId } } });
        if (!stats) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Stats not found" });
        }
        return {
          id: stats.id,
          matchId: stats.matchId,
          playerId: stats.playerId,
          actions: stats.actions,
          scoringActions: stats.scoringActions,
          penalties: stats.penalties,
          byType: stats.byType,
        };
      }),
  });
}
