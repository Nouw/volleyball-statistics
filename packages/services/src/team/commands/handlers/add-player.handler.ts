import { CommandHandler, EventBus, ICommandHandler } from "@nestjs/cqrs";
import { AddPlayerCommand } from "../impl/add-player.command.js";
import { InjectRepository } from "@nestjs/typeorm";
import { Player, Team } from "@repo/db";
import { Repository } from "typeorm";
import { NotFoundException } from "@nestjs/common";
import { PlayerAddedEvent } from "../../events/player-added.event.js";

@CommandHandler(AddPlayerCommand)
export class AddPlayerHandler implements ICommandHandler<AddPlayerCommand> {
  constructor(
    @InjectRepository(Player) private readonly playerRepository: Repository<Player>,
    @InjectRepository(Team) private readonly teamRepository: Repository<Team>,
    private readonly eventBus: EventBus,
  ) {
  }

  async execute(command: AddPlayerCommand) {
    const team = await this.teamRepository.findOneBy({ id: command.teamId });

    if (!team) {
      throw new NotFoundException("Team not found");
    }

    let player = this.playerRepository.create({
      name: command.name,
      number: command.number,
      team: team,
    });

    player = await this.playerRepository.save(player);
    await this.eventBus.publish(new PlayerAddedEvent(player.id))

    return player;
  }
}
