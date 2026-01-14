import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TRPCError } from "@trpc/server";
import { GetPlayerStatsQuery } from "./get-player-stats.query.js";
import { PlayerMatchStats } from "@repo/db";

@QueryHandler(GetPlayerStatsQuery)
export class GetPlayerStatsHandler implements IQueryHandler<GetPlayerStatsQuery> {
  constructor(@InjectRepository(PlayerMatchStats) private readonly statsRepo: Repository<PlayerMatchStats>) {}

  async execute(query: GetPlayerStatsQuery) {
    const stats = await this.statsRepo.findOne({ where: { match: { id: query.matchId }, player: { id: query.playerId } } });
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
  }
}
