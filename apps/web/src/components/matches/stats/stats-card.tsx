import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/base/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/base/table";
import { useTRPC, useTRPCClient } from "../../../utils/trpc";
import { useQuery } from "@tanstack/react-query";
import type { RouterOutputs } from "@repo/trpc";
import { Skeleton } from "@repo/ui/components/base/skeleton";
import { PlayerStats } from "@repo/services";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/base/select";
import { useState } from "react";
import { Separator } from "@repo/ui/components/base/separator";

interface StatsCardProps {
  matchId: string;
  teamId: string;
  setIds: string[];
}

export function StatsCard({ matchId, teamId, setIds }: StatsCardProps) {
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const getMatchStatsKey = trpc.match.getMatchStats.queryOptions({ matchId, teamId }).queryKey;
  const matchStats = useQuery<RouterOutputs["match"]["getMatchStats"]>({
      queryKey: getMatchStatsKey,
      queryFn: () => trpcClient.match.getMatchStats.query({ matchId, teamId }),
    }
  );

  const statsKeys = ["total", "set1", "set2", "set3", "set4", "set5"];

  const [selectStats, setSelectStats] = useState<string>("total");

  const getStatsKey = trpc.match.getSetStats.queryOptions({ matchId, teamId, setId: setIds[statsKeys.indexOf(selectStats) - 1] }).queryKey;

  const setStats = useQuery<RouterOutputs["match"]["getSetStats"]>({
    queryKey: selectStats !== "total" ? getStatsKey : ["match.getSetStats", "disabled"],
    queryFn: () => trpcClient.match.getSetStats.query({ matchId, teamId, setId: setIds[statsKeys.indexOf(selectStats) - 1] }),
    enabled: selectStats !== "total",
  })

  if (matchStats.isLoading || setStats.isLoading) {
    return <Skeleton className="h-24" />;
  }

  if (matchStats.error) {
    return <div>Failed to load stats: {matchStats.error.message}</div>;
  }

  if (setStats.error) {
    return <div>Failed to load stats: {setStats.error.message}</div>;
  }

  function formatStat(a: number, b: number, inverse = false) {
    if (b === 0) return "0%";

    const value = (a / b) * 100;

    let color = "text-black-500";
    if (inverse) {
      if (value >= 30) color = "text-red-500";
      if (value >= 10) color = "text-yellow-500";
      if (value < 10) color = "text-green-500";
    } else {
      if (value >= 30) color = "text-green-500";
      if (value >= 10) color = "text-yellow-500";
      if (value < 10) color = "text-red-500";
    }


    return <p className={color}>{value} %</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Match stats</CardTitle>
      </CardHeader>
      <CardContent>
        <Select onValueChange={setSelectStats} value={selectStats || undefined}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statsKeys.map((key) => (
              <SelectItem key={key} value={key}>
                {key}
              </SelectItem>
            ))}

          </SelectContent>
        </Select>
        <Separator className="my-4"/>
        <Table>
          <TableCaption>Static sample data</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead className="border-l">Total</TableHead>
              <TableHead className="border-r"></TableHead>
              <TableHead className="border-l">Attack</TableHead>
              <TableHead></TableHead>
              <TableHead className="border-r"></TableHead>
              <TableHead className="border-l">Block</TableHead>
              <TableHead></TableHead>
              <TableHead className="border-r"></TableHead>
              <TableHead className="border-l">Receive</TableHead>
              <TableHead></TableHead>
              <TableHead></TableHead>
              <TableHead></TableHead>
              <TableHead className="border-r"></TableHead>
            </TableRow>
            <TableRow>
              <TableHead className="border">Name</TableHead>
              <TableHead className="border">+</TableHead>
              <TableHead className="border">-</TableHead>
              <TableHead className="border">=</TableHead>
              <TableHead className="border">+</TableHead>
              <TableHead className="border">-</TableHead>
              <TableHead className="border">=</TableHead>
              <TableHead className="border">+</TableHead>
              <TableHead className="border">-</TableHead>
              <TableHead className="border">=</TableHead>
              <TableHead className="border">-</TableHead>
              <TableHead className="border">3</TableHead>
              <TableHead className="border">2</TableHead>
              <TableHead className="border">1</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(selectStats === 'total' ? matchStats.data : setStats.data).map((row: PlayerStats) => (
              <TableRow key={row.id}>
                <TableCell className="w-[180px] whitespace-normal break-words">{row.name}</TableCell>
                <TableCell className="border w-[5px]">{row.scored}</TableCell>
                <TableCell className="border w-[5px]">{row.errors}</TableCell>
                <TableCell className="border w-[5px]">{row.attack.total}</TableCell>
                <TableCell className="border w-[5px]">{formatStat(row.attack.scored, row.attack.total)}</TableCell>
                <TableCell className="border w-[5px]">{formatStat(row.attack.errors, row.attack.total, true)}</TableCell>
                <TableCell className="border w-[5px]">{row.block.total}</TableCell>
                <TableCell className="border w-[5px]">{formatStat(row.block.scored, row.block.total)}</TableCell>
                <TableCell className="border w-[5px]">{formatStat(row.block.errors, row.block.total, true)}</TableCell>
                <TableCell className="border w-[5px]">{row.receive.total}</TableCell>
                <TableCell className="border w-[5px]">{formatStat(row.receive.errors, row.receive.total, true)}</TableCell>
                <TableCell className="border w-[5px]">{formatStat(row.receive.threeReceive, row.receive.total)}</TableCell>
                <TableCell className="border w-[5px]">{formatStat(row.receive.twoReceive, row.receive.total)}</TableCell>
                <TableCell className="border w-[5px]">{formatStat(row.receive.oneReceive, row.receive.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
