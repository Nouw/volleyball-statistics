import { NotFoundException } from "@nestjs/common";
import { CommandHandler, EventBus, ICommandHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Match, MatchAction, Set } from "@repo/db";
import { DeleteActionCommand } from "./delete-action.command.js";
import { ActionDeletedEvent } from "../events/action-deleted.event.js";

@CommandHandler(DeleteActionCommand)
export class DeleteActionHandler implements ICommandHandler<DeleteActionCommand> {
  constructor(
    @InjectRepository(MatchAction) private readonly actions: Repository<MatchAction>,
    @InjectRepository(Set) private readonly sets: Repository<Set>,
    @InjectRepository(Match) private readonly matches: Repository<Match>,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: DeleteActionCommand) {
    const result = await this.actions.manager.transaction(async (manager) => {
      const actionRepo = manager.getRepository(MatchAction);
      const setRepo = manager.getRepository(Set);
      const matchRepo = manager.getRepository(Match);

      const target = await actionRepo.findOne({
        where: { id: command.actionId },
        relations: ["set", "set.match", "match"],
      });

      if (!target) {
        throw new NotFoundException("Action not found");
      }

      const match = target.match ?? target.set?.match ?? (await matchRepo.findOne({ where: { id: target.matchId } }));
      const set = target.set ?? (await setRepo.findOne({ where: { id: target.setId }, relations: ["match"] }));

      if (!match || !set) {
        throw new NotFoundException("Related match or set not found");
      }

      if (set.match && set.match.id !== match.id) {
        throw new NotFoundException("Set does not belong to match");
      }

      const actionsForSet = await actionRepo.find({
        where: { set: { id: set.id } },
        order: { sequence: "ASC" },
      });

      const remaining = actionsForSet.filter((a) => a.id !== command.actionId);
      if (remaining.length === actionsForSet.length) {
        throw new NotFoundException("Action not found in set");
      }

      await actionRepo.delete({ id: command.actionId });

      let pointsA = 0;
      let pointsB = 0;
      let lastRally = 0;
      const updated: MatchAction[] = [];

      for (const [idx, action] of remaining.entries()) {
        const rally = action.pointDelta !== 0 ? lastRally + 1 : lastRally || 1;
        lastRally = rally;

        if (action.pointDelta !== 0) {
          if (action.pointDelta > 0) {
            if (action.teamId === match.teamAId) {
              pointsA += action.pointDelta;
            } else {
              pointsB += action.pointDelta;
            }
          } else {
            const award = Math.abs(action.pointDelta);
            if (action.teamId === match.teamAId) {
              pointsB += award;
            } else {
              pointsA += award;
            }
          }
        }

        action.sequence = idx + 1;
        action.rally = rally;
        updated.push(action);
      }

      set.pointsA = pointsA;
      set.pointsB = pointsB;

      if (updated.length) {
        await actionRepo.save(updated);
      }
      await setRepo.save(set);

      return { match, set, score: { pointsA, pointsB }, target } as const;
    });

    await this.eventBus.publish(
      new ActionDeletedEvent(
        result.target.id,
        result.match.id,
        result.set.id,
        result.target.teamId,
        result.target.playerId,
        result.score,
      ),
    );

    return result.score;
  }
}
