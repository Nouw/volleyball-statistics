import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CommandHandler, EventBus, ICommandHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MatchAction, Set, SetStartingRotation } from "@repo/db";
import { DeleteStartingRotationCommand } from "./delete-starting-rotation.command.js";
import { StartingRotationDeletedEvent } from "../events/starting-rotation-deleted.event.js";

@CommandHandler(DeleteStartingRotationCommand)
export class DeleteStartingRotationHandler implements ICommandHandler<DeleteStartingRotationCommand> {
  constructor(
    @InjectRepository(SetStartingRotation)
    private readonly rotationRepo: Repository<SetStartingRotation>,
    @InjectRepository(Set) private readonly setRepo: Repository<Set>,
    @InjectRepository(MatchAction) private readonly actionRepo: Repository<MatchAction>,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: DeleteStartingRotationCommand) {
    const set = await this.setRepo.findOne({ where: { id: command.setId }, relations: ["match"] });
    if (!set) {
      throw new NotFoundException("Set not found");
    }

    if (set.match && command.teamId !== set.match.teamAId && command.teamId !== set.match.teamBId) {
      throw new BadRequestException("Team is not part of this match");
    }

    const rotation = await this.rotationRepo.findOne({
      where: { set: { id: command.setId }, team: { id: command.teamId } },
    });

    if (!rotation) {
      throw new NotFoundException("Starting rotation not found");
    }

    const actionsCount = await this.actionRepo.count({ where: { set: { id: command.setId } } });
    if (actionsCount > 0) {
      throw new BadRequestException("Cannot delete starting rotation after actions have been recorded");
    }

    await this.rotationRepo.delete({ id: rotation.id });

    await this.eventBus.publish(new StartingRotationDeletedEvent(command.setId, command.teamId));

    return { success: true } as const;
  }
}
