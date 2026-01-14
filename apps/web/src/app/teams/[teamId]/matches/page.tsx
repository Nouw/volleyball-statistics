"use client";

import { type JSX, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/utils/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/base/card";
import { Alert } from "@repo/ui/components/base/alert";
import { Skeleton } from "@repo/ui/components/base/skeleton";
import { CreateMatchDialog } from "@/components/matches/create-match-dialog";

export default function TeamMatchesPage(): JSX.Element {
  const { teamId } = useParams<{ teamId: string }>();
  const trpc = useTRPC();
  const listMatchesOptions = useMemo(
    () => trpc.match.listByTeam.queryOptions({ teamId }),
    [trpc, teamId],
  );
  const matchesQuery = useQuery(listMatchesOptions);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Matches</h1>
          <p className="text-muted-foreground">Matches for this team.</p>
        </div>
        <CreateMatchDialog teamId={teamId} />
      </div>

      {matchesQuery.isLoading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={idx} className="h-28" />
          ))}
        </div>
      ) : matchesQuery.error ? (
        <Alert variant="destructive">Failed to load matches: {matchesQuery.error.message}</Alert>
      ) : matchesQuery.data && matchesQuery.data.length > 0 ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {matchesQuery.data.map((m) => (
            <Card key={m.id}>
              <CardHeader>
                <CardTitle>{m.teamAName ?? "Team A"} vs {m.teamBName ?? "Team B"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{new Date(m.createdAt).toLocaleString()}</span>
                  <Link href={`/teams/${teamId}/matches/${m.id}`} className="text-primary hover:underline">
                    View match
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded border p-6 text-center text-muted-foreground">
          No matches yet.
        </div>
      )}
    </div>
  );
}
