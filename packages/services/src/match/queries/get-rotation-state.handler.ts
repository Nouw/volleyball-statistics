import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GetRotationStateQuery } from "./get-rotation-state.query.js";
import { MatchAction, Set, SetStartingRotation } from "@repo/db";
import { TRPCError } from "@trpc/server";

interface RotationState {
  teamId: string;
  positions: string[];
  serverPosition: number;
  liberoId: string;
}

@QueryHandler(GetRotationStateQuery)
export class GetRotationStateHandler implements IQueryHandler<GetRotationStateQuery> {
  constructor(
    @InjectRepository(Set) private readonly setRepo: Repository<Set>,
    @InjectRepository(SetStartingRotation) private readonly rotationRepo: Repository<SetStartingRotation>,
    @InjectRepository(MatchAction) private readonly actionRepo: Repository<MatchAction>,
  ) {}

  async execute(query: GetRotationStateQuery): Promise<{ teamA: RotationState; teamB: RotationState; initialServerTeamId: string; currentServerTeamId: string }> {
    const set = await this.setRepo.findOne({ where: { id: query.setId }, relations: ["match"] });
    if (!set) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Set not found" });
    }

    const [rotA, rotB] = await Promise.all([
      this.rotationRepo.findOne({ where: { set: { id: set.id }, team: { id: set.match.teamAId } } }),
      this.rotationRepo.findOne({ where: { set: { id: set.id }, team: { id: set.match.teamBId } } }),
    ]);

    if (!rotA && !rotB) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Starting rotation missing" });
    }

    const baseStateA: RotationState = rotA
      ? {
          teamId: rotA.teamId,
          positions: [
            rotA.position1Id,
            rotA.position2Id,
            rotA.position3Id,
            rotA.position4Id,
            rotA.position5Id,
            rotA.position6Id,
          ],
          serverPosition: 1,
          liberoId: rotA.liberoId,
        }
      : {
          teamId: set.match.teamAId,
          positions: ["", "", "", "", "", ""],
          serverPosition: 1,
          liberoId: "",
        };

    const baseStateB: RotationState = rotB
      ? {
          teamId: rotB.teamId,
          positions: [
            rotB.position1Id,
            rotB.position2Id,
            rotB.position3Id,
            rotB.position4Id,
            rotB.position5Id,
            rotB.position6Id,
          ],
          serverPosition: 1,
          liberoId: rotB.liberoId,
        }
      : {
          teamId: set.match.teamBId,
          positions: ["", "", "", "", "", ""],
          serverPosition: 1,
          liberoId: "",
        };

    const actions = await this.actionRepo.find({ where: { set: { id: set.id } }, order: { sequence: "ASC" } });

    const initialServerTeamId = set.initialServingTeamId ?? set.match.teamAId;
    let servingTeamId = initialServerTeamId;

    const rotate = (state: RotationState) => {
      const first = state.positions[0];
      for (let i = 0; i < state.positions.length - 1; i += 1) {
        state.positions[i] = state.positions[i + 1];
      }
      state.positions[state.positions.length - 1] = first;
    };

    for (const action of actions) {
      if (action.pointDelta === 0) continue;

      const scoringTeamId = action.pointDelta > 0
        ? action.teamId
        : action.teamId === set.match.teamAId
          ? set.match.teamBId
          : set.match.teamAId;

      const receivingTeamId = servingTeamId === set.match.teamAId ? set.match.teamBId : set.match.teamAId;

      // Side-out: receiving team scores, they rotate and take serve
      if (scoringTeamId === receivingTeamId) {
        if (scoringTeamId === set.match.teamAId) {
          rotate(baseStateA);
        } else {
          rotate(baseStateB);
        }
        servingTeamId = scoringTeamId;
      }
      // If serving team scores, no rotation; server stays
    }

    return {
      teamA: baseStateA,
      teamB: baseStateB,
      initialServerTeamId,
      currentServerTeamId: servingTeamId,
    };
  }
}
