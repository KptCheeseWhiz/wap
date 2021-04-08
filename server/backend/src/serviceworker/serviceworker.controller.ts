import { Controller, Get, Header } from "@nestjs/common";

import { ServiceWorkerService } from "./serviceworker.service";

@Controller()
export class ServiceWorkerController {
  constructor(private serviceWorkerService: ServiceWorkerService) {}

  @Get("/service-worker.js")
  @Header("Content-Type", "text/javascript")
  @Header("Pragma", "no-cache")
  @Header("Cache-Control", "no-cache, no-store, must-revalidate")
  @Header("Expires", "0")
  async serviceWorker() {
    return await this.serviceWorkerService.generate();
  }
}
