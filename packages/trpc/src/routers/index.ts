import { Injectable } from "@nestjs/common";
import { t } from "./base/index.js";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { BasicRouter } from "./routers/basic.router.js";
import { AuthRouter } from "./routers/auth.router.js";
import { ChatRoomRouter } from "./routers/chatroom.router.js";
import { MatchRouter } from "./routers/match.router.js";
import { TeamRouter } from "./routers/team.router.js";

/**
 * Static tRPC router that combines all sub-routers
 */
@Injectable()
export class AppRouterClass {
  constructor(
    private readonly basicRouter: BasicRouter,
    private readonly authRouter: AuthRouter,
    private readonly chatRoomRouter: ChatRoomRouter,
    private readonly matchRouter: MatchRouter,
    private readonly teamRouter: TeamRouter,
  ) {}

  public createRouter() {
    // Combine the routers
    return t.router({
      // Merge the basic router at the root level
      ...this.basicRouter.router._def.record,
      // Nest the auth router under 'auth'
      auth: this.authRouter.router,
      // Nest the chatRoom router under 'chatroom'
      chatroom: this.chatRoomRouter.router,
      match: this.matchRouter.router,
      team: this.teamRouter.router,
    });
  }

  public get router() {
    return this.createRouter();
  }
}

// Export type information for client usage
export type AppRouter = ReturnType<AppRouterClass["createRouter"]>;
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
