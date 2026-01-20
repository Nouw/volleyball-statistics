import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Set as MatchSet, Team, MatchAction } from "@repo/db";
import { SetInitialServerCommand } from "./set-initial-server.command.js";

@CommandHandler(SetInitialServerCommand)
export class SetInitialServerHandler implements ICommandHandler<SetInitialServerCommand> {
  constructor(
    @InjectRepository(MatchSet) private readonly setRepo: Repository<MatchSet>,
    @InjectRepository(Team) private readonly teamRepo: Repository<Team>,
    @InjectRepository(MatchAction) private readonly actionRepo: Repository<MatchAction>,
  ) {}

  async execute(command: SetInitialServerCommand) {
    const set = await this.setRepo.findOne({ where: { id: command.setId }, relations: ["match"] });
    if (!set) throw new NotFoundException("Set not found");

    const team = await this.teamRepo.findOne({ where: { id: command.teamId } });
    if (!team) throw new NotFoundException("Team not found");

    const isTeamInMatch = command.teamId === set.match.teamAId || command.teamId === set.match.teamBId;
    if (!isTeamInMatch) throw new BadRequestException("Team not part of this match");

    if (set.pointsA > 0 || set.pointsB > 0) {
      throw new BadRequestException("Cannot set initial server after points have been scored");
    }

    const actions = await this.actionRepo.count({ where: { set: { id: set.id } } });
    if (actions > 0) {
      throw new BadRequestException("Cannot set initial server after rallies have been recorded");
    }

    set.initialServingTeam = { id: command.teamId } as Team;
    return this.setRepo.save(set);
  }
}
