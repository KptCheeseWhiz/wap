import { config as dotenv_config } from "dotenv";
if (!process.versions.electron) dotenv_config();

import bootstrap from "./app";

import Logger, { Context } from "@/common/logger.helper";

bootstrap(process.env.HOST || "0.0.0.0", +process.env.PORT)
  .then((app) => app.getUrl())
  .then((url) => Logger(Context.SERVER).log(`Listening on ${url}`));
