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
  showDelete?: boolean;
}

const fieldLabels = ["1", "2", "3", "4", "5", "6"] as const;

type SlotTarget = { type: "position"; index: number } | { type: "libero" } | null;

export function RotationField({ teamId, setId, showDelete }: RotationFieldProps): JSX.Element {
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  const playersKey = trpc.team.players.queryOptions({ teamId }).queryKey;
  const startingRotationKey = trpc.match.getStartingRotation.queryOptions({ teamId, setId }).queryKey;
  const rotationStateKey = trpc.match.getRotationState.queryOptions({ setId }).queryKey;

  const playersQuery = useQuery({
    queryKey: playersKey,
    queryFn: () => trpcClient.team.players.query({ teamId }),
  });
  const startingRotationQuery = useQuery<RouterOutputs["match"]["getStartingRotation"]>({
    queryKey: startingRotationKey,
    retry: false,
    queryFn: () => trpcClient.match.getStartingRotation.query({ teamId, setId }),
  });

  const hasRotation = useMemo(
    () => Boolean(startingRotationQuery.data) && !startingRotationQuery.isError,
    [startingRotationQuery.data, startingRotationQuery.isError],
  );

  const rotationStateQuery = useQuery<RouterOutputs["match"]["getRotationState"]>({
    queryKey: rotationStateKey,
    enabled: hasRotation,
    retry: false,
    queryFn: () => trpcClient.match.getRotationState.query({ setId }),
  });

  const [positions, setPositions] = useState<string[]>(["", "", "", "", "", ""]);
  const [liberoId, setLiberoId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [slotTarget, setSlotTarget] = useState<SlotTarget>(null);
  const [pendingPlayerId, setPendingPlayerId] = useState<string>("");

  const rotationState: OnCourtData | null = useMemo(() => {
    const data = rotationStateQuery.data;
    if (!data) return null;
    if (data.teamA?.teamId === teamId) return data.teamA;
    if (data.teamB?.teamId === teamId) return data.teamB;
    return null;
  }, [rotationStateQuery.data, teamId]);

  useEffect(() => {
    if (!hasRotation) {
      setPositions(["", "", "", "", "", ""]);
      setLiberoId("");
      return;
    }
    if (rotationState) {
      setPositions([...rotationState.positions]);
      setLiberoId(rotationState.liberoId);
      return;
    }
    if (startingRotationQuery.data) {
      setPositions([...startingRotationQuery.data.positions]);
      setLiberoId(startingRotationQuery.data.liberoId);
    }
  }, [hasRotation, rotationState, startingRotationQuery.data]);

  useEffect(() => {
    if (!dialogOpen) {
      setSlotTarget(null);
      setPendingPlayerId("");
      return;
    }
    if (slotTarget?.type === "position") {
      setPendingPlayerId(positions[slotTarget.index] ?? "");
    } else if (slotTarget?.type === "libero") {
      setPendingPlayerId(liberoId ?? "");
    }
  }, [dialogOpen, slotTarget, positions, liberoId]);

  const playerLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    (playersQuery.data ?? []).forEach((p) => map.set(p.id, `#${p.number} ${p.name}`));
    return map;
  }, [playersQuery.data]);

  const allUsedIds = useMemo(() => positions.filter(Boolean).concat(liberoId ? [liberoId] : []), [positions, liberoId]);
  const validForm = useMemo(() => {
    if (!positions.every(Boolean) || !liberoId) return false;
    if (positions[0] === liberoId) return false;
    return new Set([...positions, liberoId]).size === 7;
  }, [positions, liberoId]);

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

  const handleOpenSlot = (target: SlotTarget) => {
    if (hasRotation) return;
    setSlotTarget(target);
    setDialogOpen(true);
  };

  const availablePlayers = useMemo(() => {
    if (!playersQuery.data || !slotTarget) return [];
    const used = new Set(allUsedIds);
    if (slotTarget.type === "position") {
      used.delete(positions[slotTarget.index]);
    } else {
      used.delete(liberoId);
    }
    return playersQuery.data.filter((p) => {
      if (used.has(p.id)) return false;
      return !(slotTarget.type === "position" && slotTarget.index === 0 && p.id === liberoId);

    });
  }, [playersQuery.data, slotTarget, allUsedIds, positions, liberoId]);

  const applySelection = () => {
    if (!slotTarget || !pendingPlayerId) return;
    if (slotTarget.type === "position") {
      const next = [...positions];
      next[slotTarget.index] = pendingPlayerId;
      setPositions(next);
    } else {
      setLiberoId(pendingPlayerId);
    }
    setDialogOpen(false);
  };

  const renderGrid = () => (
    <div className="grid grid-cols-3 gap-3">
      {fieldLabels.map((label, idx) => (
        <button
          key={label}
          type="button"
          onClick={() => handleOpenSlot({ type: "position", index: idx })}
          disabled={hasRotation}
          className="flex h-20 flex-col items-center justify-center rounded-md border border-dashed border-muted-foreground/50 bg-muted/30 text-sm transition hover:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="text-xs text-muted-foreground">Position {label}</span>
          <span className="font-medium">{playerLabelMap.get(positions[idx]) ?? "Empty"}</span>
        </button>
      ))}
    </div>
  );

  const renderLibero = () => (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => handleOpenSlot({ type: "libero" })}
        disabled={hasRotation}
        className="flex h-14 w-full items-center justify-between rounded-md border border-dashed border-muted-foreground/50 bg-muted/20 px-4 text-sm transition hover:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Libero</span>
        <span className="font-medium">{playerLabelMap.get(liberoId) ?? "Empty"}</span>
      </button>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>On-court rotation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {playersQuery.isLoading ? (
          <Skeleton className="h-40" />
        ) : playersQuery.error ? (
          <Alert variant="destructive">Failed to load players: {playersQuery.error.message}</Alert>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Tap a slot to assign a player. Libero can&apos;t serve (position 1). Once saved, the lineup is locked.
            </p>
            {hasRotation ? (
              <Alert>Starting rotation already set. Editing disabled.</Alert>
            ) : null}
            {renderGrid()}
            {renderLibero()}
            <div className="flex">
                <Button
                  onClick={() => setRotationMutation.mutate()}
                  disabled={!validForm || hasRotation || setRotationMutation.isPending}
                >
                  {setRotationMutation.isPending ? "Saving..." : "Save lineup"}
                </Button>
              {showDelete && (
                <Button
                  className="ml-auto"
                  variant="destructive"
                  onClick={async () => deleteRotationMutation.mutateAsync()}
                  disabled={deleteRotationMutation.isPending}
                >
                  <TrashIcon />
                </Button>
              )}
            </div>

          </>
        )}

        {rotationStateQuery.error && hasRotation ? (
          <Alert variant="destructive">Rotation state unavailable</Alert>
        ) : null}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {slotTarget?.type === "libero" ? "Assign libero" : `Assign position ${slotTarget ? slotTarget.index + 1 : ""}`}
              </DialogTitle>
              <DialogDescription>
                {slotTarget?.type === "position" && slotTarget.index === 0
                  ? "Server starts in position 1; libero cannot serve."
                  : "Players can only occupy one slot."}
              </DialogDescription>
            </DialogHeader>

            <Select onValueChange={setPendingPlayerId} value={pendingPlayerId || undefined}>
              <SelectTrigger>
                <SelectValue placeholder={availablePlayers.length ? "Select player" : "No players available"} />
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
              <Button
                onClick={applySelection}
                disabled={!pendingPlayerId || availablePlayers.length === 0}
              >
                Assign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
