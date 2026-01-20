"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@repo/ui/components/base/button";
import { Alert } from "@repo/ui/components/base/alert";
import { Skeleton } from "@repo/ui/components/base/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC, useTRPCClient } from "../../utils/trpc";
import type { RouterOutputs } from "@repo/trpc";
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
import { SaveIcon, TrashIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/base/card";

interface PlayersCourtProps {
  teamA: { id: string; name: string };
  teamB: { id: string; name: string };
  matchId: string;
  setId: string;
  showDelete?: boolean;
}

type SectionKey = "teamA" | "teamB";
type SlotTarget =
  | { team: SectionKey; type: "position"; index: number }
  | { team: SectionKey; type: "libero" }
  | null;

const validateLineup = (positions: string[], liberoId: string) => {
  if (!positions.every(Boolean) || !liberoId) return false;
  if (positions[0] === liberoId) return false;
  return new Set([...positions, liberoId]).size === 7;
};

export function PlayersCourt({ teamA, teamB, matchId, setId, showDelete }: PlayersCourtProps) {
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();
  const teamAId = teamA.id;
  const teamBId = teamB.id;

  const playersAKey = trpc.team.players.queryOptions({ teamId: teamAId }).queryKey;
  const playersBKey = trpc.team.players.queryOptions({ teamId: teamBId }).queryKey;
  const rotationStateKey = trpc.match.getRotationState.queryOptions({ setId }).queryKey;
  const startingRotationAKey = trpc.match.getStartingRotation.queryOptions({ teamId: teamAId, setId }).queryKey;
  const startingRotationBKey = trpc.match.getStartingRotation.queryOptions({ teamId: teamBId, setId }).queryKey;

  const playersAQuery = useQuery({
    queryKey: playersAKey,
    queryFn: () => trpcClient.team.players.query({ teamId: teamAId }),
  });

  const playersBQuery = useQuery({
    queryKey: playersBKey,
    queryFn: () => trpcClient.team.players.query({ teamId: teamBId }),
  });

  const startingRotationAQuery = useQuery<RouterOutputs["match"]["getStartingRotation"]>({
    queryKey: startingRotationAKey,
    retry: false,
    queryFn: () => trpcClient.match.getStartingRotation.query({ teamId: teamAId, setId }),
  });

  const startingRotationBQuery = useQuery<RouterOutputs["match"]["getStartingRotation"]>({
    queryKey: startingRotationBKey,
    retry: false,
    queryFn: () => trpcClient.match.getStartingRotation.query({ teamId: teamBId, setId }),
  });

  const hasRotationA = useMemo(
    () => Boolean(startingRotationAQuery.data) && !startingRotationAQuery.isError,
    [startingRotationAQuery.data, startingRotationAQuery.isError],
  );
  const hasRotationB = useMemo(
    () => Boolean(startingRotationBQuery.data) && !startingRotationBQuery.isError,
    [startingRotationBQuery.data, startingRotationBQuery.isError],
  );

  const rotationStateQuery = useQuery<RouterOutputs["match"]["getRotationState"]>({
    queryKey: rotationStateKey,
    enabled: hasRotationA || hasRotationB,
    retry: false,
    queryFn: () => trpcClient.match.getRotationState.query({ setId }),
  });

  const [positionsA, setPositionsA] = useState<string[]>(["", "", "", "", "", ""]);
  const [liberoA, setLiberoA] = useState<string>("");
  const [positionsB, setPositionsB] = useState<string[]>(["", "", "", "", "", ""]);
  const [liberoB, setLiberoB] = useState<string>("");
  const [initialServerTeamId, setInitialServerTeamId] = useState<string>(teamAId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [slotTarget, setSlotTarget] = useState<SlotTarget>(null);
  const [pendingPlayerId, setPendingPlayerId] = useState<string>("");

  useEffect(() => {
    setInitialServerTeamId(teamAId);
  }, [teamAId]);

  const rotationStateA = useMemo(() => {
    const data = rotationStateQuery.data;
    if (!data) return null;
    if (data.teamA?.teamId === teamAId) return data.teamA;
    if (data.teamB?.teamId === teamAId) return data.teamB;
    return null;
  }, [rotationStateQuery.data, teamAId]);

  const rotationStateB = useMemo(() => {
    const data = rotationStateQuery.data;
    if (!data) return null;
    if (data.teamA?.teamId === teamBId) return data.teamA;
    if (data.teamB?.teamId === teamBId) return data.teamB;
    return null;
  }, [rotationStateQuery.data, teamBId]);

  useEffect(() => {
    const initial = rotationStateQuery.data?.initialServerTeamId;
    if (initial) {
      setInitialServerTeamId(initial);
    }
  }, [rotationStateQuery.data?.initialServerTeamId]);

  useEffect(() => {
    if (!hasRotationA) {
      setPositionsA(["", "", "", "", "", ""]);
      setLiberoA("");
      return;
    }
    if (rotationStateA) {
      setPositionsA([...rotationStateA.positions]);
      setLiberoA(rotationStateA.liberoId);
      return;
    }
    if (startingRotationAQuery.data) {
      setPositionsA([...startingRotationAQuery.data.positions]);
      setLiberoA(startingRotationAQuery.data.liberoId);
    }
  }, [hasRotationA, rotationStateA, startingRotationAQuery.data]);

  useEffect(() => {
    if (!hasRotationB) {
      setPositionsB(["", "", "", "", "", ""]);
      setLiberoB("");
      return;
    }
    if (rotationStateB) {
      setPositionsB([...rotationStateB.positions]);
      setLiberoB(rotationStateB.liberoId);
      return;
    }
    if (startingRotationBQuery.data) {
      setPositionsB([...startingRotationBQuery.data.positions]);
      setLiberoB(startingRotationBQuery.data.liberoId);
    }
  }, [hasRotationB, rotationStateB, startingRotationBQuery.data]);

  useEffect(() => {
    if (!dialogOpen) {
      setSlotTarget(null);
      setPendingPlayerId("");
      return;
    }
    if (!slotTarget) return;
    const isTeamB = slotTarget.team === "teamB";
    const currentPositions = isTeamB ? positionsB : positionsA;
    const currentLibero = isTeamB ? liberoB : liberoA;
    if (slotTarget.type === "position") {
      setPendingPlayerId(currentPositions[slotTarget.index] ?? "");
    } else {
      setPendingPlayerId(currentLibero ?? "");
    }
  }, [dialogOpen, slotTarget, positionsA, positionsB, liberoA, liberoB]);

  const playerLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    (playersAQuery.data ?? []).forEach((p) => map.set(p.id, `#${p.number} ${p.name}`));
    (playersBQuery.data ?? []).forEach((p) => map.set(p.id, `#${p.number} ${p.name}`));
    return map;
  }, [playersAQuery.data, playersBQuery.data]);

  const jerseyNumberMap = useMemo(() => {
    const map = new Map<string, string>();
    (playersAQuery.data ?? []).forEach((p) => map.set(p.id, String(p.number ?? "")));
    (playersBQuery.data ?? []).forEach((p) => map.set(p.id, String(p.number ?? "")));
    return map;
  }, [playersAQuery.data, playersBQuery.data]);

  const validFormA = useMemo(() => validateLineup(positionsA, liberoA), [positionsA, liberoA]);
  const validFormB = useMemo(() => validateLineup(positionsB, liberoB), [positionsB, liberoB]);

  const setRotationAMutation = useMutation({
    mutationFn: async () => {
      return trpcClient.match.setStartingRotation.mutate({
        setId,
        teamId: teamAId,
        positions: positionsA as [string, string, string, string, string, string],
        liberoId: liberoA,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: startingRotationAKey });
      await queryClient.invalidateQueries({ queryKey: rotationStateKey });
    },
  });

  const deleteRotationAMutation = useMutation({
    mutationFn: async () => {
      return trpcClient.match.deleteStartingRotation.mutate({ setId, teamId: teamAId });
    },
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: startingRotationAKey });
      queryClient.setQueryData(startingRotationAKey, undefined);
      setPositionsA(["", "", "", "", "", ""]);
      setLiberoA("");
      setInitialServerTeamId(teamAId);
      await queryClient.invalidateQueries({ queryKey: startingRotationAKey });
      await queryClient.invalidateQueries({ queryKey: rotationStateKey });
    },
  });

  const setRotationBMutation = useMutation({
    mutationFn: async () => {
      return trpcClient.match.setStartingRotation.mutate({
        setId,
        teamId: teamBId,
        positions: positionsB as [string, string, string, string, string, string],
        liberoId: liberoB,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: startingRotationBKey });
      await queryClient.invalidateQueries({ queryKey: rotationStateKey });
    },
  });

  const deleteRotationBMutation = useMutation({
    mutationFn: async () => {
      return trpcClient.match.deleteStartingRotation.mutate({ setId, teamId: teamBId });
    },
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: startingRotationBKey });
      queryClient.setQueryData(startingRotationBKey, undefined);
      setPositionsB(["", "", "", "", "", ""]);
      setLiberoB("");
      setInitialServerTeamId(teamAId);
      await queryClient.invalidateQueries({ queryKey: startingRotationBKey });
      await queryClient.invalidateQueries({ queryKey: rotationStateKey });
    },
  });

  const setInitialServerMutation = useMutation({
    mutationFn: async () => {
      if (!initialServerTeamId) throw new Error("Select a serving team");
      return trpcClient.match.setInitialServer.mutate({ setId, teamId: initialServerTeamId });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: rotationStateKey });
    },
  });

  const handleOpenSlot = (target: SlotTarget) => {
    if (!target) return;
    const locked = target.team === "teamA" ? hasRotationA : hasRotationB;
    if (locked) return;
    setSlotTarget(target);
    setDialogOpen(true);
  };

  const availablePlayers = useMemo(() => {
    if (!slotTarget) return [];
    const isTeamB = slotTarget.team === "teamB";
    const pool = isTeamB ? playersBQuery.data ?? [] : playersAQuery.data ?? [];
    const currentPositions = isTeamB ? positionsB : positionsA;
    const currentLibero = isTeamB ? liberoB : liberoA;
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
  }, [slotTarget, playersAQuery.data, playersBQuery.data, positionsA, positionsB, liberoA, liberoB]);

  const applySelection = () => {
    if (!slotTarget || !pendingPlayerId) return;
    const isTeamB = slotTarget.team === "teamB";
    if (slotTarget.type === "position") {
      const next = [...(isTeamB ? positionsB : positionsA)];
      next[slotTarget.index] = pendingPlayerId;
      (isTeamB ? setPositionsB : setPositionsA)(next);
    } else {
      (isTeamB ? setLiberoB : setLiberoA)(pendingPlayerId);
    }
    setDialogOpen(false);
  };

  const renderButton = (
    team: SectionKey,
    label: string,
    positionIndex: number,
    values: string[],
    locked: boolean,
  ) => (
    // Position {label} button
    <div className="flex size-24 justify-center items-center border-r border-dashed">
      <Button
        type="button"
        variant={jerseyNumberMap.get(values[positionIndex]) ? "default" : "outline"}
        onClick={() => handleOpenSlot({ team, type: "position", index: positionIndex })}
        disabled={locked}
      >
        {jerseyNumberMap.get(values[positionIndex]) ?? label}
      </Button>
    </div>
  );

  const renderButtonRight = (
    team: SectionKey,
    label: string,
    positionIndex: number,
    values: string[],
    locked: boolean,
  ) => (
    // Position {label} button
    <div className="flex size-24 justify-center items-center">
      <Button
        type="button"
        variant={jerseyNumberMap.get(values[positionIndex]) ? "default" : "outline"}
        onClick={() => handleOpenSlot({ team, type: "position", index: positionIndex })}
        disabled={locked}
      >
        {jerseyNumberMap.get(values[positionIndex]) ?? label}
      </Button>
    </div>
  );

  const renderLiberoRow = (team: SectionKey, currentLibero: string, locked: boolean) => (
    <div className="mt-2 flex w-full justify-center items-center text-sm text-muted-foreground">
      <Button
        type="button"
        onClick={() => handleOpenSlot({ team, type: "libero" })}
        disabled={locked}
        variant={playerLabelMap.get(currentLibero) ? "default" : "outline"}
      >
        {playerLabelMap.get(currentLibero) ?? "Lib"}
      </Button>
    </div>
  );

  const renderActions = (
    isTeamB: boolean,
    locked: boolean,
    validForm: boolean,
    setMutation: typeof setRotationAMutation,
    deleteMutation: typeof deleteRotationAMutation,
  ) => (
    <div className="flex flex-col gap-2 m-1">
      <Button size="icon" onClick={() => setMutation.mutate()} disabled={!validForm || locked || setMutation.isPending}>
        <SaveIcon />
      </Button>
      {showDelete ? (
        <Button
          variant="destructive"
          size="icon"
          onClick={() => deleteMutation.mutate()}
          disabled={!locked || deleteMutation.isPending}
        >
          <TrashIcon />
        </Button>
      ) : null}
    </div>
  );

  const renderServingSelector = () => (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">Serving first</span>
      <div className="flex gap-2">
        <Button
          variant={initialServerTeamId === teamAId ? "default" : "outline"}
          onClick={() => setInitialServerTeamId(teamAId)}
          disabled={setInitialServerMutation.isPending}
        >
          {teamA.name}
        </Button>
        <Button
          variant={initialServerTeamId === teamBId ? "default" : "outline"}
          onClick={() => setInitialServerTeamId(teamBId)}
          disabled={setInitialServerMutation.isPending}
        >
          {teamB.name}
        </Button>
      </div>
      <Button onClick={() => setInitialServerMutation.mutate()} disabled={setInitialServerMutation.isPending}>
        {setInitialServerMutation.isPending ? "Saving..." : "Save serve"}
      </Button>
    </div>
  );
  const renderTeamA = () => {
    const locked = hasRotationA;
    const loading = playersAQuery.isLoading;
    const error = playersAQuery.error;

    return (
      <div className="flex flex-col">
        <p className="text-center text-lg">{teamA.name}</p>
        <div className="flex flex-row">
          {renderActions(false, locked, validFormA, setRotationAMutation, deleteRotationAMutation)}
          <div className="flex flex-col">
            <div className="flex flex-col border">
              <div className="flex flex-row">
                {renderButton("teamA", "5", 4, positionsA, locked)}
                {renderButtonRight("teamA", "4", 3, positionsA, locked)}
              </div>
              <div className="flex flex-row">
                {renderButton("teamA", "6", 5, positionsA, locked)}
                {renderButtonRight("teamA", "3", 2, positionsA, locked)}
              </div>
              <div className="flex flex-row">
                {renderButton("teamA", "1", 0, positionsA, locked)}
                {renderButtonRight("teamA", "2", 1, positionsA, locked)}
              </div>
            </div>
            {renderLiberoRow("teamA", liberoA, locked)}
          </div>
          {loading ? <Skeleton className="mt-2 h-10" /> : null}
          {error ? <Alert variant="destructive">Failed to load players: {error.message}</Alert> : null}
        </div>
      </div>


    );
  };

  const renderTeamB = () => {
    const locked = hasRotationB;
    const loading = playersBQuery.isLoading;
    const error = playersBQuery.error;

    return (
      <div className="flex flex-col">
        <p className="text-center text-lg">{teamB.name}</p>
        <div className="flex flex-row">
          <div className="flex flex-col">
            <div className="flex flex-col border">
              <div className="flex flex-row max-w-fit">
                {renderButton("teamB", "2", 1, positionsB, locked)}
                {renderButtonRight("teamB", "1", 0, positionsB, locked)}
              </div>
              <div className="flex flex-row max-w-fit">
                {renderButton("teamB", "3", 2, positionsB, locked)}
                {renderButtonRight("teamB", "6", 5, positionsB, locked)}
              </div>
              <div className="flex flex-row max-w-fit">
                {renderButton("teamB", "4", 3, positionsB, locked)}
                {renderButtonRight("teamB", "5", 4, positionsB, locked)}
              </div>
            </div>
            {renderLiberoRow("teamB", liberoB, locked)}
          </div>
          {renderActions(true, locked, validFormB, setRotationBMutation, deleteRotationBMutation)}
          {loading ? <Skeleton className="mt-2 h-10" /> : null}
          {error ? <Alert variant="destructive">Failed to load players: {error.message}</Alert> : null}
        </div>
      </div>

    );
  };

  return (
    <Card className="flex flex-col w-full">
      <CardHeader>
        <CardTitle>Players</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center mb-2">
          <div className="flex flex-row">
            {/* Team A side */}
            {renderTeamA()}
            {/* Team B side */}
            {renderTeamB()}
          </div>
        </div>

        <div className="mt-4 flex justify-center">{renderServingSelector()}</div>

        {rotationStateQuery.error && (hasRotationA || hasRotationB) ? (
          <Alert variant="destructive" className="mt-3">
            Rotation state unavailable
          </Alert>
        ) : null}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {slotTarget?.type === "libero"
                  ? `Assign libero${slotTarget?.team === "teamB" ? " · Opponent" : ""}`
                  : `Assign position ${slotTarget ? slotTarget.index + 1 : ""}${
                    slotTarget?.team === "teamB" ? " · Opponent" : ""
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
