"use client";

import { type JSX } from "react";
import { TeamList } from "@/components/teams/team-list";

export default function TeamsPage(): JSX.Element {
  return (
    <div className="container mx-auto px-4 py-8">
      <TeamList />
    </div>
  );
}
