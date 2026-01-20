import { Button } from "@repo/ui/components/base/button";
import { useQueryClient } from "@tanstack/react-query";
import { useTRPC, useTRPCClient } from "../../utils/trpc";

interface PlayersCourtProps {
  teamAId: string;
  teamBId: string;
}

export function PlayersCourt({ teamAId, teamBId } : PlayersCourtProps) {
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  const playersAKey = trpc.team.players.queryOptions({ teamId: teamAId }).queryKey;
  const playersBKey = trpc.team.players.queryOptions({ teamId: teamBId }).queryKey;

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-row">
        <div className="flex flex-col border">
          <div className="flex flex-row">
            <div className="flex size-16 justify-center items-center border-r border-dashed">
              <Button>5</Button>
            </div>
            <div className="flex size-16 justify-center items-center">
              <Button>4</Button>
            </div>
          </div>
          <div className="flex flex-row">
            <div className="flex size-16 justify-center items-center border-r border-dashed">
              <Button>6</Button>
            </div>
            <div className="flex size-16 justify-center items-center">
              <Button>3</Button>
            </div>
          </div>
          <div className="flex flex-row">
            <div className="flex size-16 justify-center items-center border-r border-dashed">
              <Button>1</Button>
            </div>
            <div className="flex size-16 justify-center items-center">
              <Button>2</Button>
            </div>
          </div>
        </div>
        <div className="flex flex-col border">
          <div className="flex flex-row max-w-fit">
            <div className="flex size-16 justify-center items-center border-r border-dashed">
              <Button>2</Button>
            </div>
            <div className="flex size-16 justify-center items-center">
              <Button>1</Button>
            </div>
          </div>
          <div className="flex flex-row max-w-fit">
            <div className="flex size-16 justify-center items-center border-r border-dashed">
              <Button>3</Button>
            </div>
            <div className="flex size-16 justify-center items-center">
              <Button>6</Button>
            </div>
          </div>
          <div className="flex flex-row max-w-fit">
            <div className="flex size-16 justify-center items-center border-r border-dashed">
              <Button>4</Button>
            </div>
            <div className="flex size-16 justify-center items-center">
              <Button>5</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
