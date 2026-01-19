import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { GetMatchStatsQuery } from "./get-match-stats.query.js";
import { InjectRepository } from "@nestjs/typeorm";
import { MatchAction, Team } from "@repo/db";
import { Repository } from "typeorm";
import { NotFoundException } from "@nestjs/common";
import { buildTeamPlayerStats, PlayerStats } from "../stats/player-stats.js";

@QueryHandler(GetMatchStatsQuery)
export class GetMatchStatsHandler implements IQueryHandler<GetMatchStatsQuery> {
  constructor(
    @InjectRepository(MatchAction) private readonly actionRepository: Repository<MatchAction>,
    @InjectRepository(Team) private readonly teamRepository: Repository<Team>
  ) {}

  async execute({ matchId, teamId }: GetMatchStatsQuery): Promise<PlayerStats[]> {
    const team = await this.teamRepository.findOne({ where: { id: teamId }, relations: { players: true } });

    if (!team) {
      throw new NotFoundException("Team not found!")
    }

    return buildTeamPlayerStats(this.actionRepository, team.players ?? [], matchId);
  }
}

