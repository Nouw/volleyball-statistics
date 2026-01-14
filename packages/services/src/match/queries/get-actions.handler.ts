import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GetActionsQuery } from "./get-actions.query.js";
import { MatchAction } from "@repo/db";

@QueryHandler(GetActionsQuery)
export class GetActionsHandler implements IQueryHandler<GetActionsQuery> {
  constructor(@InjectRepository(MatchAction) private readonly actionRepo: Repository<MatchAction>) {}

  async execute(query: GetActionsQuery) {
    const actions = await this.actionRepo.find({
      where: { set: { id: query.setId }, match: { id: query.matchId } },
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
  }
}
