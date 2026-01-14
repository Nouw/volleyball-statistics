import type { JSX } from "react";
import { Button, type ButtonProps } from "@repo/ui/components/base/button";
import { cn } from "@repo/ui/lib/utils";

interface MatchButtonProps extends ButtonProps {
  text: string;
  selected?: boolean;
  badge?: string;
}

export function MatchButton({ text, selected = false, badge, className, ...rest }: MatchButtonProps): JSX.Element {
  return (
    <Button
      {...rest}
      type="button"
      size="sm"
      className={cn(
        "relative flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border py-3 text-center",
        selected ? "border-primary/80 bg-secondary " : "border-muted",
        className,
      )}
    >
      {badge ? (
        <span className="absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground shadow-sm">
          {badge}
        </span>
      ) : null}
      <p className="text-wrap text-sm font-medium leading-tight">{text}</p>
    </Button>
  );
}
