"use client";

import Link from "next/link";
import { useMemo, type JSX } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@repo/ui/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/base/tabs";

export type TabKey = "total" | "set1" | "set2" | "set3" | "set4" | "set5";

interface MatchTabsProps {
  matchId: string;
  sets: Array<{ id: string; pointsA: number; pointsB: number; order?: number }>;
  activeTab: TabKey;
}

export function MatchTabs({ matchId, sets, activeTab }: MatchTabsProps): JSX.Element {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabs = useMemo(() => {
    const orderedSets = [...sets].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const setIds = orderedSets.map((s) => s.id);
    return [
      { key: "total" as TabKey, label: "Total", setId: null },
      { key: "set1" as TabKey, label: "Set 1", setId: setIds[0] ?? null },
      { key: "set2" as TabKey, label: "Set 2", setId: setIds[1] ?? null },
      { key: "set3" as TabKey, label: "Set 3", setId: setIds[2] ?? null },
      { key: "set4" as TabKey, label: "Set 4", setId: setIds[3] ?? null },
      { key: "set5" as TabKey, label: "Set 5", setId: setIds[4] ?? null },
    ];
  }, [sets]);

  const buildHref = (key: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", key);
    return `${pathname}?${params.toString()}`;
  };

  return (
    <Tabs value={activeTab} className="w-full">
      <TabsList className="w-full justify-start overflow-x-auto">
        {tabs.map((tab) => {
          const disabled = !tab.setId && tab.key !== "total";
          const content = disabled ? (
            <span aria-disabled className="cursor-not-allowed opacity-50">
              {tab.label}
            </span>
          ) : (
            <Link href={buildHref(tab.key)} scroll={false}>
              {tab.label}
            </Link>
          );

          return (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              asChild
              className={cn(disabled ? "opacity-50 cursor-not-allowed" : "")}
              disabled={disabled}
            >
              {content}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
