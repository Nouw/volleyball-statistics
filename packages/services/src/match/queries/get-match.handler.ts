import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { GetMatchQuery } from "./get-match.query.js";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Match } from "@repo/db";
import { NotFoundException } from "@nestjs/common";

@QueryHandler(GetMatchQuery)
export class GetMatchHandler implements IQueryHandler<GetMatchQuery> {
  constructor(@InjectRepository(Match) private readonly matchRepository: Repository<Match>) {
  }

  async execute(query: GetMatchQuery) {
    const match = await this.matchRepository.findOne({ where: { id: query.matchId }, relations: ["teamA", "teamB"]})

    if (!match) {
      throw new NotFoundException("Match not found")
    }

    return match;
  }
}
