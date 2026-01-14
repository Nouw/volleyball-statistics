import { AddPlayerHandler } from "./commands/handlers/add-player.handler.js";
import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { DatabaseModule } from "@repo/db";

const commandHandlers = [
  AddPlayerHandler
]

@Module({
  imports: [CqrsModule, DatabaseModule.forFeature()],
  providers: [...commandHandlers]
})
export class TeamModule {}
