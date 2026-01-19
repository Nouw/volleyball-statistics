import { attackError, attackScore, MatchAction as MatchActionEnum } from "@repo/constants";
import type { MatchAction } from "@repo/db";
import type { Repository } from "typeorm";

export interface PlayerStats {
  id: string;
  name: string;
  number: number;
  total: number;
  scored: number;
  errors: number;
  attack: {
    total: number;
    scored: number;
    errors: number;
  };
  block: {
    total: number;
    scored: number;
    errors: number;
  };
  receive: {
    total: number;
    errors: number;
    oneReceive: number;
    twoReceive: number;
    threeReceive: number;
  };
}

export type PlayerIdentity = {
  id: string;
  name: string;
  number: number;
};

type ActionFilters = {
  playerId: string;
  matchId: string;
  setId?: string;
};

export const createEmptyPlayerStats = (player: PlayerIdentity): PlayerStats => ({
  id: player.id,
  name: player.name,
  number: player.number,
  total: 0,
  scored: 0,
  errors: 0,
  attack: {
    total: 0,
    scored: 0,
    errors: 0,
  },
  block: {
    total: 0,
    scored: 0,
    errors: 0,
  },
  receive: {
    total: 0,
    errors: 0,
    oneReceive: 0,
    twoReceive: 0,
    threeReceive: 0,
  },
});

const applyPointDelta = (stats: PlayerStats, pointDelta: number) => {
  if (pointDelta > 0) {
    stats.scored += 1;
    stats.total += 1;
  } else if (pointDelta < 0) {
    stats.errors += 1;
    stats.total += 1;
  } else {
    stats.total += 1;
  }
};

const applyAttack = (stats: PlayerStats, actionType: MatchActionEnum) => {
  if (attackScore.includes(actionType)) {
    stats.attack.scored += 1;
    stats.attack.total += 1;
  } else if (attackError.includes(actionType)) {
    stats.attack.errors += 1;
  } else if (actionType === MatchActionEnum.InRallyHitStillInPlay) {
    stats.attack.total += 1;
  }
};

const applyBlock = (stats: PlayerStats, actionType: MatchActionEnum) => {
  if (actionType === MatchActionEnum.EarnedBlock) {
    stats.block.scored += 1;
    stats.block.total += 1;
  } else if (actionType === MatchActionEnum.ErrorBlock) {
    stats.block.errors += 1;
    stats.block.total += 1;
  } else if (actionType === MatchActionEnum.InRallyBlockStillInPlay) {
    stats.block.total += 1;
  }
};

const applyReceive = (stats: PlayerStats, actionType: MatchActionEnum) => {
  if (actionType === MatchActionEnum.OneReceive) {
    stats.receive.oneReceive += 1;
    stats.receive.total += 1;
  } else if (actionType === MatchActionEnum.TwoReceive) {
    stats.receive.twoReceive += 1;
    stats.receive.total += 1;
  } else if (actionType === MatchActionEnum.ThreeReceive) {
    stats.receive.threeReceive += 1;
    stats.receive.total += 1;
  } else if (actionType === MatchActionEnum.OverpassReceive) {
    stats.receive.total += 1;
    stats.receive.errors += 1;
  } else if (actionType === MatchActionEnum.ErrorReceive || actionType === MatchActionEnum.ErrorWhoseBall) {
    stats.receive.errors += 1;
    stats.receive.total += 1;
  }
};

export const applyActionToStats = (
  stats: PlayerStats,
  action: Pick<MatchAction, "pointDelta" | "actionType">,
) => {
  const { pointDelta, actionType } = action;
  applyPointDelta(stats, pointDelta);
  applyAttack(stats, actionType as MatchActionEnum);
  applyBlock(stats, actionType as MatchActionEnum);
  applyReceive(stats, actionType as MatchActionEnum);
};

export const fetchActionsForPlayer = (
  actionRepository: Repository<MatchAction>,
  { playerId, matchId, setId }: ActionFilters,
) => {
  const where: Record<string, unknown> = {
    player: { id: playerId },
    match: { id: matchId },
  };

  if (setId) {
    where.set = { id: setId };
  }

  return actionRepository.find({ where });
};

export const buildTeamPlayerStats = async (
  actionRepository: Repository<MatchAction>,
  players: PlayerIdentity[],
  matchId: string,
  setId?: string,
): Promise<PlayerStats[]> => {
  return Promise.all(
    players.map(async (player) => {
      const stats = createEmptyPlayerStats(player);
      const actions = await fetchActionsForPlayer(actionRepository, { playerId: player.id, matchId, setId });

      for (const action of actions) {
        applyActionToStats(stats, action);
      }

      return stats;
    }),
  );
};
