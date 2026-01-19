import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { Match } from "./match.entity.js";
import { Player } from "./player.entity.js";

@Entity("teams")
@Index(["ownerClerkId", "name"], { unique: false })
export class Team {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("varchar", { length: 150 })
  name: string;

  @Column("varchar", { length: 120, nullable: true })
  division: string | null;

  @Column("varchar", { length: 255 })
  ownerClerkId: string;

  @OneToMany("Match", "teamA")
  homeMatches: Match[];

  @OneToMany("Match", "teamB")
  awayMatches: Match[];

  @OneToMany("Player", "team")
  players: Player[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
