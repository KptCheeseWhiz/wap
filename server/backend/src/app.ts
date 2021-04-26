import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";

import { AppModule } from "@/app/app.module";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";

export default async (host: string, port: number) => {
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          scriptSrc: [
            `'self'`,
            process.env.NODE_ENV === "development"
              ? `'unsafe-inline'`
              : `'sha256-YF2l82GO3HhwICRG1sbwEwrGFP6wtVup77eNGHGSycE='`,
          ],
          styleSrc: [
            `'self'`,
            `'unsafe-inline'`,
            "https://fonts.googleapis.com",
          ],
          fontSrc: [`'self'`, "https://fonts.gstatic.com"],
          imgSrc: [`'self'`, "data:", "https://cdn.myanimelist.net"],
          connectSrc: [
            `'self'`,
            "https://api.jikan.moe",
            "https://cdn.myanimelist.net",
            "https://cdn.plyr.io",
          ],
          workerSrc: [`'self'`, "https:"],
          mediaSrc: [`'self'`, "https://cdn.plyr.io"],
          frameSrc: [`'self'`],
          objectSrc: [`'none'`],
        },
      },
      frameguard: { action: "DENY" },
      referrerPolicy: { policy: "no-referrer" },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      disableErrorMessages: process.env.NODE_ENV !== "development",
      whitelist: true,
      forbidUnknownValues: true,
      transform: true,
    }),
  );

  await app.listen(port, host);
  return app;
};
