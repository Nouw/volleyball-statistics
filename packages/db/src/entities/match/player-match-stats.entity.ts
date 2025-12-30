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
import type { Player } from "./player.entity.js";

export interface StatsActionBreakdown {
  attempts: number;
  successes: number;
  penalties: number;
  lastOutcome?: string;
}

export type StatsByType = Record<string, StatsActionBreakdown>;

@Entity("player_match_stats")
@Index("idx_player_match_stats_match_player", ["match", "player"], { unique: true })
export class PlayerMatchStats {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne("Match", { onDelete: "CASCADE" })
  @JoinColumn({ name: "match_id" })
  match: Match;

  @RelationId((stats: PlayerMatchStats) => stats.match)
  matchId: string;

  @ManyToOne("Player", { onDelete: "CASCADE" })
  @JoinColumn({ name: "player_id" })
  player: Player;

  @RelationId((stats: PlayerMatchStats) => stats.player)
  playerId: string;

  @Column({ type: "integer", default: 0 })
  actions: number;

  @Column({ type: "integer", default: 0 })
  scoringActions: number;

  @Column({ type: "integer", default: 0 })
  penalties: number;

  @Column({ type: "jsonb", default: () => "'{}'" })
  byType: StatsByType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
