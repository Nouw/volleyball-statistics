export class StartingRotationDeletedEvent {
  constructor(public readonly setId: string, public readonly teamId: string) {}
}
