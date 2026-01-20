import {
  Column, CreateDateColumn, Entity, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn, JoinColumn, RelationId } from "typeorm";
import { Match } from "./match.entity.js";
import type { Team } from "./team.entity.js";

@Entity()
export class Set {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne("Match", "sets")
  match: Match;

  @ManyToOne("Team", { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "initial_serving_team_id" })
  initialServingTeam?: Team | null;

  @RelationId((set: Set) => set.initialServingTeam)
  initialServingTeamId?: string | null;

  @Column()
  key: number;

  @Column()
  pointsA: number;

  @Column()
  pointsB: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
