export class RecordActionCommand {
  constructor(
    public readonly matchId: string,
    public readonly setId: string,
    public readonly teamId: string,
    public readonly playerId: string,
    public readonly actionType: string,
    public readonly outcome: string,
    public readonly pointDelta: number,
    public readonly occurredAt: Date = new Date(),
    public readonly metadata?: Record<string, unknown> | null,
  ) {}
}
