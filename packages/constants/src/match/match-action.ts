export enum MatchAction {
  // inRally
  InRallyOverPassInPlay = "inRally.overPassInPlay",
  InRallyOneServe = "inRally.oneServe",
  InRallyTwoServe = "inRally.twoServe",
  InRallyThreeServe = "inRally.threeServe",
  InRallyDig = "inRally.dig",
  InRallyHitStillInPlay = "inRally.hitStillInPlay",
  InRallyBlockStillInPlay = "inRally.blockStillInPlay",

  // Receive
  OneReceive = "receive.one",
  TwoReceive = "receive.two",
  ThreeReceive = "receive.three",
  OverpassReceive = "receive.overpass",

  // earned
  EarnedAce = "earned.ace",
  EarnedSpike = "earned.spike",
  EarnedTip = "earned.tip",
  EarnedDump = "earned.dump",
  EarnedDownBallHit = "earned.downBallHit",
  EarnedBlock = "earned.block",
  EarnedAssist = "earned.assist",

  // errors
  ErrorServe = "error.serve",
  ErrorSpike = "error.spike",
  ErrorTip = "error.tip",
  ErrorDump = "error.dump",
  ErrorDownBallHit = "error.downBallHit",
  ErrorBlock = "error.block",
  ErrorWhoseBall = "error.whoseBall",
  ErrorReceive = "error.receive",
  ErrorDig = "error.dig",
  ErrorSet = "error.set",
  ErrorFreeBallReceive = "error.freeBallReceive",
  ErrorSecondBallReturn = "error.secondBallReturn",
  ErrorThirdBallReturn = "error.thirdBallReturn",

  // faults
  FaultNet = "fault.net",
  FaultBallHandling = "fault.ballHandling",
  FaultUnder = "fault.under",
  FaultOverTheNet = "fault.overTheNet",
  FaultFootFault = "fault.footFault",
  FaultOutOfRotation = "fault.outOfRotation",
  FaultBackRowAttack = "fault.backRowAttack",
}

export function formatMatchActionLabel(value: MatchAction): string {
  const core = value.includes(".") ? value.slice(value.indexOf(".") + 1) : value;
  return core
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\./g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const attackScore = [MatchAction.EarnedSpike, MatchAction.EarnedTip, MatchAction.EarnedDownBallHit, MatchAction.EarnedDump];
export const attackError = [MatchAction.ErrorSpike, MatchAction.ErrorTip, MatchAction.ErrorDownBallHit, MatchAction.ErrorDump, MatchAction.FaultBallHandling, MatchAction.FaultFootFault, MatchAction.FaultBackRowAttack];
export const restError = [MatchAction.FaultNet, MatchAction.FaultUnder, MatchAction.FaultOverTheNet, MatchAction.FaultOutOfRotation]
export const receiveError = []
