import {
  Column, CreateDateColumn, Entity, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Match } from "./match.entity.js";

@Entity()
export class Set {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne("Match", "sets")
  match: Match;

  @Column()
  pointsA: number;

  @Column()
  pointsB: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
