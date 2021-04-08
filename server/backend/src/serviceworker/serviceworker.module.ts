import { Module } from "@nestjs/common";

import { ServiceWorkerService } from "./serviceworker.service";
import { ServiceWorkerController } from "./serviceworker.controller";

@Module({
  providers: [ServiceWorkerService],
  controllers: [ServiceWorkerController],
})
export class ServiceWorkerModule {}
