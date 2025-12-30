import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CommandHandler, EventBus, ICommandHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Match, MatchAction, Player, Set, Team } from "@repo/db";
import { RecordActionCommand } from "./record-action.command.js";
import { ActionRecordedEvent } from "../events/action-recorded.event.js";

@CommandHandler(RecordActionCommand)
export class RecordActionHandler implements ICommandHandler<RecordActionCommand> {
  constructor(
    @InjectRepository(Match) private readonly matches: Repository<Match>,
    @InjectRepository(Set) private readonly sets: Repository<Set>,
    @InjectRepository(Player) private readonly players: Repository<Player>,
    @InjectRepository(MatchAction) private readonly actions: Repository<MatchAction>,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RecordActionCommand) {
    const match = await this.matches.findOne({ where: { id: command.matchId } });
    if (!match) {
      throw new NotFoundException("Match not found");
    }

    const set = await this.sets.findOne({ where: { id: command.setId }, relations: ["match"] });
    if (!set || set.match.id !== match.id) {
      throw new NotFoundException("Set not found for match");
    }

    if (command.teamId !== match.teamAId && command.teamId !== match.teamBId) {
      throw new BadRequestException("Team is not part of this match");
    }

    const player = await this.players.findOne({ where: { id: command.playerId, teamId: command.teamId } });
    if (!player) {
      throw new BadRequestException("Player does not belong to the team");
    }

    const lastAction = await this.actions.findOne({
      where: { setId: command.setId },
      order: { sequence: "DESC" },
    });

    const nextSequence = (lastAction?.sequence ?? 0) + 1;
    const rally = command.pointDelta !== 0 ? (lastAction?.rally ?? 0) + 1 : (lastAction?.rally ?? 1);

    let pointsA = set.pointsA ?? 0;
    let pointsB = set.pointsB ?? 0;

    if (command.pointDelta !== 0) {
      if (command.pointDelta > 0) {
        if (command.teamId === match.teamAId) {
          pointsA += command.pointDelta;
        } else {
          pointsB += command.pointDelta;
        }
      } else {
        const award = Math.abs(command.pointDelta);
        if (command.teamId === match.teamAId) {
          pointsB += award;
        } else {
          pointsA += award;
        }
      }
    }

    set.pointsA = pointsA;
    set.pointsB = pointsB;

    const action = this.actions.create({
      match,
      set,
      team: { id: command.teamId } as Team,
      player,
      actionType: command.actionType,
      outcome: command.outcome,
      pointDelta: command.pointDelta,
      sequence: nextSequence,
      rally,
      occurredAt: command.occurredAt ?? new Date(),
      metadata: command.metadata ?? null,
    });

    await this.actions.save(action);
    await this.sets.save(set);

    await this.eventBus.publish(
      new ActionRecordedEvent(
        action.id,
        command.matchId,
        command.setId,
        command.teamId,
        command.playerId,
        command.actionType,
        command.outcome,
        command.pointDelta,
        action.sequence,
        action.rally,
        action.occurredAt,
        { pointsA: set.pointsA, pointsB: set.pointsB },
        command.metadata ?? null,
      ),
    );

    return action;
  }
}
