import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GetStartingRotationQuery } from "./get-starting-rotation.query.js";
import { SetStartingRotation } from "@repo/db";
import { TRPCError } from "@trpc/server";

@QueryHandler(GetStartingRotationQuery)
export class GetStartingRotationHandler implements IQueryHandler<GetStartingRotationQuery> {
  constructor(
    @InjectRepository(SetStartingRotation)
    private readonly rotationRepo: Repository<SetStartingRotation>,
  ) {}

  async execute(query: GetStartingRotationQuery) {
    const rotation = await this.rotationRepo.findOne({
      where: { set: { id: query.setId }, team: { id: query.teamId } },
      relations: ["position1", "position2", "position3", "position4", "position5", "position6", "libero"],
    });
    if (!rotation) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Starting rotation not found" });
    }
    return {
      setId: rotation.setId,
      teamId: rotation.teamId,
      positions: [
        rotation.position1Id,
        rotation.position2Id,
        rotation.position3Id,
        rotation.position4Id,
        rotation.position5Id,
        rotation.position6Id,
      ],
      liberoId: rotation.liberoId,
    };
  }
}
