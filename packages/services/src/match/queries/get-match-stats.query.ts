export class GetMatchStatsQuery {
  constructor(public readonly matchId: string, public readonly teamId: string) {
  }
}
