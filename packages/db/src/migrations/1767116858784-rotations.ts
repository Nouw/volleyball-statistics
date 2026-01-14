import { MigrationInterface, QueryRunner } from "typeorm";

export class Rotations1767116858784 implements MigrationInterface {
    name = 'Rotations1767116858784'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "set_starting_rotations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "set_id" uuid, "team_id" uuid, "position1_player_id" uuid, "position2_player_id" uuid, "position3_player_id" uuid, "position4_player_id" uuid, "position5_player_id" uuid, "position6_player_id" uuid, "libero_player_id" uuid, CONSTRAINT "PK_637996ea73876aa510746a78b09" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_set_starting_rotations_set_team" ON "set_starting_rotations" ("set_id", "team_id") `);
        await queryRunner.query(`ALTER TABLE "match_actions" DROP COLUMN "actionType"`);
        await queryRunner.query(`CREATE TYPE "public"."match_actions_actiontype_enum" AS ENUM('inRally.overPassInPlay', 'inRally.oneServe', 'inRally.twoServe', 'inRally.threeServe', 'inRally.dig', 'inRally.hitStillInPlay', 'inRally.blockStillInPlay', 'earned.ace', 'earned.spike', 'earned.tip', 'earned.dump', 'earned.downBallHit', 'earned.block', 'earned.assist', 'error.serve', 'error.spike', 'error.tip', 'error.dump', 'error.downBallHit', 'error.block', 'error.whoseBall', 'error.receive', 'error.dig', 'error.set', 'error.freeBallReceive', 'error.secondBallReturn', 'error.thirdBallReturn', 'fault.net', 'fault.ballHandling', 'fault.under', 'fault.overTheNet', 'fault.footFault', 'fault.outOfRotation', 'fault.backRowAttack')`);
        await queryRunner.query(`ALTER TABLE "match_actions" ADD "actionType" "public"."match_actions_actiontype_enum" NOT NULL`);
        await queryRunner.query(`ALTER TABLE "set_starting_rotations" ADD CONSTRAINT "FK_6cb780e104192e4b759d8dcd9ea" FOREIGN KEY ("set_id") REFERENCES "set"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "set_starting_rotations" ADD CONSTRAINT "FK_0c79b5d7969d1aba33167afda6f" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "set_starting_rotations" ADD CONSTRAINT "FK_8e7355699a44acfe0af4c07c7cc" FOREIGN KEY ("position1_player_id") REFERENCES "players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "set_starting_rotations" ADD CONSTRAINT "FK_c2b22a4ebdf4dc4e57b0c0a7d47" FOREIGN KEY ("position2_player_id") REFERENCES "players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "set_starting_rotations" ADD CONSTRAINT "FK_61ffb416330ab992b5af915d04d" FOREIGN KEY ("position3_player_id") REFERENCES "players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "set_starting_rotations" ADD CONSTRAINT "FK_6a710e63438eccf72f54b740f2a" FOREIGN KEY ("position4_player_id") REFERENCES "players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "set_starting_rotations" ADD CONSTRAINT "FK_6f6e12988598234a92d0e882717" FOREIGN KEY ("position5_player_id") REFERENCES "players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "set_starting_rotations" ADD CONSTRAINT "FK_7bf9aec6cc2f8cb8468df7181b9" FOREIGN KEY ("position6_player_id") REFERENCES "players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "set_starting_rotations" ADD CONSTRAINT "FK_c4df2847acb866c8561fe3644c6" FOREIGN KEY ("libero_player_id") REFERENCES "players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "set_starting_rotations" DROP CONSTRAINT "FK_c4df2847acb866c8561fe3644c6"`);
        await queryRunner.query(`ALTER TABLE "set_starting_rotations" DROP CONSTRAINT "FK_7bf9aec6cc2f8cb8468df7181b9"`);
        await queryRunner.query(`ALTER TABLE "set_starting_rotations" DROP CONSTRAINT "FK_6f6e12988598234a92d0e882717"`);
        await queryRunner.query(`ALTER TABLE "set_starting_rotations" DROP CONSTRAINT "FK_6a710e63438eccf72f54b740f2a"`);
        await queryRunner.query(`ALTER TABLE "set_starting_rotations" DROP CONSTRAINT "FK_61ffb416330ab992b5af915d04d"`);
        await queryRunner.query(`ALTER TABLE "set_starting_rotations" DROP CONSTRAINT "FK_c2b22a4ebdf4dc4e57b0c0a7d47"`);
        await queryRunner.query(`ALTER TABLE "set_starting_rotations" DROP CONSTRAINT "FK_8e7355699a44acfe0af4c07c7cc"`);
        await queryRunner.query(`ALTER TABLE "set_starting_rotations" DROP CONSTRAINT "FK_0c79b5d7969d1aba33167afda6f"`);
        await queryRunner.query(`ALTER TABLE "set_starting_rotations" DROP CONSTRAINT "FK_6cb780e104192e4b759d8dcd9ea"`);
        await queryRunner.query(`ALTER TABLE "match_actions" DROP COLUMN "actionType"`);
        await queryRunner.query(`DROP TYPE "public"."match_actions_actiontype_enum"`);
        await queryRunner.query(`ALTER TABLE "match_actions" ADD "actionType" character varying(40) NOT NULL`);
        await queryRunner.query(`DROP INDEX "public"."idx_set_starting_rotations_set_team"`);
        await queryRunner.query(`DROP TABLE "set_starting_rotations"`);
    }

}
