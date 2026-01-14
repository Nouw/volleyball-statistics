import { MigrationInterface, QueryRunner } from "typeorm";

export class SetAddKey1767195220117 implements MigrationInterface {
    name = 'SetAddKey1767195220117'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "set" ADD "key" integer NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "set" DROP COLUMN "key"`);
    }

}
