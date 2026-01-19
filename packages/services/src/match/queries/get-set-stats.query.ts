export class GetSetStatsQuery {
  constructor(public readonly matchId: string, public readonly teamId: string, public readonly setId: string) {
  }
}
