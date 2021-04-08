import { Controller, Get } from "@nestjs/common";

@Controller("/api")
export class AppController {
  @Get("ping")
  pong() {
    return { pong: Date.now() };
  }
}
