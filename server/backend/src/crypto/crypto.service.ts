import { Injectable } from "@nestjs/common";
import * as crypto from "crypto";

@Injectable()
export class CryptoService {
  private _HMAC_SECRET: string;

  constructor() {
    this._HMAC_SECRET = process.env.HMAC_SECRET;
    if (!this._HMAC_SECRET) throw new Error("HMAC_SECRET not set");
  }

  sign(data: string) {
    return crypto
      .createHmac("sha256", this._HMAC_SECRET)
      .update(data)
      .digest("hex");
  }

  verify(data: string, hmac: string) {
    return this.sign(data) === hmac;
  }

  hash(hash: string, str: string) {
    return crypto.createHash(hash).update(str).digest("hex");
  }
}
