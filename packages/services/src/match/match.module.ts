import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { DatabaseModule } from "@repo/db";
import { RecordActionHandler } from "./commands/record-action.handler.js";
import { ActionRecordedProjectionHandler } from "./events/action-recorded-projection.handler.js";

const commandHandlers = [RecordActionHandler];
const eventHandlers = [ActionRecordedProjectionHandler];

@Module({
  imports: [CqrsModule, DatabaseModule.forFeature()],
  providers: [...commandHandlers, ...eventHandlers],
})
export class MatchModule {}
