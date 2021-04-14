import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request } from "express";

@Injectable()
export class CacheGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request: Request = context.switchToHttp().getRequest();
    if (
      request.headers["if-none-match"] ||
      request.headers["if-match"] ||
      request.headers["if-modified-since"] ||
      request.headers["if-unmodified-since"]
    )
      throw new HttpException("Not modified", HttpStatus.NOT_MODIFIED);
    return true;
  }
}
