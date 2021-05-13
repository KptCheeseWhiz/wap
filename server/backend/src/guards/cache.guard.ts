import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";

@Injectable()
export class CacheGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request: Request = http.getRequest();
    const response: Response = http.getResponse();
    if (
      request.headers["if-none-match"] ||
      request.headers["if-match"] ||
      request.headers["if-modified-since"] ||
      request.headers["if-unmodified-since"]
    )
      throw new HttpException("Not modified", HttpStatus.NOT_MODIFIED);
    response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return true;
  }
}
