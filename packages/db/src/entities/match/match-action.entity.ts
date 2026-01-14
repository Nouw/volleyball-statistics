import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from "typeorm";
import type { Match } from "./match.entity.js";
import type { Set } from "./set.entity.js";
import type { Team } from "./team.entity.js";
import type { Player } from "./player.entity.js";
import { MatchAction as MatchActionEnum } from "@repo/constants";

@Entity("match_actions")
@Index("idx_match_actions_set_sequence", ["set", "sequence"], { unique: true })
export class MatchAction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne("Match", { onDelete: "CASCADE" })
  @JoinColumn({ name: "match_id" })
  match: Match;

  @RelationId((action: MatchAction) => action.match)
  matchId: string;

  @ManyToOne("Set", { onDelete: "CASCADE" })
  @JoinColumn({ name: "set_id" })
  set: Set;

  @RelationId((action: MatchAction) => action.set)
  setId: string;

  @ManyToOne("Team")
  @JoinColumn({ name: "team_id" })
  team: Team;

  @RelationId((action: MatchAction) => action.team)
  teamId: string;

  @ManyToOne("Player")
  @JoinColumn({ name: "player_id" })
  player: Player;

  @RelationId((action: MatchAction) => action.player)
  playerId: string;

  @Column({ type: "enum", enum: MatchActionEnum })
  actionType: MatchActionEnum;

  @Column({ type: "varchar", length: 40 })
  outcome: string;

  @Column({ type: "integer" })
  pointDelta: number;

  @Column({ type: "integer" })
  sequence: number;

  @Column({ type: "integer" })
  rally: number;

  @Column({ type: "timestamptz" })
  occurredAt: Date;

  @Column({ type: "jsonb", nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
