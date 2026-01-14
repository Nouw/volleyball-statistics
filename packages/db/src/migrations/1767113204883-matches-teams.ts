import { MigrationInterface, QueryRunner } from "typeorm";

export class MatchesTeams1767113204883 implements MigrationInterface {
    name = 'MatchesTeams1767113204883'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "matches" DROP CONSTRAINT "FK_matches_team"`);
        await queryRunner.query(`ALTER TABLE "players" DROP CONSTRAINT "FK_players_team"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_matches_teamId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_teams_ownerClerkId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_teams_owner_name"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_players_team_number"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_players_teamId"`);
        await queryRunner.query(`CREATE TABLE "set" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "pointsA" integer NOT NULL, "pointsB" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "matchId" uuid, CONSTRAINT "PK_3a80144a9f862484a2cae876eed" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "match_actions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "actionType" character varying(40) NOT NULL, "outcome" character varying(40) NOT NULL, "pointDelta" integer NOT NULL, "sequence" integer NOT NULL, "rally" integer NOT NULL, "occurredAt" TIMESTAMP WITH TIME ZONE NOT NULL, "metadata" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "match_id" uuid, "set_id" uuid, "team_id" uuid, "player_id" uuid, CONSTRAINT "PK_9edd80de8691bddd410c35be760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_match_actions_set_sequence" ON "match_actions" ("set_id", "sequence") `);
        await queryRunner.query(`CREATE TABLE "player_match_stats" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "actions" integer NOT NULL DEFAULT '0', "scoringActions" integer NOT NULL DEFAULT '0', "penalties" integer NOT NULL DEFAULT '0', "byType" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "match_id" uuid, "player_id" uuid, CONSTRAINT "PK_cf2fe7890ba767722ceffde385e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_player_match_stats_match_player" ON "player_match_stats" ("match_id", "player_id") `);
        await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "teamId"`);
        await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "opponentName"`);
        await queryRunner.query(`ALTER TABLE "teams" DROP COLUMN "location"`);
        await queryRunner.query(`ALTER TABLE "teams" DROP COLUMN "coach"`);
        await queryRunner.query(`ALTER TABLE "teams" DROP COLUMN "record"`);
        await queryRunner.query(`ALTER TABLE "matches" ADD "team_a_id" uuid`);
        await queryRunner.query(`ALTER TABLE "matches" ADD "team_b_id" uuid`);
        await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "matches" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "matches" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "players" DROP COLUMN "role"`);
        await queryRunner.query(`CREATE TYPE "public"."players_role_enum" AS ENUM('libero', 'setter', 'middle', 'opposite', 'outside')`);
        await queryRunner.query(`ALTER TABLE "players" ADD "role" "public"."players_role_enum"`);
        await queryRunner.query(`CREATE INDEX "IDX_54615806d01aad60840124277b" ON "teams" ("ownerClerkId", "name") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_bf0a00c7273091567a859e6590" ON "players" ("teamId", "number") `);
        await queryRunner.query(`ALTER TABLE "matches" ADD CONSTRAINT "FK_c5caba0d9067235c580741625c9" FOREIGN KEY ("team_a_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "matches" ADD CONSTRAINT "FK_6c3a2afae31b7dce9ac46a61dd0" FOREIGN KEY ("team_b_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "set" ADD CONSTRAINT "FK_441d9ee8ea5058281bf248afbd3" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "players" ADD CONSTRAINT "FK_ecaf0c4aabc76f1a3d1a91ea33c" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "match_actions" ADD CONSTRAINT "FK_15211b1b6fc7cd35381be1816d8" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "match_actions" ADD CONSTRAINT "FK_a8eba4fc369651bfbf47ca4afc5" FOREIGN KEY ("set_id") REFERENCES "set"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "match_actions" ADD CONSTRAINT "FK_63fabad65abba1da260d4db2522" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "match_actions" ADD CONSTRAINT "FK_87c53f0c98259aec4fdefb68fad" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "player_match_stats" ADD CONSTRAINT "FK_c674e1a9f65d2b39195ffeab644" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "player_match_stats" ADD CONSTRAINT "FK_34339080b4cfba3a9134c6b0ce9" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "player_match_stats" DROP CONSTRAINT "FK_34339080b4cfba3a9134c6b0ce9"`);
        await queryRunner.query(`ALTER TABLE "player_match_stats" DROP CONSTRAINT "FK_c674e1a9f65d2b39195ffeab644"`);
        await queryRunner.query(`ALTER TABLE "match_actions" DROP CONSTRAINT "FK_87c53f0c98259aec4fdefb68fad"`);
        await queryRunner.query(`ALTER TABLE "match_actions" DROP CONSTRAINT "FK_63fabad65abba1da260d4db2522"`);
        await queryRunner.query(`ALTER TABLE "match_actions" DROP CONSTRAINT "FK_a8eba4fc369651bfbf47ca4afc5"`);
        await queryRunner.query(`ALTER TABLE "match_actions" DROP CONSTRAINT "FK_15211b1b6fc7cd35381be1816d8"`);
        await queryRunner.query(`ALTER TABLE "players" DROP CONSTRAINT "FK_ecaf0c4aabc76f1a3d1a91ea33c"`);
        await queryRunner.query(`ALTER TABLE "set" DROP CONSTRAINT "FK_441d9ee8ea5058281bf248afbd3"`);
        await queryRunner.query(`ALTER TABLE "matches" DROP CONSTRAINT "FK_6c3a2afae31b7dce9ac46a61dd0"`);
        await queryRunner.query(`ALTER TABLE "matches" DROP CONSTRAINT "FK_c5caba0d9067235c580741625c9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bf0a00c7273091567a859e6590"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_54615806d01aad60840124277b"`);
        await queryRunner.query(`ALTER TABLE "players" DROP COLUMN "role"`);
        await queryRunner.query(`DROP TYPE "public"."players_role_enum"`);
        await queryRunner.query(`ALTER TABLE "players" ADD "role" character varying(30)`);
        await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "matches" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "matches" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "team_b_id"`);
        await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "team_a_id"`);
        await queryRunner.query(`ALTER TABLE "teams" ADD "record" character varying(50)`);
        await queryRunner.query(`ALTER TABLE "teams" ADD "coach" character varying(120)`);
        await queryRunner.query(`ALTER TABLE "teams" ADD "location" character varying(120)`);
        await queryRunner.query(`ALTER TABLE "matches" ADD "opponentName" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "matches" ADD "teamId" uuid NOT NULL`);
        await queryRunner.query(`DROP INDEX "public"."idx_player_match_stats_match_player"`);
        await queryRunner.query(`DROP TABLE "player_match_stats"`);
        await queryRunner.query(`DROP INDEX "public"."idx_match_actions_set_sequence"`);
        await queryRunner.query(`DROP TABLE "match_actions"`);
        await queryRunner.query(`DROP TABLE "set"`);
        await queryRunner.query(`CREATE INDEX "IDX_players_teamId" ON "players" ("teamId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_players_team_number" ON "players" ("number", "teamId") `);
        await queryRunner.query(`CREATE INDEX "IDX_teams_owner_name" ON "teams" ("name", "ownerClerkId") `);
        await queryRunner.query(`CREATE INDEX "IDX_teams_ownerClerkId" ON "teams" ("ownerClerkId") `);
        await queryRunner.query(`CREATE INDEX "IDX_matches_teamId" ON "matches" ("teamId") `);
        await queryRunner.query(`ALTER TABLE "players" ADD CONSTRAINT "FK_players_team" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "matches" ADD CONSTRAINT "FK_matches_team" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
