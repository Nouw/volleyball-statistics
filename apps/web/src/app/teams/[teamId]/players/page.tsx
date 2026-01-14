"use client";

import { type JSX, useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/utils/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/base/card";
import { Skeleton } from "@repo/ui/components/base/skeleton";
import { Alert } from "@repo/ui/components/base/alert";

export default function TeamPlayersPage(): JSX.Element {
  const { teamId } = useParams<{ teamId: string }>();
  const trpc = useTRPC();
  const playersOptions = useMemo(
    () => trpc.team.players.queryOptions({ teamId }),
    [trpc, teamId],
  );
  const playersQuery = useQuery(playersOptions);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Players</h1>
        <p className="text-muted-foreground">Roster for this team.</p>
      </div>

      {playersQuery.isLoading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={idx} className="h-24" />
          ))}
        </div>
      ) : playersQuery.error ? (
        <Alert variant="destructive">Failed to load players: {playersQuery.error.message}</Alert>
      ) : playersQuery.data && playersQuery.data.length > 0 ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {playersQuery.data.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{p.name}</span>
                  <span className="text-sm text-muted-foreground">#{p.number}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground capitalize">{p.role ?? "player"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded border p-6 text-center text-muted-foreground">No players yet.</div>
      )}
    </div>
  );
}
