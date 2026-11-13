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
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'Payload Too Large',
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
    if (this.isUploadTooLarge(exception)) {
      return {
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        error: 'Payload Too Large',
        message: 'Foto deve ter no máximo 5 MB.',
      };
    }

    if (this.isBodyTooLarge(exception)) {
      return {
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        error: 'Payload Too Large',
        message: 'Corpo da requisição excede o limite permitido.',
      };
    }

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

  private isUploadTooLarge(exception: unknown): boolean {
    if (!exception || typeof exception !== 'object') {
      return false;
    }
    const record = exception as Record<string, unknown>;
    if (record.code === 'LIMIT_FILE_SIZE') {
      return true;
    }
    if (record.name === 'MulterError' && record.code === 'LIMIT_FILE_SIZE') {
      return true;
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const payloadMessage =
        typeof payload === 'string'
          ? payload
          : typeof payload === 'object' && payload !== null && 'message' in payload
            ? String((payload as { message: unknown }).message)
            : '';
      const text = `${exception.message} ${payloadMessage}`;
      if (
        status === HttpStatus.PAYLOAD_TOO_LARGE &&
        text.includes('File too large')
      ) {
        return true;
      }
    }
    return (
      typeof record.message === 'string' && record.message === 'File too large'
    );
  }

  /** body-parser (JSON/urlencoded) rejeita o corpo com `type: 'entity.too.large'`. */
  private isBodyTooLarge(exception: unknown): boolean {
    if (!exception || typeof exception !== 'object') {
      return false;
    }
    const record = exception as Record<string, unknown>;
    return (
      record.type === 'entity.too.large' ||
      (record.statusCode === HttpStatus.PAYLOAD_TOO_LARGE &&
        record.expose !== undefined)
    );
  }
}
