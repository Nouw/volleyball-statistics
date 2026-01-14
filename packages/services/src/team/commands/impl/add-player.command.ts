export class AddPlayerCommand {
  constructor(
    public readonly teamId: string,
    public readonly name: string,
    public readonly number: number,
  ) {}
}
