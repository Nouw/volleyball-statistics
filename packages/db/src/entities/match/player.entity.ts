import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { Team } from "./team.entity.js";

enum PlayerRole {
  LIBERO = "libero",
  SETTER = "setter",
  MIDDLE = "middle",
  OPPOSITE = "opposite",
  OUTSIDE = "outside",
}

@Entity("players")
@Index(["teamId", "number"], { unique: true })
export class Player {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("varchar", { length: 150 })
  name: string;

  @Column("integer")
  number: number;

  @Column("enum", { enum: PlayerRole, nullable: true })
  role: PlayerRole

  @Column("uuid")
  teamId: string;

  @ManyToOne("Team", "players", {
    onDelete: "CASCADE",
  })
  team: Team;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
