"use client";

import Link from "next/link";
import { type JSX } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/base/card";
import { Button } from "@repo/ui/components/base/button";

export interface TeamCardProps {
  id: string;
  name: string;
  division: string | null;
}

export function TeamCard({ id, name, division }: TeamCardProps): JSX.Element {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex flex-col gap-1">
          <span>{name}</span>
          {division ? (
            <span className="text-sm text-muted-foreground">{division}</span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="mt-auto flex gap-3">
        <Button asChild variant="outline" className="flex-1">
          <Link href={`/teams/${id}/matches`}>Matches</Link>
        </Button>
        <Button asChild variant="solid" color="secondary" className="flex-1">
          <Link href={`/teams/${id}/players`}>Players</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
