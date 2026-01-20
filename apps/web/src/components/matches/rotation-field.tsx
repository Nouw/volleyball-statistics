"use client";

import { useEffect, useMemo, useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC, useTRPCClient } from "@/utils/trpc";
import type { RouterOutputs } from "@repo/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/base/card";
import { Button } from "@repo/ui/components/base/button";
import { Alert } from "@repo/ui/components/base/alert";
import { Skeleton } from "@repo/ui/components/base/skeleton";
import type { OnCourtData } from "./on-court-players-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/base/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/base/select";
import { TrashIcon } from "lucide-react";

interface RotationFieldProps {
  teamId: string;
  setId: string;
  matchId: string;
  showDelete?: boolean;
}

const fieldLabels = ["1", "2", "3", "4", "5", "6"] as const;
type SectionKey = "us" | "opponent";
type SlotTarget =
  | { team: SectionKey; type: "position"; index: number }
  | { team: SectionKey; type: "libero" }
  | null;

const validateLineup = (positions: string[], liberoId: string) => {
  if (!positions.every(Boolean) || !liberoId) return false;
  if (positions[0] === liberoId) return false;
  return new Set([...positions, liberoId]).size === 7;
};

export function RotationField({ teamId, setId, matchId, showDelete }: RotationFieldProps): JSX.Element {
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  const playersKey = trpc.team.players.queryOptions({ teamId }).queryKey;
  const startingRotationKey = trpc.match.getStartingRotation.queryOptions({ teamId, setId }).queryKey;
  const rotationStateKey = trpc.match.getRotationState.queryOptions({ setId }).queryKey;
  const matchListKey = trpc.match.listByTeam.queryOptions({ teamId }).queryKey;

  const playersQuery = useQuery({
    queryKey: playersKey,
    queryFn: () => trpcClient.team.players.query({ teamId }),
  });

  const matchListQuery = useQuery<RouterOutputs["match"]["listByTeam"]>({
    queryKey: matchListKey,
    queryFn: () => trpcClient.match.listByTeam.query({ teamId }),
  });

  const opponentId = useMemo(() => {
    const match = matchListQuery.data?.find((m) => m.id === matchId);
    if (!match) return null;
    return match.teamAId === teamId ? match.teamBId : match.teamAId;
  }, [matchId, matchListQuery.data, teamId]);

  const opponentPlayersKey = opponentId
    ? trpc.team.players.queryOptions({ teamId: opponentId }).queryKey
    : ["team.players", "opponent", "disabled"];

  const opponentPlayersQuery = useQuery({
    queryKey: opponentPlayersKey,
    enabled: Boolean(opponentId),
    queryFn: () => trpcClient.team.players.query({ teamId: opponentId! }),
  });

  const startingRotationQuery = useQuery<RouterOutputs["match"]["getStartingRotation"]>({
    queryKey: startingRotationKey,
    retry: false,
    queryFn: () => trpcClient.match.getStartingRotation.query({ teamId, setId }),
  });

  const opponentStartingRotationKey = useMemo(
    () =>
      opponentId
        ? trpc.match.getStartingRotation.queryOptions({ teamId: opponentId, setId }).queryKey
        : ["match.getStartingRotation", "opponent", "disabled"],
    [opponentId, setId, trpc],
  );

  const opponentStartingRotationQuery = useQuery<RouterOutputs["match"]["getStartingRotation"]>({
    queryKey: opponentStartingRotationKey,
    enabled: Boolean(opponentId),
    retry: false,
    queryFn: () => trpcClient.match.getStartingRotation.query({ teamId: opponentId!, setId }),
  });

  const hasUsRotation = useMemo(
    () => Boolean(startingRotationQuery.data) && !startingRotationQuery.isError,
    [startingRotationQuery.data, startingRotationQuery.isError],
  );

  const hasOpponentRotation = useMemo(
    () => Boolean(opponentStartingRotationQuery.data) && !opponentStartingRotationQuery.isError,
    [opponentStartingRotationQuery.data, opponentStartingRotationQuery.isError],
  );

  const rotationStateQuery = useQuery<RouterOutputs["match"]["getRotationState"]>({
    queryKey: rotationStateKey,
    enabled: hasUsRotation || hasOpponentRotation,
    retry: false,
    queryFn: () => trpcClient.match.getRotationState.query({ setId }),
  });

  const [positions, setPositions] = useState<string[]>(["", "", "", "", "", ""]);
  const [liberoId, setLiberoId] = useState<string>("");
  const [opponentPositions, setOpponentPositions] = useState<string[]>(["", "", "", "", "", ""]);
  const [opponentLiberoId, setOpponentLiberoId] = useState<string>("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [slotTarget, setSlotTarget] = useState<SlotTarget>(null);
  const [pendingPlayerId, setPendingPlayerId] = useState<string>("");
  const [ourOpen, setOurOpen] = useState(true);
  const [opponentOpen, setOpponentOpen] = useState(false);

  const rotationStateUs: OnCourtData | null = useMemo(() => {
    const data = rotationStateQuery.data;
    if (!data) return null;
    if (data.teamA?.teamId === teamId) return data.teamA;
    if (data.teamB?.teamId === teamId) return data.teamB;
    return null;
  }, [rotationStateQuery.data, teamId]);

  const rotationStateOpponent: OnCourtData | null = useMemo(() => {
    if (!opponentId || !rotationStateQuery.data) return null;
    const data = rotationStateQuery.data;
    if (data.teamA?.teamId === opponentId) return data.teamA;
    if (data.teamB?.teamId === opponentId) return data.teamB;
    return null;
  }, [rotationStateQuery.data, opponentId]);

  useEffect(() => {
    if (!hasUsRotation) {
      setPositions(["", "", "", "", "", ""]);
      setLiberoId("");
      return;
    }
    if (rotationStateUs) {
      setPositions([...rotationStateUs.positions]);
      setLiberoId(rotationStateUs.liberoId);
      return;
    }
    if (startingRotationQuery.data) {
      setPositions([...startingRotationQuery.data.positions]);
      setLiberoId(startingRotationQuery.data.liberoId);
    }
  }, [hasUsRotation, rotationStateUs, startingRotationQuery.data]);

  useEffect(() => {
    if (!opponentId || !hasOpponentRotation) {
      setOpponentPositions(["", "", "", "", "", ""]);
      setOpponentLiberoId("");
      return;
    }
    if (rotationStateOpponent) {
      setOpponentPositions([...rotationStateOpponent.positions]);
      setOpponentLiberoId(rotationStateOpponent.liberoId);
      return;
    }
    if (opponentStartingRotationQuery.data) {
      setOpponentPositions([...opponentStartingRotationQuery.data.positions]);
      setOpponentLiberoId(opponentStartingRotationQuery.data.liberoId);
    }
  }, [hasOpponentRotation, opponentId, rotationStateOpponent, opponentStartingRotationQuery.data]);

  useEffect(() => {
    if (!dialogOpen) {
      setSlotTarget(null);
      setPendingPlayerId("");
      return;
    }
    if (!slotTarget) return;
    const isOpponent = slotTarget.team === "opponent";
    const currentPositions = isOpponent ? opponentPositions : positions;
    const currentLibero = isOpponent ? opponentLiberoId : liberoId;
    if (slotTarget.type === "position") {
      setPendingPlayerId(currentPositions[slotTarget.index] ?? "");
    } else {
      setPendingPlayerId(currentLibero ?? "");
    }
  }, [dialogOpen, slotTarget, positions, liberoId, opponentPositions, opponentLiberoId]);

  const playerLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    (playersQuery.data ?? []).forEach((p) => map.set(p.id, `#${p.number} ${p.name}`));
    (opponentPlayersQuery.data ?? []).forEach((p) => map.set(p.id, `#${p.number} ${p.name}`));
    return map;
  }, [playersQuery.data, opponentPlayersQuery.data]);

  const validFormUs = useMemo(() => validateLineup(positions, liberoId), [positions, liberoId]);
  const validFormOpponent = useMemo(
    () => validateLineup(opponentPositions, opponentLiberoId),
    [opponentPositions, opponentLiberoId],
  );

  const setRotationMutation = useMutation({
    mutationFn: async () => {
      return trpcClient.match.setStartingRotation.mutate({
        setId,
        teamId,
        positions: positions as [string, string, string, string, string, string],
        liberoId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: startingRotationKey });
      await queryClient.invalidateQueries({ queryKey: rotationStateKey });
    },
  });

  const deleteRotationMutation = useMutation({
    mutationFn: async () => {
      return trpcClient.match.deleteStartingRotation.mutate({ setId, teamId });
    },
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: startingRotationKey });
      queryClient.setQueryData(startingRotationKey, undefined);
      setPositions(["", "", "", "", "", ""]);
      setLiberoId("");
      await queryClient.invalidateQueries({ queryKey: startingRotationKey });
      await queryClient.invalidateQueries({ queryKey: rotationStateKey });
    },
  });

  const setOpponentRotationMutation = useMutation({
    mutationFn: async () => {
      if (!opponentId) throw new Error("Opponent not found");
      return trpcClient.match.setStartingRotation.mutate({
        setId,
        teamId: opponentId,
        positions: opponentPositions as [string, string, string, string, string, string],
        liberoId: opponentLiberoId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: opponentStartingRotationKey });
      await queryClient.invalidateQueries({ queryKey: rotationStateKey });
    },
  });

  const deleteOpponentRotationMutation = useMutation({
    mutationFn: async () => {
      if (!opponentId) throw new Error("Opponent not found");
      return trpcClient.match.deleteStartingRotation.mutate({ setId, teamId: opponentId });
    },
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: opponentStartingRotationKey });
      queryClient.setQueryData(opponentStartingRotationKey, undefined);
      setOpponentPositions(["", "", "", "", "", ""]);
      setOpponentLiberoId("");
      await queryClient.invalidateQueries({ queryKey: opponentStartingRotationKey });
      await queryClient.invalidateQueries({ queryKey: rotationStateKey });
    },
  });

  const handleOpenSlot = (target: SlotTarget) => {
    if (!target) return;
    const locked = target.team === "us" ? hasUsRotation : hasOpponentRotation;
    if (locked) return;
    setSlotTarget(target);
    setDialogOpen(true);
  };

  const availablePlayers = useMemo(() => {
    if (!slotTarget) return [];
    const isOpponent = slotTarget.team === "opponent";
    const pool = isOpponent ? opponentPlayersQuery.data ?? [] : playersQuery.data ?? [];
    const currentPositions = isOpponent ? opponentPositions : positions;
    const currentLibero = isOpponent ? opponentLiberoId : liberoId;
    const used = new Set(currentPositions.filter(Boolean).concat(currentLibero ? [currentLibero] : []));
    if (slotTarget.type === "position") {
      used.delete(currentPositions[slotTarget.index]);
    } else {
      used.delete(currentLibero);
    }
    return pool.filter((p) => {
      if (used.has(p.id)) return false;
      return !(slotTarget.type === "position" && slotTarget.index === 0 && p.id === currentLibero);
    });
  }, [slotTarget, opponentPlayersQuery.data, playersQuery.data, opponentPositions, positions, opponentLiberoId, liberoId]);

  const applySelection = () => {
    if (!slotTarget || !pendingPlayerId) return;
    const isOpponent = slotTarget.team === "opponent";
    if (slotTarget.type === "position") {
      const next = [...(isOpponent ? opponentPositions : positions)];
      next[slotTarget.index] = pendingPlayerId;
      (isOpponent ? setOpponentPositions : setPositions)(next);
    } else {
      (isOpponent ? setOpponentLiberoId : setLiberoId)(pendingPlayerId);
    }
    setDialogOpen(false);
  };

  const renderGrid = (section: SectionKey, values: string[], locked: boolean) => (
    <div className="grid grid-cols-3 gap-3">
      {fieldLabels.map((label, idx) => (
        <button
          key={`${section}-${label}`}
          type="button"
          onClick={() => handleOpenSlot({ team: section, type: "position", index: idx })}
          disabled={locked}
          className="flex h-20 flex-col items-center justify-center rounded-md border border-dashed border-muted-foreground/50 bg-muted/30 text-sm transition hover:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="text-xs text-muted-foreground">Position {label}</span>
          <span className="font-medium">{playerLabelMap.get(values[idx]) ?? "Empty"}</span>
        </button>
      ))}
    </div>
  );

  const renderLibero = (section: SectionKey, currentLibero: string, locked: boolean) => (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => handleOpenSlot({ team: section, type: "libero" })}
        disabled={locked}
        className="flex h-14 w-full items-center justify-between rounded-md border border-dashed border-muted-foreground/50 bg-muted/20 px-4 text-sm transition hover:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Libero</span>
        <span className="font-medium">{playerLabelMap.get(currentLibero) ?? "Empty"}</span>
      </button>
    </div>
  );

  const renderStatus = (locked: boolean, state: OnCourtData | null) => {
    const serverId = state?.positions?.[0] ?? "";
    const serverLabel = serverId ? playerLabelMap.get(serverId) ?? "Player" : "-";
    return (
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-muted px-2 py-1 font-medium text-foreground">{locked ? "Rotation set" : "Not set"}</span>
        <span className="rounded-full bg-muted px-2 py-1">{locked ? "Locked" : "Editable"}</span>
        <span className="rounded-full bg-muted px-2 py-1">Server: {serverLabel}</span>
      </div>
    );
  };

  const renderSection = (section: SectionKey) => {
    const isOpponent = section === "opponent";
    const locked = isOpponent ? hasOpponentRotation : hasUsRotation;
    const sectionPlayersQuery = isOpponent ? opponentPlayersQuery : playersQuery;
    const sectionStartingRotationQuery = isOpponent ? opponentStartingRotationQuery : startingRotationQuery;
    const sectionRotationState = isOpponent ? rotationStateOpponent : rotationStateUs;
    const sectionPositions = isOpponent ? opponentPositions : positions;
    const sectionLibero = isOpponent ? opponentLiberoId : liberoId;
    const sectionValidForm = isOpponent ? validFormOpponent : validFormUs;
    const sectionSetMutation = isOpponent ? setOpponentRotationMutation : setRotationMutation;
    const sectionDeleteMutation = isOpponent ? deleteOpponentRotationMutation : deleteRotationMutation;
    const sectionOpen = isOpponent ? opponentOpen : ourOpen;
    const toggleOpen = isOpponent ? () => setOpponentOpen((prev) => !prev) : () => setOurOpen((prev) => !prev);
    const label = isOpponent ? "Opponent rotation" : "Our rotation";

    return (
      <div className="rounded-lg border p-4">
        <button
          type="button"
          onClick={toggleOpen}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="space-y-2">
            <p className="text-base font-semibold">{label}</p>
            {renderStatus(locked, sectionRotationState)}
          </div>
          <span className="text-xs text-muted-foreground">{sectionOpen ? "Hide" : "Show"}</span>
        </button>

        {sectionOpen ? (
          <div className="mt-4 space-y-4">
            {sectionPlayersQuery.isLoading || (isOpponent && matchListQuery.isLoading) ? (
              <Skeleton className="h-40" />
            ) : isOpponent && matchListQuery.error ? (
              <Alert variant="destructive">
                Failed to load match info: {matchListQuery.error.message}
              </Alert>
            ) : sectionPlayersQuery.error ? (
              <Alert variant="destructive">
                Failed to load players: {sectionPlayersQuery.error.message}
              </Alert>
            ) : isOpponent && !opponentId ? (
              <Alert variant="destructive">Opponent not found for this match.</Alert>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Tap a slot to assign a player. Libero can&apos;t serve (position 1). Once saved, the lineup is locked.
                </p>
                {sectionStartingRotationQuery.isError ? (
                  <Alert variant="destructive">Failed to load starting rotation.</Alert>
                ) : null}
                {locked ? <Alert>Starting rotation already set. Editing disabled.</Alert> : null}
                {renderGrid(section, sectionPositions, locked)}
                {renderLibero(section, sectionLibero, locked)}
                <div className="flex">
                  <Button
                    onClick={() => sectionSetMutation.mutate()}
                    disabled={!sectionValidForm || locked || sectionSetMutation.isPending}
                  >
                    {sectionSetMutation.isPending ? "Saving..." : "Save lineup"}
                  </Button>
                  {showDelete && (
                    <Button
                      className="ml-auto"
                      variant="destructive"
                      onClick={async () => sectionDeleteMutation.mutateAsync()}
                      disabled={sectionDeleteMutation.isPending || !locked}
                    >
                      <TrashIcon />
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>On-court rotation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderSection("us")}
        {renderSection("opponent")}

        {rotationStateQuery.error && (hasUsRotation || hasOpponentRotation) ? (
          <Alert variant="destructive">Rotation state unavailable</Alert>
        ) : null}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {slotTarget?.type === "libero"
                  ? `Assign libero${slotTarget?.team === "opponent" ? " · Opponent" : ""}`
                  : `Assign position ${slotTarget ? slotTarget.index + 1 : ""}${
                      slotTarget?.team === "opponent" ? " · Opponent" : ""
                    }`}
              </DialogTitle>
              <DialogDescription>
                {slotTarget?.type === "position" && slotTarget.index === 0
                  ? "Server starts in position 1; libero cannot serve."
                  : "Players can only occupy one slot."}
              </DialogDescription>
            </DialogHeader>

            <Select onValueChange={setPendingPlayerId} value={pendingPlayerId || undefined}>
              <SelectTrigger>
                <SelectValue
                  placeholder={availablePlayers.length ? "Select player" : "No players available"}
                />
              </SelectTrigger>
              <SelectContent>
                {availablePlayers.length === 0 ? (
                  <SelectItem value="" disabled>
                    No players available
                  </SelectItem>
                ) : (
                  availablePlayers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      #{p.number} {p.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <DialogFooter>
              <Button onClick={applySelection} disabled={!pendingPlayerId || availablePlayers.length === 0}>
                Assign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
