import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    if (exception instanceof HttpException) status = exception.getStatus();
    else if (typeof exception === "string") exception = new Error(exception);

    response.status(status).json({
      name: exception.name,
      message: exception.message,
      status,
      ...(process.env.NODE_ENV === "development"
        ? { stack: exception.stack }
        : {}),
    });
  }
}
