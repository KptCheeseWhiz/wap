import { Logger } from "@nestjs/common";

class EnvLogger extends Logger {
  constructor(private ctx?: string | string) {
    super("", true);
  }

  private static logger_map: { [key: string]: EnvLogger } = {};
  static getInstance(ctx: Context | string = Context.DEFAULT) {
    if (this.logger_map[ctx]) return this.logger_map[ctx];
    return (this.logger_map[ctx] = new this(ctx));
  }

  log(message: string) {
    super.log(message, this.ctx);
  }

  error(message: string, trace: string) {
    super.error(message, trace, this.ctx);
  }

  warn(message: string) {
    super.warn(message, this.ctx);
  }

  debug(message: string) {
    super.debug(message, this.ctx);
  }

  verbose(message: string) {
    super.verbose(message, this.ctx);
  }

  getTimestamp() {
    return new Date().toISOString();
  }
}

export enum Context {
  DEFAULT = "",
  REQUEST = "Request",
  TORRENT = "Torrent",
  SERVER = "Server",
}

export default (ctx?: Context | string): EnvLogger =>
  EnvLogger.getInstance(ctx);
