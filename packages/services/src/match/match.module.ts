import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { DatabaseModule } from "@repo/db";
import { RecordActionHandler } from "./commands/record-action.handler.js";
import { DeleteActionHandler } from "./commands/delete-action.handler.js";
import { DeleteStartingRotationHandler } from "./commands/delete-starting-rotation.handler.js";
import { ActionRecordedProjectionHandler } from "./events/action-recorded-projection.handler.js";
import { ActionDeletedProjectionHandler } from "./events/action-deleted-projection.handler.js";
import { SetStartingRotationHandler } from "./commands/set-starting-rotation.handler.js";
import { GetRotationStateHandler } from "./queries/get-rotation-state.handler.js";
import { GetStartingRotationHandler } from "./queries/get-starting-rotation.handler.js";

const commandHandlers = [RecordActionHandler, DeleteActionHandler, SetStartingRotationHandler, DeleteStartingRotationHandler];
const eventHandlers = [ActionRecordedProjectionHandler, ActionDeletedProjectionHandler];
const queryHandlers = [GetRotationStateHandler, GetStartingRotationHandler];

@Module({
  imports: [CqrsModule, DatabaseModule.forFeature()],
  providers: [...commandHandlers, ...eventHandlers, ...queryHandlers],
})
export class MatchModule {}
