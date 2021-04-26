import { Injectable } from "@nestjs/common";
import * as crypto from "crypto";

const HMAC_SECRET = process.env.HMAC_SECRET;

@Injectable()
export class CryptoService {
  constructor() {
    if (!HMAC_SECRET) throw new Error("HMAC_SECRET not set");
  }

  sign(data: string) {
    return crypto.createHmac("sha256", HMAC_SECRET).update(data).digest("hex");
  }

  verify(data: string, hmac: string) {
    return this.sign(data) === hmac;
  }

  hash(hash: string, str: string) {
    return crypto.createHash(hash).update(str).digest("hex");
  }
}
