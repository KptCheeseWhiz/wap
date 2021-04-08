import {
  HttpException,
  HttpStatus,
  Injectable,
  NestMiddleware,
} from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

@Injectable()
export class QueryStringParserMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.query.payload || typeof req.query.payload !== "string")
        throw new Error();

      const str = decodeURIComponent(
        Buffer.from(req.query.payload, "base64").toString("utf-8"),
      );
      if (str.indexOf("__proto__") !== -1) throw new Error();

      req.query = JSON.parse(str);
      next();
    } catch (e) {
      throw new HttpException("Invalid payload", HttpStatus.BAD_REQUEST);
    }
  }
}
