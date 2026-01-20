import { MigrationInterface, QueryRunner } from "typeorm";

export class SetInitialServingTeam1768060000000 implements MigrationInterface {
    name = 'SetInitialServingTeam1768060000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "set" ADD "initial_serving_team_id" uuid`);
        await queryRunner.query(`ALTER TABLE "set" ADD CONSTRAINT "FK_set_initial_serving_team" FOREIGN KEY ("initial_serving_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "set" DROP CONSTRAINT "FK_set_initial_serving_team"`);
        await queryRunner.query(`ALTER TABLE "set" DROP COLUMN "initial_serving_team_id"`);
    }
}
