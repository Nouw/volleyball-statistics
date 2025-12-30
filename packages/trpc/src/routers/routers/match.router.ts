import { Injectable } from "@nestjs/common";
import { TRPCError } from "@trpc/server";
import { CommandBus } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { z } from "zod";
import { procedure, protectedProcedure, t } from "../base/index.js";
import {
  Match,
  Set,
  Team,
  MatchAction,
  PlayerMatchStats,
} from "@repo/db";
import { RecordActionCommand } from "@repo/services";

const recordActionInput = z.object({
  matchId: z.string().uuid(),
  setId: z.string().uuid(),
  teamId: z.string().uuid(),
  playerId: z.string().uuid(),
  actionType: z.string().min(1),
  outcome: z.string().min(1),
  pointDelta: z.number().int(),
  occurredAt: z.coerce.date().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const getScoreInput = z.object({ matchId: z.string().uuid() });
const getActionsInput = z.object({ matchId: z.string().uuid(), setId: z.string().uuid() });
const getPlayerStatsInput = z.object({ matchId: z.string().uuid(), playerId: z.string().uuid() });
const createMatchInput = z.object({ teamAId: z.string().uuid(), teamBId: z.string().uuid() });

@Injectable()
export class MatchRouter {
  constructor(
    private readonly commandBus: CommandBus,
    @InjectRepository(Set) private readonly setRepo: Repository<Set>,
    @InjectRepository(MatchAction) private readonly actionRepo: Repository<MatchAction>,
    @InjectRepository(PlayerMatchStats) private readonly statsRepo: Repository<PlayerMatchStats>,
    @InjectRepository(Match) private readonly matchRepo: Repository<Match>,
    @InjectRepository(Team) private readonly teamRepo: Repository<Team>,
  ) {}

  public readonly router = t.router({
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

        const [teamA, teamB] = await Promise.all([
          this.teamRepo.findOne({ where: { id: input.teamAId, ownerClerkId: userId } }),
          this.teamRepo.findOne({ where: { id: input.teamBId, ownerClerkId: userId } }),
        ]);

        if (!teamA || !teamB) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Teams not found or not owned by user" });
        }

        const match = this.matchRepo.create({
          teamA,
          teamB,
        });
        const saved = await this.matchRepo.save(match);
        return {
          id: saved.id,
          teamAId: saved.teamAId,
          teamBId: saved.teamBId,
          createdAt: saved.createdAt,
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
        return sets.map((s) => ({ id: s.id, pointsA: s.pointsA, pointsB: s.pointsB, matchId: input.matchId }));
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
