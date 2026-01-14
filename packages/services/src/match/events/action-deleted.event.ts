export class ActionDeletedEvent {
  constructor(
    public readonly actionId: string,
    public readonly matchId: string,
    public readonly setId: string,
    public readonly teamId: string,
    public readonly playerId: string,
    public readonly score: { pointsA: number; pointsB: number },
  ) {}
}
