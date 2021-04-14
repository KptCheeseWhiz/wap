import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from "@nestjs/common";

import { CryptoService } from "@/crypto/crypto.service";

@Injectable()
export class MagnetSignGuard implements CanActivate {
  constructor(private cryptoService: CryptoService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const data = request.query.magnet;
    const hmac = request.query.sig;

    if (
      typeof data !== "string" ||
      typeof hmac !== "string" ||
      !this.cryptoService.verify(data, hmac)
    )
      throw new HttpException("Invalid URL", HttpStatus.BAD_REQUEST);

    return true;
  }
}
