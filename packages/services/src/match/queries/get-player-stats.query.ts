export class GetPlayerStatsQuery {
  constructor(public readonly matchId: string, public readonly playerId: string) {}
}
