"use client";

import { useMemo, useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC, useTRPCClient } from "@/utils/trpc";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/base/dialog";
import { Button } from "@repo/ui/components/base/button";
import { Label } from "@repo/ui/components/base/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/base/select";
import { Alert } from "@repo/ui/components/base/alert";

interface CreateMatchDialogProps {
  teamId: string;
}

export function CreateMatchDialog({ teamId }: CreateMatchDialogProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  const listTeamsOptions = useMemo(() => trpc.team.list.queryOptions(), [trpc]);
  const listTeamsQuery = useQuery(listTeamsOptions);

  const matchListKey = useMemo(
    () => trpc.match.listByTeam.queryOptions({ teamId }).queryKey,
    [trpc, teamId],
  );

  const createMatch = useMutation({
    mutationFn: async () => {
      if (!opponentId) throw new Error("Select an opponent team");
      return trpcClient.match.create.mutate({ teamAId: teamId, teamBId: opponentId });
    },
    onSuccess: async () => {
      setOpen(false);
      setOpponentId(null);
      await queryClient.invalidateQueries({ queryKey: matchListKey });
    },
  });

  const teams = listTeamsQuery.data?.filter((t) => t.id !== teamId) ?? [];
  const disableCreate = !opponentId || createMatch.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Match</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a match</DialogTitle>
        </DialogHeader>

        {listTeamsQuery.error ? (
          <Alert variant="destructive">Failed to load teams: {listTeamsQuery.error.message}</Alert>
        ) : (
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="opponent">Opponent team</Label>
              <Select onValueChange={setOpponentId} value={opponentId ?? undefined}>
                <SelectTrigger id="opponent">
                  <SelectValue placeholder="Select opponent" />
                </SelectTrigger>
                <SelectContent>
                  {teams.length === 0 ? (
                    <SelectItem value="" disabled>
                      No other teams available
                    </SelectItem>
                  ) : (
                    teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                        {t.division ? ` • ${t.division}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={() => createMatch.mutate()}
            disabled={disableCreate || teams.length === 0 || !!listTeamsQuery.error}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
