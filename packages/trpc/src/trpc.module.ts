import { Module } from "@nestjs/common";
import { TRPCService } from "./trpc.service.js";
import { TRPCPanelController } from "./trpc-panel.controller.js";
import { AuthService } from "@repo/services";
import { AppRouterClass } from "./routers/index.js";
import { BasicRouter } from "./routers/routers/basic.router.js";
import { AuthRouter } from "./routers/routers/auth.router.js";
import { ChatRoomRouter } from "./routers/routers/chatroom.router.js";
import { MatchRouter } from "./routers/routers/match.router.js";
import { TeamRouter } from "./routers/routers/team.router.js";
import { ConfigModule } from "@nestjs/config";
import { PostHogModule } from "@repo/analytics";
import { DatabaseModule } from "@repo/db";
import { CqrsModule } from "@nestjs/cqrs";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PostHogModule,
    DatabaseModule.forFeature(),
    CqrsModule,
  ],
  providers: [
    TRPCService,
    AppRouterClass,
    BasicRouter,
    AuthRouter,
    ChatRoomRouter,
    MatchRouter,
    TeamRouter,
    AuthService,
  ],
  exports: [TRPCService],
  controllers: [TRPCPanelController],
})
export class TRPCModule {}
