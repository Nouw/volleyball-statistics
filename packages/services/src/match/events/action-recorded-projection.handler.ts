import { EventsHandler, IEventHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ActionRecordedEvent } from "./action-recorded.event.js";
import { PlayerMatchStats, StatsActionBreakdown, StatsByType } from "@repo/db";

@EventsHandler(ActionRecordedEvent)
export class ActionRecordedProjectionHandler implements IEventHandler<ActionRecordedEvent> {
  constructor(
    @InjectRepository(PlayerMatchStats)
    private readonly statsRepo: Repository<PlayerMatchStats>,
  ) {}

  async handle(event: ActionRecordedEvent) {
    const existing = await this.statsRepo.findOne({
      where: { matchId: event.matchId, playerId: event.playerId },
    });

    const stats =
      existing ??
      this.statsRepo.create({
        match: { id: event.matchId } as any,
        player: { id: event.playerId } as any,
        actions: 0,
        scoringActions: 0,
        penalties: 0,
        byType: {},
      });

    stats.actions += 1;
    if (event.pointDelta > 0) {
      stats.scoringActions += 1;
    }
    if (event.pointDelta < 0) {
      stats.penalties += 1;
    }

    const byType: StatsByType = stats.byType || {};
    const breakdown: StatsActionBreakdown = byType[event.actionType] || {
      attempts: 0,
      successes: 0,
      penalties: 0,
    };

    breakdown.attempts += 1;
    if (event.pointDelta > 0) {
      breakdown.successes += 1;
    }
    if (event.pointDelta < 0) {
      breakdown.penalties += 1;
    }
    breakdown.lastOutcome = event.outcome;

    byType[event.actionType] = breakdown;
    stats.byType = byType;

    await this.statsRepo.save(stats);
  }
}
