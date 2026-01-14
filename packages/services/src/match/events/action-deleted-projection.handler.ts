import { EventsHandler, IEventHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ActionDeletedEvent } from "./action-deleted.event.js";
import { MatchAction, PlayerMatchStats, StatsActionBreakdown, StatsByType } from "@repo/db";

@EventsHandler(ActionDeletedEvent)
export class ActionDeletedProjectionHandler implements IEventHandler<ActionDeletedEvent> {
  constructor(
    @InjectRepository(PlayerMatchStats)
    private readonly statsRepo: Repository<PlayerMatchStats>,
    @InjectRepository(MatchAction)
    private readonly actionRepo: Repository<MatchAction>,
  ) {}

  async handle(event: ActionDeletedEvent) {
    const actions = await this.actionRepo.find({
      where: { match: { id: event.matchId }, player: { id: event.playerId } },
      order: { sequence: "ASC" },
    });

    const stats =
      (await this.statsRepo.findOne({ where: { match: { id: event.matchId }, player: { id: event.playerId } } })) ??
      this.statsRepo.create({
        match: { id: event.matchId } as any,
        player: { id: event.playerId } as any,
        actions: 0,
        scoringActions: 0,
        penalties: 0,
        byType: {},
      });

    stats.actions = 0;
    stats.scoringActions = 0;
    stats.penalties = 0;
    stats.byType = {};

    for (const action of actions) {
      stats.actions += 1;
      if (action.pointDelta > 0) {
        stats.scoringActions += 1;
      }
      if (action.pointDelta < 0) {
        stats.penalties += 1;
      }

      const byType: StatsByType = stats.byType || {};
      const breakdown: StatsActionBreakdown = byType[action.actionType] || {
        attempts: 0,
        successes: 0,
        penalties: 0,
      };

      breakdown.attempts += 1;
      if (action.pointDelta > 0) {
        breakdown.successes += 1;
      }
      if (action.pointDelta < 0) {
        breakdown.penalties += 1;
      }
      breakdown.lastOutcome = action.outcome;

      byType[action.actionType] = breakdown;
      stats.byType = byType;
    }

    await this.statsRepo.save(stats);
  }
}
