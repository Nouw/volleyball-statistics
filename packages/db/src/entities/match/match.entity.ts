import {
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Set } from "./set.entity.js";
import type { Team } from "./team.entity.js";

@Entity("matches")
export class Match {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne("Team", { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_a_id" })
  teamA: Team;

  @RelationId((match: Match) => match.teamA)
  teamAId: string;

  @ManyToOne("Team", { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_b_id" })
  teamB: Team;

  @RelationId((match: Match) => match.teamB)
  teamBId: string;

  @OneToMany("Set", "match")
  sets: Set[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
