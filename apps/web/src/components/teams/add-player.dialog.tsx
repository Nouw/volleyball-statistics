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

interface AddPlayerDialogProps {
  onCreated?: () => void;
  teamId: string;
}

export function AddPlayerDialog({ teamId, onCreated }: AddPlayerDialogProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [playerNumber, setPlayerNumber] = useState(0);
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();

  const listPlayersQueryKey = trpc.team.players.queryOptions({ teamId }).queryKey;

  const addPlayer = useMutation({
    mutationFn: async () =>
      trpcClient.team.addPlayer.mutate({ teamId, name, number: playerNumber }),
    onSuccess: async () => {
      setOpen(false);
      setName("");
      setPlayerNumber(0);
      await queryClient.invalidateQueries({ queryKey: listPlayersQueryKey });
      onCreated?.();
    },
  });

  const disabled = !name.trim() || addPlayer.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Player</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Player</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="team-name">Player name</Label>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Thunderbolts"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-division">Player number</Label>
            <Input
              id="team-division"
              value={playerNumber}
              inputMode="numeric"
              onChange={(e) => setPlayerNumber(parseInt(e.target.value))}
              placeholder="e.g. Division 1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => addPlayer.mutate()}
            disabled={disabled}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
