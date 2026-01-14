import { Injectable } from "@nestjs/common";
import { TRPCError } from "@trpc/server";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { z } from "zod";
import { protectedProcedure, t } from "../base/index.js";
import { Team, Player } from "@repo/db";

const createTeamInput = z.object({
  name: z.string().min(1),
  division: z.string().nullable().optional(),
});

const getTeamInput = z.object({ id: z.string().uuid() });
const listPlayersInput = z.object({ teamId: z.string().uuid() });

@Injectable()
export class TeamRouter {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(Player)
    private readonly playerRepo: Repository<Player>,
  ) {}

  public readonly router = t.router({
    create: protectedProcedure
      .input(createTeamInput)
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.auth.userId;
        if (!userId) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        const existing = await this.teamRepo.findOne({ where: { name: input.name, ownerClerkId: userId } });
        if (existing) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Team name already exists for this user" });
        }

        const team = this.teamRepo.create({
          name: input.name,
          division: input.division ?? null,
          ownerClerkId: userId,
        });
        const saved = await this.teamRepo.save(team);
        return {
          id: saved.id,
          name: saved.name,
          division: saved.division,
          ownerClerkId: saved.ownerClerkId,
          createdAt: saved.createdAt,
        };
      }),

    list: protectedProcedure
      .query(async ({ ctx }) => {
        const userId = ctx.auth.userId;
        if (!userId) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        const teams = await this.teamRepo.find({ where: { ownerClerkId: userId }, order: { createdAt: "ASC" } });
        return teams.map((t) => ({
          id: t.id,
          name: t.name,
          division: t.division,
          ownerClerkId: t.ownerClerkId,
          createdAt: t.createdAt,
        }));
      }),

    getById: protectedProcedure
      .input(getTeamInput)
      .query(async ({ input, ctx }) => {
        const userId = ctx.auth.userId;
        if (!userId) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        const team = await this.teamRepo.findOne({ where: { id: input.id, ownerClerkId: userId } });
        if (!team) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }
        return {
          id: team.id,
          name: team.name,
          division: team.division,
          ownerClerkId: team.ownerClerkId,
          createdAt: team.createdAt,
        };
      }),

    players: protectedProcedure
      .input(listPlayersInput)
      .query(async ({ input, ctx }) => {
        const userId = ctx.auth.userId;
        if (!userId) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        const team = await this.teamRepo.findOne({ where: { id: input.teamId, ownerClerkId: userId } });
        if (!team) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found or not owned by user" });
        }
        const players = await this.playerRepo.find({ where: { teamId: input.teamId }, order: { number: "ASC" } });
        return players.map((p) => ({
          id: p.id,
          name: p.name,
          number: p.number,
          role: p.role ? String(p.role) : null,
          teamId: p.teamId,
        }));
      }),
  });
}
