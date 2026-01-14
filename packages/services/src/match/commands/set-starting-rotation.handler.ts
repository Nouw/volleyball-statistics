import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CommandHandler, EventBus, ICommandHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { SetStartingRotation, Set as MatchSet, Team, Player } from "@repo/db";
import { SetStartingRotationCommand } from "./set-starting-rotation.command.js";
import { StartingRotationSetEvent } from "../events/starting-rotation-set.event.js";

@CommandHandler(SetStartingRotationCommand)
export class SetStartingRotationHandler implements ICommandHandler<SetStartingRotationCommand> {
  constructor(
    @InjectRepository(SetStartingRotation)
    private readonly rotationRepo: Repository<SetStartingRotation>,
    @InjectRepository(MatchSet) private readonly setRepo: Repository<MatchSet>,
    @InjectRepository(Team) private readonly teamRepo: Repository<Team>,
    @InjectRepository(Player) private readonly playerRepo: Repository<Player>,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: SetStartingRotationCommand) {
    const set = await this.setRepo.findOne({ where: { id: command.setId }, relations: ["match"] });
    if (!set) throw new NotFoundException("Set not found");

    const team = await this.teamRepo.findOne({ where: { id: command.teamId } });
    if (!team) throw new NotFoundException("Team not found");

    if (await this.rotationRepo.findOne({ where: { set: { id: command.setId }, team: { id: command.teamId } } })) {
      throw new BadRequestException("Rotation already set for this set and team");
    }

    const posIds = command.positions;
    const allIds = [...posIds, command.liberoId];
    const uniqueIds = new Set(allIds);
    if (uniqueIds.size !== allIds.length) {
      throw new BadRequestException("Positions and libero must be distinct players");
    }

    const players = await this.playerRepo.findBy({ id: In(allIds as string[]) });
    if (players.length !== allIds.length) throw new BadRequestException("Some players not found");
    players.forEach((p) => {
      if (p.teamId !== command.teamId) {
        throw new BadRequestException("All players must belong to the team");
      }
    });

    // Server is position1, cannot be libero
    if (command.positions[0] === command.liberoId) {
      throw new BadRequestException("Libero cannot be the server (position 1)");
    }

    const rotation = this.rotationRepo.create({
      set: { id: command.setId } as MatchSet,
      team: { id: command.teamId } as Team,
      position1: { id: posIds[0] } as Player,
      position2: { id: posIds[1] } as Player,
      position3: { id: posIds[2] } as Player,
      position4: { id: posIds[3] } as Player,
      position5: { id: posIds[4] } as Player,
      position6: { id: posIds[5] } as Player,
      libero: { id: command.liberoId } as Player,
    });

    const saved = await this.rotationRepo.save(rotation);

    await this.eventBus.publish(
      new StartingRotationSetEvent(command.setId, command.teamId, command.positions, command.liberoId),
    );

    return saved;
  }
}
