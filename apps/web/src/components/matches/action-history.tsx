import { MatchAction, formatMatchActionLabel } from "@repo/constants/match/match-action";
import { Skeleton } from "@repo/ui/components/base/skeleton";
import { Alert } from "@repo/ui/components/base/alert";
import { cn } from "@repo/ui/lib/utils";
import { Button } from "@repo/ui/components/base/button";
import { Trash } from 'lucide-react';

interface ActionHistoryProps {
  isLoading: boolean,
  error: boolean,
  actions: {
    id: string
    matchId: string
    setId: string
    teamId: string
    playerId: string
    actionType: MatchAction
    outcome: string
    pointDelta: number
    sequence: number
    rally: number
    occurredAt: Date
    metadata: Record<string, unknown> | null | undefined
  }[],
  playerLabelMap: Map<string, string>
  removeAction: (actionId: string) => void
}

export function ActionHistory({ isLoading, error, actions, playerLabelMap, removeAction }: ActionHistoryProps) {
  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold text-muted-foreground">Recent actions</h4>
      {isLoading ? (
        <Skeleton className="h-16" />
      ) : error ? (
        <Alert variant="destructive">Failed to load actions</Alert>
      ) : actions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No actions yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {actions.map((a, key) => (
            <div key={a.id} className="rounded border p-2 flex flex-row gap-2">
              <div className={
                cn("flex w-8 h-8 rounded flex-col items-center justify-center", a.pointDelta > 0 && "bg-green-500", a.pointDelta < 0 && "bg-red-500")}>
                {a.pointDelta}
              </div>
              <div className="text-sm">
                <div className="font-medium">{formatMatchActionLabel(a.actionType as MatchAction)}</div>
                <div className="text-xs text-muted-foreground">Player: {playerLabelMap.get(a.playerId) ?? a.playerId}</div>
              </div>
              {key === 0 &&
                <div className="ml-auto">
                  <Button variant="outline" onClick={() => removeAction(a.id)}><Trash/></Button>
                </div>
              }
            </div>

          ))}
        </div>
      )}
    </div>
  )

}
