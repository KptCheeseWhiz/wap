import { All, Controller, Next, Req, Res } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { createProxyMiddleware, RequestHandler } from "http-proxy-middleware";

@Controller()
export class ProxyController {
  private _proxy: RequestHandler;

  constructor() {
    if (process.env.NODE_ENV !== "development")
      throw new Error("Only include me when in development mode");
    this._proxy = createProxyMiddleware({
      // The development frontend server should be running at this address
      target: "http://localhost:4999",
      ws: true,
      changeOrigin: true,
      logLevel: "silent",
    });
  }

  @All()
  serve(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    return this._proxy(req, res, next);
  }
}
