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

  async execute(query: GetRotationStateQuery): Promise<{ teamA: RotationState; teamB: RotationState }> {
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

    let servingTeam: "A" | "B" = "A"; // assume team A starts serving (position1). Adjust if you add explicit starter.

    const rotate = (state: RotationState) => {
      const last = state.positions[state.positions.length - 1];
      for (let i = state.positions.length - 1; i > 0; i -= 1) {
        state.positions[i] = state.positions[i - 1];
      }
      state.positions[0] = last;
    };

    for (const action of actions) {
      const isActingA = action.teamId === set.match.teamAId;
      const scoringTeam = action.pointDelta > 0 ? action.teamId : action.teamId === set.match.teamAId ? set.match.teamBId : set.match.teamAId;
      const scoringIsA = scoringTeam === set.match.teamAId;

      // Determine receiving team before the rally
      const receivingIsA = servingTeam === "B";

      if (action.pointDelta !== 0) {
        // If receiving team won, they rotate and become serving team
        if (scoringIsA === receivingIsA) {
          if (scoringIsA) {
            rotate(baseStateA);
            servingTeam = "A";
          } else {
            rotate(baseStateB);
            servingTeam = "B";
          }
        }
      }
    }

    return { teamA: baseStateA, teamB: baseStateB };
  }
}
