"use client";

import { useState, type JSX } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@repo/ui/components/base/input";
import { Label } from "@repo/ui/components/base/label";

interface CreateTeamDialogProps {
  onCreated?: () => void;
}

export function CreateTeamDialog({ onCreated }: CreateTeamDialogProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [division, setDivision] = useState("");
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();

  const listTeamsQueryKey = trpc.team.list.queryOptions().queryKey;

  const createTeam = useMutation({
    mutationFn: async () =>
      trpcClient.team.create.mutate({ name, division: division || null }),
    onSuccess: async () => {
      setOpen(false);
      setName("");
      setDivision("");
      await queryClient.invalidateQueries({ queryKey: listTeamsQueryKey });
      onCreated?.();
    },
  });

  const disabled = !name.trim() || createTeam.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Team</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a team</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="team-name">Team name</Label>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Thunderbolts"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-division">Division (optional)</Label>
            <Input
              id="team-division"
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              placeholder="e.g. Division 1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => createTeam.mutate()}
            disabled={disabled}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
