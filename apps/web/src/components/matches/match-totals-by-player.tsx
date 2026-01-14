"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC, useTRPCClient } from "@/utils/trpc";
import { Alert } from "@repo/ui/components/base/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/base/card";
import { Skeleton } from "@repo/ui/components/base/skeleton";
import { PlayerSummary } from "./on-court-players-card";

interface MatchTotalsByPlayerProps {
  matchId: string;
  teamId: string;
  playerLabelMap?: Map<string, string>;
}

export function MatchTotalsByPlayer({ matchId, teamId }: MatchTotalsByPlayerProps) {
  return null
}
