import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TRPCError } from "@trpc/server";
import { GetSetsQuery } from "./get-sets.query.js";
import { Set } from "@repo/db";

@QueryHandler(GetSetsQuery)
export class GetSetsHandler implements IQueryHandler<GetSetsQuery> {
  constructor(@InjectRepository(Set) private readonly setRepo: Repository<Set>) {}

  async execute(query: GetSetsQuery) {
    const sets = await this.setRepo.find({ where: { match: { id: query.matchId } }, order: { createdAt: "ASC" } });
    if (!sets.length) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Match or sets not found" });
    }
    return sets.map((s) => ({
      id: s.id,
      pointsA: s.pointsA,
      pointsB: s.pointsB,
      matchId: query.matchId,
      order: s.key,
    }));
  }
}
