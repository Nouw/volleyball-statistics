"use client";

import { type JSX, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/utils/trpc";
import { Alert } from "@repo/ui/components/base/alert";
import { Skeleton } from "@repo/ui/components/base/skeleton";
import { MatchTabs } from "@/components/matches/match-tabs";
import { RotationField } from "../../../../../components/matches/rotation-field";
import { OnCourtPlayersCard } from "../../../../../components/matches/on-court-players-card";
import type { RouterOutputs } from "@repo/trpc";
import { useTRPCClient } from "../../../../../utils/trpc";
import { StatsCard } from "../../../../../components/matches/stats/stats-card";


const VALID_TABS = ["total", "set1", "set2", "set3", "set4", "set5"] as const;
type TabKey = (typeof VALID_TABS)[number];

export default function MatchDetailPage(): JSX.Element {
  const { matchId, teamId } = useParams<{ matchId: string; teamId: string }>();
  const searchParams = useSearchParams();
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();

  const activeTab: TabKey = useMemo(() => {
    const fromUrl = searchParams.get("tab")?.toLowerCase();
    return VALID_TABS.includes(fromUrl as TabKey) ? (fromUrl as TabKey) : "total";
  }, [searchParams]);

  const scoreQuery = useQuery<RouterOutputs["match"]["getSets"]>({
      queryKey: trpc.match.getSets.queryOptions({ matchId }).queryKey,
    queryFn: () => trpcClient.match.getSets.query({ matchId }),
    }
  );

  const sets: { id: string, pointsA: number, pointsB: number, matchId: string, order: number }[]  = scoreQuery.data ?? [];
  const activeSetIndex = activeTab === "total" ? -1 : VALID_TABS.indexOf(activeTab) - 1;
  const activeSet = activeTab === "total" ? null : sets.find((set: { order: number; }) => set.order === activeSetIndex) || null;
  const setIds = sets.sort((a, b) => a.order - b.order).map((set) => set.id);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Match</h1>
          <p className="text-muted-foreground">Tabs are synced with the URL (?tab=).</p>
        </div>
      </div>

      {scoreQuery.isLoading ? (
        <Skeleton className="h-10 w-full" />
      ) : scoreQuery.error ? (
        <Alert variant="destructive">Failed to load sets: {scoreQuery.error.message}</Alert>
      ) : (
        <MatchTabs matchId={matchId} sets={sets} activeTab={activeTab} />
      )}

      {activeTab === "total" ? (
        <StatsCard teamId={teamId} matchId={matchId} setIds={setIds} />
      ) : activeSet ? (
        <div className="space-y-4">
          <RotationField teamId={teamId} setId={activeSet.id} showDelete={activeSet.pointsA === 0 && activeSet.pointsB === 0} />
          <OnCourtPlayersCard teamId={teamId} setId={activeSet.id} matchId={matchId} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select a set tab to manage rotations.</p>
      )}


    </div>
  );
}
