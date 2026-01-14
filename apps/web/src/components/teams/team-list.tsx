"use client";

import { useMemo, type JSX } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/utils/trpc";
import { CreateTeamDialog } from "./create-team-dialog";
import { TeamCard } from "./team-card";
import { Skeleton } from "@repo/ui/components/base/skeleton";
import { Alert } from "@repo/ui/components/base/alert";

export function TeamList(): JSX.Element {
  const trpc = useTRPC();
  const listQueryOptions = useMemo(() => trpc.team.list.queryOptions(), [trpc]);
  const teamsQuery = useQuery(listQueryOptions);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teams</h1>
          <p className="text-muted-foreground">Manage your teams and see their matches and players.</p>
        </div>
        <CreateTeamDialog />
      </div>

      {teamsQuery.isLoading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={idx} className="h-32" />
          ))}
        </div>
      ) : teamsQuery.error ? (
        <Alert variant="destructive">Failed to load teams: {teamsQuery.error.message}</Alert>
      ) : teamsQuery.data && teamsQuery.data.length > 0 ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {teamsQuery.data.map((team) => (
            <TeamCard key={team.id} id={team.id} name={team.name} division={team.division} />
          ))}
        </div>
      ) : (
        <div className="rounded border p-6 text-center text-muted-foreground">
          No teams yet. Create one to get started.
        </div>
      )}
    </div>
  );
}
