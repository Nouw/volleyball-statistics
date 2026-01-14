import { MatchAction } from "@repo/constants";

export class ActionRecordedEvent {
  constructor(
    public readonly actionId: string,
    public readonly matchId: string,
    public readonly setId: string,
    public readonly teamId: string,
    public readonly playerId: string,
    public readonly actionType: MatchAction,
    public readonly outcome: string,
    public readonly pointDelta: number,
    public readonly sequence: number,
    public readonly rally: number,
    public readonly occurredAt: Date,
    public readonly score: { pointsA: number; pointsB: number },
    public readonly metadata?: Record<string, unknown> | null,
  ) {}
}
