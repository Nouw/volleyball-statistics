import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TRPCError } from "@trpc/server";
import { ListMatchesByTeamQuery } from "./list-matches-by-team.query.js";
import { Match, Team } from "@repo/db";

@QueryHandler(ListMatchesByTeamQuery)
export class ListMatchesByTeamHandler implements IQueryHandler<ListMatchesByTeamQuery> {
  constructor(
    @InjectRepository(Match) private readonly matchRepo: Repository<Match>,
    @InjectRepository(Team) private readonly teamRepo: Repository<Team>,
  ) {}

  async execute(query: ListMatchesByTeamQuery) {
    const team = await this.teamRepo.findOne({ where: { id: query.teamId, ownerClerkId: query.ownerId } });
    if (!team) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Team not found or not owned by user" });
    }

    const matches = await this.matchRepo.find({
      where: [{ teamA: { id: query.teamId } }, { teamB: { id: query.teamId } }],
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
  }
}
