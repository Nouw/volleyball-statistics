"use client";

import { useMemo, useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC, useTRPCClient } from "@/utils/trpc";
import type { RouterOutputs } from "@repo/trpc";
import { Alert } from "@repo/ui/components/base/alert";
import { Button } from "@repo/ui/components/base/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/base/card";
import { Label } from "@repo/ui/components/base/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/base/select";
import { Skeleton } from "@repo/ui/components/base/skeleton";

interface StartingRotationPanelProps {
  teamId: string;
  setId: string;
}

export function StartingRotationPanel({ teamId, setId }: StartingRotationPanelProps): JSX.Element {
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  const playersKey = trpc.team.players.queryOptions({ teamId }).queryKey;
  const startingRotationKey = trpc.match.getStartingRotation.queryOptions({ setId, teamId }).queryKey;
  const rotationStateKey = trpc.match.getRotationState.queryOptions({ setId }).queryKey;

  const playersQuery = useQuery({
    queryKey: playersKey,
    queryFn: () => trpcClient.team.players.query({ teamId }),
  });
  const startingRotationQuery = useQuery<RouterOutputs["match"]["getStartingRotation"]>(
    {
      queryKey: startingRotationKey,
      retry: false,
      queryFn: () => trpcClient.match.getStartingRotation.query({ setId, teamId }),
    },
  );

  const hasRotation = !!startingRotationQuery.data;

  const rotationStateQuery = useQuery<RouterOutputs["match"]["getRotationState"]>(
    {
      queryKey: rotationStateKey,
      enabled: hasRotation,
      retry: false,
      queryFn: () => trpcClient.match.getRotationState.query({ setId }),
    },
  );

  const [positions, setPositions] = useState<string[]>(["", "", "", "", "", ""]);
  const [liberoId, setLiberoId] = useState<string>("");

  const rotationKey = startingRotationKey;

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
      await queryClient.invalidateQueries({ queryKey: rotationKey });
      await queryClient.invalidateQueries({ queryKey: rotationStateKey });
    },
  });

  const validForm = useMemo(() => positions.every(Boolean) && liberoId, [positions, liberoId]);

  const renderForm = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Set the starting six (server is position 1) and libero.</p>
      {positions.map((val, idx) => (
        <div key={idx} className="space-y-1">
          <Label>Position {idx + 1}</Label>
          <Select value={val} onValueChange={(v) => {
            const next = [...positions];
            next[idx] = v;
            setPositions(next);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Select player" />
            </SelectTrigger>
            <SelectContent>
              {(playersQuery.data ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  #{p.number} {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
      <div className="space-y-1">
        <Label>Libero</Label>
        <Select value={liberoId} onValueChange={setLiberoId}>
          <SelectTrigger>
            <SelectValue placeholder="Select libero" />
          </SelectTrigger>
          <SelectContent>
            {(playersQuery.data ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                #{p.number} {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        onClick={() => setRotationMutation.mutate()}
        disabled={!validForm || setRotationMutation.isPending}
      >
        {setRotationMutation.isPending ? "Saving..." : "Save rotation"}
      </Button>
    </div>
  );

  const renderRotationState = () => {
    if (rotationStateQuery.isLoading) return <Skeleton className="h-20" />;
    if (rotationStateQuery.error) return <Alert variant="destructive">Rotation state unavailable</Alert>;
    const state = rotationStateQuery.data?.teamA?.teamId === teamId
      ? rotationStateQuery.data.teamA
      : rotationStateQuery.data?.teamB?.teamId === teamId
        ? rotationStateQuery.data.teamB
        : null;
    if (!state) return <Alert variant="destructive">Rotation state missing for team</Alert>;
    return (
      <div className="text-sm grid grid-cols-3 gap-2">
        {state.positions.map((pid: string, idx: number) => (
          <div key={idx} className="rounded border p-2">
            <div className="text-xs text-muted-foreground">Pos {idx + 1}</div>
            <div className="font-medium">{pid === state.liberoId ? "Libero" : pid}</div>
          </div>
        ))}
        <div className="col-span-3 text-xs text-muted-foreground">Server starts at position 1.</div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Starting rotation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {playersQuery.isLoading ? (
          <Skeleton className="h-24" />
        ) : playersQuery.error ? (
          <Alert variant="destructive">Failed to load players: {playersQuery.error.message}</Alert>
        ) : hasRotation ? (
          <div className="space-y-4">
            <Alert variant="default">
              Starting rotation set. Server is position 1; libero off the court at serve.
            </Alert>
            {renderRotationState()}
          </div>
        ) : (
          renderForm()
        )}
      </CardContent>
    </Card>
  );
}
