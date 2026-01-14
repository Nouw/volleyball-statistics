import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TRPCError } from "@trpc/server";
import { GetMatchTotalsByPlayerQuery } from "./get-match-totals-by-player.query.js";
import { Match, MatchAction } from "@repo/db";
import { MatchAction as MatchActionEnum } from "@repo/constants";

@QueryHandler(GetMatchTotalsByPlayerQuery)
export class GetMatchTotalsByPlayerHandler implements IQueryHandler<GetMatchTotalsByPlayerQuery> {
  constructor(
    @InjectRepository(Match) private readonly matchRepo: Repository<Match>,
    @InjectRepository(MatchAction) private readonly actionRepo: Repository<MatchAction>,
  ) {}

  async execute(query: GetMatchTotalsByPlayerQuery) {
    const match = await this.matchRepo.findOne({ where: { id: query.matchId }, relations: ["teamA", "teamB"] });
    if (!match) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Match not found" });
    }

    const actions = await this.actionRepo.find({ where: { match: { id: query.matchId } }, order: { sequence: "ASC" } });

    type CategoryTotals = { attempts: number; scored: number; errors: number; successPct?: number; errorPct?: number };
    type ByTypeTotals = { attempts: number; scored: number; errors: number };

    const initCategory = (): CategoryTotals => ({ attempts: 0, scored: 0, errors: 0 });
    const initPlayerTotals = (playerId: string, teamId: string) => ({
      playerId,
      teamId,
      categories: {
        attacks: initCategory(),
        serves: initCategory(),
        blocks: initCategory(),
        reception: initCategory(),
      },
      byType: {} as Record<string, ByTypeTotals>,
    });

    const totals = new Map<string, ReturnType<typeof initPlayerTotals>>();

    const sets = {
      attacks: new globalThis.Set<MatchActionEnum>([
        MatchActionEnum.EarnedSpike,
        MatchActionEnum.EarnedTip,
        MatchActionEnum.EarnedDump,
        MatchActionEnum.EarnedDownBallHit,
        MatchActionEnum.ErrorSpike,
        MatchActionEnum.ErrorTip,
        MatchActionEnum.ErrorDump,
        MatchActionEnum.ErrorDownBallHit,
        MatchActionEnum.InRallyHitStillInPlay,
      ]),
      serves: new globalThis.Set<MatchActionEnum>([
        MatchActionEnum.EarnedAce,
        MatchActionEnum.ErrorServe,
        MatchActionEnum.InRallyOneServe,
        MatchActionEnum.InRallyTwoServe,
        MatchActionEnum.InRallyThreeServe,
      ]),
      blocks: new globalThis.Set<MatchActionEnum>([
        MatchActionEnum.EarnedBlock,
        MatchActionEnum.ErrorBlock,
        MatchActionEnum.InRallyBlockStillInPlay,
      ]),
      reception: new globalThis.Set<MatchActionEnum>([
        MatchActionEnum.ErrorReceive,
        MatchActionEnum.ErrorDig,
        MatchActionEnum.ErrorFreeBallReceive,
        MatchActionEnum.ErrorWhoseBall,
      ]),
    } as const;

    const addByType = (playerTotals: ReturnType<typeof initPlayerTotals>, actionType: MatchActionEnum, pointDelta: number) => {
      const current = playerTotals.byType[actionType] ?? { attempts: 0, scored: 0, errors: 0 };
      current.attempts += 1;
      if (pointDelta > 0) current.scored += 1;
      if (pointDelta < 0) current.errors += 1;
      playerTotals.byType[actionType] = current;
    };

    const applyCategory = (
      playerTotals: ReturnType<typeof initPlayerTotals>,
      category: keyof typeof sets,
      pointDelta: number,
    ) => {
      const cat = playerTotals.categories[category];
      cat.attempts += 1;
      if (pointDelta > 0) cat.scored += 1;
      if (pointDelta < 0) cat.errors += 1;
    };

    for (const action of actions) {
      const { actionType, pointDelta, playerId, teamId } = action;
      if (!playerId) continue;
      const playerTotals = totals.get(playerId) ?? initPlayerTotals(playerId, teamId);

      if (sets.attacks.has(actionType)) applyCategory(playerTotals, "attacks", pointDelta);
      if (sets.serves.has(actionType)) applyCategory(playerTotals, "serves", pointDelta);
      if (sets.blocks.has(actionType)) applyCategory(playerTotals, "blocks", pointDelta);
      if (sets.reception.has(actionType)) applyCategory(playerTotals, "reception", pointDelta);

      addByType(playerTotals, actionType, pointDelta);

      totals.set(playerId, playerTotals);
    }

    const finalize = (cat: CategoryTotals): CategoryTotals => {
      const attempts = cat.attempts || 0;
      return {
        ...cat,
        successPct: attempts ? Number((cat.scored / attempts).toFixed(2)) : 0,
        errorPct: attempts ? Number((cat.errors / attempts).toFixed(2)) : 0,
      };
    };

    return {
      matchId: query.matchId,
      players: Array.from(totals.values()).map((p) => ({
        playerId: p.playerId,
        teamId: p.teamId,
        categories: {
          attacks: finalize(p.categories.attacks),
          serves: finalize(p.categories.serves),
          blocks: finalize(p.categories.blocks),
          reception: finalize(p.categories.reception),
        },
        byType: p.byType,
      })),
    } as const;
  }
}
