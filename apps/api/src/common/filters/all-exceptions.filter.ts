import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ApiErrorBody } from '../types/api-error-body';

const STATUS_LABEL: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'Bad Request',
  [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
  [HttpStatus.FORBIDDEN]: 'Forbidden',
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.CONFLICT]: 'Conflict',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, error, message } = this.normalize(exception);

    const body: ApiErrorBody = {
      statusCode,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(body);
  }

  private normalize(exception: unknown): {
    statusCode: number;
    error: string;
    message: string | string[];
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const payload = exception.getResponse();
      let message: string | string[] = exception.message;
      let error =
        STATUS_LABEL[statusCode] ?? HttpStatus[statusCode] ?? 'Error';

      if (typeof payload === 'string') {
        message = payload;
      } else if (typeof payload === 'object' && payload !== null) {
        const record = payload as Record<string, unknown>;
        if (record.message !== undefined) {
          message = record.message as string | string[];
        }
        if (typeof record.error === 'string') {
          error = record.error;
        }
      }

      return { statusCode, error, message };
    }

    const isProd = process.env.NODE_ENV === 'production';
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: isProd
        ? 'Unexpected error'
        : exception instanceof Error
          ? exception.message
          : 'Unexpected error',
    };
  }
}
