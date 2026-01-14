import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from "typeorm";
import type { Set } from "./set.entity.js";
import type { Team } from "./team.entity.js";
import type { Player } from "./player.entity.js";

@Entity("set_starting_rotations")
@Index("idx_set_starting_rotations_set_team", ["set", "team"], { unique: true })
export class SetStartingRotation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne("Set", { onDelete: "CASCADE" })
  @JoinColumn({ name: "set_id" })
  set: Set;

  @RelationId((rotation: SetStartingRotation) => rotation.set)
  setId: string;

  @ManyToOne("Team", { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team: Team;

  @RelationId((rotation: SetStartingRotation) => rotation.team)
  teamId: string;

  @ManyToOne("Player")
  @JoinColumn({ name: "position1_player_id" })
  position1: Player;
  @RelationId((rotation: SetStartingRotation) => rotation.position1)
  position1Id: string;

  @ManyToOne("Player")
  @JoinColumn({ name: "position2_player_id" })
  position2: Player;
  @RelationId((rotation: SetStartingRotation) => rotation.position2)
  position2Id: string;

  @ManyToOne("Player")
  @JoinColumn({ name: "position3_player_id" })
  position3: Player;
  @RelationId((rotation: SetStartingRotation) => rotation.position3)
  position3Id: string;

  @ManyToOne("Player")
  @JoinColumn({ name: "position4_player_id" })
  position4: Player;
  @RelationId((rotation: SetStartingRotation) => rotation.position4)
  position4Id: string;

  @ManyToOne("Player")
  @JoinColumn({ name: "position5_player_id" })
  position5: Player;
  @RelationId((rotation: SetStartingRotation) => rotation.position5)
  position5Id: string;

  @ManyToOne("Player")
  @JoinColumn({ name: "position6_player_id" })
  position6: Player;
  @RelationId((rotation: SetStartingRotation) => rotation.position6)
  position6Id: string;

  @ManyToOne("Player")
  @JoinColumn({ name: "libero_player_id" })
  libero: Player;
  @RelationId((rotation: SetStartingRotation) => rotation.libero)
  liberoId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
