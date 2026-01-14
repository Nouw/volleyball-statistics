export class SetStartingRotationCommand {
  constructor(
    public readonly setId: string,
    public readonly teamId: string,
    public readonly positions: [string, string, string, string, string, string],
    public readonly liberoId: string,
  ) {}
}
