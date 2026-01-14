"use client";

import { useEffect, useMemo, useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC, useTRPCClient } from "@/utils/trpc";
import type { RouterOutputs } from "@repo/trpc";
import { MatchAction, formatMatchActionLabel } from "@repo/constants/match/match-action";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/base/card";
import { Alert } from "@repo/ui/components/base/alert";
import { Skeleton } from "@repo/ui/components/base/skeleton";
import { MatchButton } from "./match-button";
import { Label } from "@repo/ui/components/base/label";
import { Separator } from "@repo/ui/components/base/separator";
import { ActionHistory } from "./action-history";

export type OnCourtData = RouterOutputs["match"]["getRotationState"]["teamA"];

export type PlayerSummary = { id: string; name: string; number: number | null };

interface OnCourtPlayersCardProps {
  teamId: string;
  setId: string;
  matchId: string;
}

export function OnCourtPlayersCard({ teamId, setId, matchId }: OnCourtPlayersCardProps): JSX.Element {
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  const playersKey = trpc.team.players.queryOptions({ teamId }).queryKey;
  const rotationStateKey = trpc.match.getRotationState.queryOptions({ setId }).queryKey;
  const actionsKey = trpc.match.getActions.queryOptions({ matchId, setId }).queryKey;
  const scoreKey = trpc.match.getScore.queryOptions({ matchId }).queryKey;
  const matchListKey = trpc.match.listByTeam.queryOptions({ teamId }).queryKey;

  const playersQuery = useQuery<PlayerSummary[]>({
    queryKey: playersKey,
    queryFn: () => trpcClient.team.players.query({ teamId }),
  });

  const rotationStateQuery = useQuery<RouterOutputs["match"]["getRotationState"]>({
    queryKey: rotationStateKey,
    retry: false,
    queryFn: () => trpcClient.match.getRotationState.query({ setId }),
  });

  const actionsQuery = useQuery<RouterOutputs["match"]["getActions"]>({
    queryKey: actionsKey,
    queryFn: () => trpcClient.match.getActions.query({ matchId, setId }),
  });

  const scoreQuery = useQuery<RouterOutputs["match"]["getScore"]>({
    queryKey: scoreKey,
    queryFn: () => trpcClient.match.getScore.query({ matchId }),
  });

  const matchListQuery = useQuery<RouterOutputs["match"]["listByTeam"]>({
    queryKey: matchListKey,
    queryFn: () => trpcClient.match.listByTeam.query({ teamId }),
  });

  const deleteAction = useMutation({
    ...trpc.match.deleteAction.mutationOptions(),
    onSuccess: () => {
      void scoreQuery.refetch();
      void rotationStateQuery.refetch();
      void actionsQuery.refetch();
      void queryClient.refetchQueries({ queryKey: trpc.match.getSets.queryOptions({ matchId }).queryKey });
    },
  });

  const rotationState: OnCourtData | null = useMemo(() => {
    const data = rotationStateQuery.data;
    if (!data) return null;
    if (data.teamA?.teamId === teamId) return data.teamA;
    if (data.teamB?.teamId === teamId) return data.teamB;
    return null;
  }, [rotationStateQuery.data, teamId]);

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [selectedAction, setSelectedAction] = useState<MatchAction | null>(null);

  const playerLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    (playersQuery.data ?? []).forEach((p) => map.set(p.id, `#${p.number ?? "?"} ${p.name}`));
    return map;
  }, [playersQuery.data]);

  const serverPlayerId = rotationState?.positions?.[0] ?? null;

  const onCourt = useMemo(() => {
    if (!rotationState) return [] as Array<{ id: string; isLibero: boolean; label: string }>;
    const list = rotationState.positions.map((id: string, idx: number) => ({ id, isLibero: false, label: `Pos ${idx + 1}` }));
    if (rotationState.liberoId) {
      list.push({ id: rotationState.liberoId, isLibero: true, label: "Libero" });
    }
    return list;
  }, [rotationState]);

  const matchInfo = useMemo(() => matchListQuery.data?.find((m: { id: string; }) => m.id === matchId) ?? null, [matchListQuery.data, matchId]);
  const activeSetScore = useMemo(() => scoreQuery.data?.find((s: { id: string; }) => s.id === setId) ?? null, [scoreQuery.data, setId]);
  const isTeamA = matchInfo ? matchInfo.teamAId === teamId : null;
  const usScore = activeSetScore ? (isTeamA === null ? activeSetScore.pointsA : isTeamA ? activeSetScore.pointsA : activeSetScore.pointsB) : null;
  const oppScore = activeSetScore ? (isTeamA === null ? activeSetScore.pointsB : isTeamA ? activeSetScore.pointsB : activeSetScore.pointsA) : null;

  const derivePointDelta = (action: MatchAction | null) => {
    if (!action) return 0;
    const val = String(action);
    if (val.startsWith("earned.")) return 1;
    if (val.startsWith("error.") || val.startsWith("fault.")) return -1;
    return 0;
  };

  const deriveOutcome = (action: MatchAction | null) => {
    if (!action) return "Action";
    const val = String(action);
    if (val.startsWith("earned.")) return "Scored";
    if (val.startsWith("error.")) return "Error";
    if (val.startsWith("fault.")) return "Error";
    if (val.startsWith("inRally.")) return "In play";
    return "Action";
  };

  useEffect(() => {
    if (!selectedPlayerId && onCourt.length > 0) {
      const initial = serverPlayerId ?? onCourt[0]?.id;
      setSelectedPlayerId(initial ?? "");
    }
  }, [onCourt, serverPlayerId, selectedPlayerId]);


  const isLoading = playersQuery.isLoading || rotationStateQuery.isLoading || scoreQuery.isLoading || matchListQuery.isLoading;
  const errorMessage = playersQuery.error
    ? playersQuery.error.message
    : rotationStateQuery.error
      ? "Rotation state unavailable"
      : null;

  const earnedActions = useMemo(
    () => [
      MatchAction.EarnedAce,
      MatchAction.EarnedSpike,
      MatchAction.EarnedTip,
      MatchAction.EarnedDump,
      MatchAction.EarnedDownBallHit,
      MatchAction.EarnedBlock,
      MatchAction.EarnedAssist,
    ].map((val) => ({
      value: val,
      label: formatMatchActionLabel(val),
    })),
    [],
  );

  const errorActions = useMemo(() => ([
    MatchAction.ErrorServe,
    MatchAction.ErrorSpike,
    MatchAction.ErrorTip,
    MatchAction.ErrorDump,
    MatchAction.ErrorDownBallHit,
    MatchAction.ErrorBlock,
    MatchAction.ErrorWhoseBall,
    MatchAction.ErrorReceive,
    MatchAction.ErrorDig,
    MatchAction.ErrorSet,
    MatchAction.ErrorFreeBallReceive,
    MatchAction.ErrorSecondBallReturn,
    MatchAction.ErrorThirdBallReturn,
  ].map((val) => ({
    value: val,
    label: formatMatchActionLabel(val),
  }))), []);

  const faultActions = useMemo(() => ([
    MatchAction.FaultNet,
    MatchAction.FaultBallHandling,
    MatchAction.FaultUnder,
    MatchAction.FaultOverTheNet,
    MatchAction.FaultFootFault,
    MatchAction.FaultOutOfRotation,
    MatchAction.FaultBackRowAttack,
  ].map((val) => ({
    value: val,
    label: formatMatchActionLabel(val),
  }))), []);

  const inRallyActions = useMemo(() => {
    const actions = [
      MatchAction.InRallyOverPassInPlay,
      MatchAction.InRallyOneServe,
      MatchAction.InRallyTwoServe,
      MatchAction.InRallyThreeServe,
      MatchAction.InRallyDig,
      MatchAction.InRallyHitStillInPlay,
      MatchAction.InRallyBlockStillInPlay,
    ];

    return actions.map((val) => ({
      value: val,
      label: formatMatchActionLabel(val),
    }));
  }, []);

  const recordActionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAction || !selectedPlayerId) throw new Error("Select player and action");
      const computedPointDelta = derivePointDelta(selectedAction);
      const computedOutcome = deriveOutcome(selectedAction);
      return trpcClient.match.recordAction.mutate({
        matchId,
        setId,
        teamId,
        playerId: selectedPlayerId,
        actionType: selectedAction,
        outcome: computedOutcome,
        pointDelta: computedPointDelta,
        occurredAt: new Date(),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: actionsKey });
      await queryClient.invalidateQueries({ queryKey: scoreKey });
      await queryClient.invalidateQueries({ queryKey: rotationStateKey });
      // Only refresh the getSets because we need to show the delete button in another component
      if (usScore == 0 && oppScore == 0) {
        void queryClient.refetchQueries({ queryKey: trpc.match.getSets.queryOptions({ matchId }).queryKey });
      }
    },
  });

  const canSave = Boolean(selectedAction && selectedPlayerId);

  const actionHistory = useMemo(() => {
    const list = actionsQuery.data ?? [];
    return [...list].filter((x) => x.setId === setId).sort((a, b) => b.sequence - a.sequence).slice(0, 6);
  }, [actionsQuery.data, setId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>On-court players</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-28" />
        ) : errorMessage ? (
          <Alert variant="destructive">{errorMessage}</Alert>
        ) : !rotationState ? (
          <Alert variant="destructive">Rotation not available for this set.</Alert>
        ) : (
          <div className="flex flex-col">
            <div className="flex flex-row gap-4">
              <div className="flex flex-row gap-2">
                <div className="flex flex-col items-center bg-primary text-white rounded-md px-4 py-2">
                  <p>US</p>
                  <p className="text-2xl">{usScore}</p>
                </div>
                <div className="flex flex-col items-center bg-red-500 text-white rounded-md px-4 py-2">
                  <p>OP</p>
                  <p className="text-2xl">{oppScore}</p>
                </div>
              </div>
              <div className="flex flex-row gap-4 ml-auto border p-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="player">Player</Label>
                  <Separator />
                  <p id="player">{playerLabelMap.get(selectedPlayerId) ?? "Select player"}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="action">Action</Label>
                  <Separator />
                  <p id="action">{selectedAction !== null ? formatMatchActionLabel(selectedAction) : "Select action"}</p>
                </div>
                <MatchButton
                  text={recordActionMutation.isPending ? "Saving..." : "Save"}
                  color="accent"
                  className="w-16 h-16"
                  disabled={!canSave || recordActionMutation.isPending}
                  onClick={() => recordActionMutation.mutate()}
                />
              </div>

            </div>

            <Separator className="m-4"/>
            <div className="flex flex-row gap-4 md:items-start md:justify-between">
              <div className="flex flex-col gap-2">
                {onCourt.map((p: { id: string; isLibero: boolean; label: string }) => (
                  <MatchButton
                    key={p.id}
                    text={`${playerLabelMap.get(p.id) ?? p.id}${p.isLibero ? " (Libero)" : ""}`}
                    selected={p.id === selectedPlayerId}
                    badge={p.id === serverPlayerId ? "Serving" : undefined}
                    onClick={() => setSelectedPlayerId(p.id)}
                  />
                ))}
              </div>
              <div className="flex-1">
                <div className="flex justify-end">
                  <div className="flex flex-col gap-2">
                    <h4 className="self-center">In rally</h4>
                    {inRallyActions.map((action) => (
                      <MatchButton
                        key={action.value}
                        text={action.label}
                        selected={action.value === selectedAction}
                        color="neutral"
                        onClick={() => setSelectedAction(action.value)}
                      />
                    ))}
                  </div>
                  <div className="flex flex-col gap-2">
                    <h4 className="self-center">Earned</h4>
                    {earnedActions.map((action) => (
                      <MatchButton
                        key={action.value}
                        text={action.label}
                        selected={action.value === selectedAction}
                        color="success"
                        onClick={() => setSelectedAction(action.value)}
                      />
                    ))}
                  </div>
                  <div className="flex flex-col gap-2">
                    <h4 className="self-center">Error</h4>
                    <div className="grid grid-rows-6 grid-cols-2 gap-y-2">
                      {errorActions.map((action) => (
                        <MatchButton
                          key={action.value}
                          text={action.label}
                          selected={action.value === selectedAction}
                          color="warning"
                          onClick={() => setSelectedAction(action.value)}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h4 className="self-center">Fault</h4>
                    {faultActions.map((action) => (
                      <MatchButton
                        key={action.value}
                        text={action.label}
                        selected={action.value === selectedAction}
                        color="error"
                        onClick={() => setSelectedAction(action.value)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            { setId &&
              <ActionHistory
                isLoading={actionsQuery.isLoading}
                error={actionsQuery.isError}
                actions={actionHistory}
                playerLabelMap={playerLabelMap}
                removeAction={(id) => deleteAction.mutate({ id })}
              />
            }


          </div>

        )}
      </CardContent>
    </Card>
  );
}
