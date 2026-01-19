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
} from "@repo/db";
import { MatchAction as MatchActionEnum } from "@repo/constants";
import {
  GetRotationStateQuery,
  GetStartingRotationQuery,
  GetSetsQuery,
  GetActionsQuery,
  GetPlayerStatsQuery,
  ListMatchesByTeamQuery,
  GetMatchTotalsByPlayerQuery,
  RecordActionCommand,
  SetStartingRotationCommand,
  DeleteActionCommand,
  DeleteStartingRotationCommand,
  GetMatchStatsQuery,
  GetSetStatsQuery,
} from "@repo/services";


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
const getMatchTotalsByPlayerInput = z.object({ matchId: z.string().uuid() });
const getMatchStatsInput = z.object({ matchId: z.string().uuid(), teamId: z.string().uuid() });
const getSetStatsInput = z.object({ matchId: z.string().uuid(), teamId: z.string().uuid(), setId: z.string().uuid()});

@Injectable()
export class MatchRouter {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
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
        return this.queryBus.execute(new ListMatchesByTeamQuery(input.teamId, userId));
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
          const matchRepository = manager.getRepository(MatchEntity);
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
        };
      }),

    getScore: protectedProcedure
      .input(getScoreInput)
      .query(async ({ input }) => {
        return this.queryBus.execute(new GetSetsQuery(input.matchId));
      }),

    getSets: protectedProcedure.input(getScoreInput)
      .query(async ({ input }) => {
        return this.queryBus.execute(new GetSetsQuery(input.matchId));
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
        return this.queryBus.execute(new GetActionsQuery(input.matchId, input.setId));
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
        return this.queryBus.execute(new GetMatchTotalsByPlayerQuery(input.matchId));
      }),

    getPlayerStats: protectedProcedure
      .input(getPlayerStatsInput)
      .query(async ({ input }) => {
        return this.queryBus.execute(new GetPlayerStatsQuery(input.matchId, input.playerId));
      }),

    getMatchStats: protectedProcedure.input(getMatchStatsInput).query(async ({input}) => {
      return this.queryBus.execute(new GetMatchStatsQuery(input.matchId, input.teamId))
    }),

    getSetStats: protectedProcedure.input(getSetStatsInput).query(async ({input}) => {
      return this.queryBus.execute(new GetSetStatsQuery(input.matchId, input.teamId, input.setId))
    })
  });
}
