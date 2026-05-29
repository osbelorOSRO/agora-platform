import {
  ConflictException,
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, error } = this.resolveResponse(exception);

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${statusCode} ${error}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(statusCode).json({
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private resolveResponse(exception: unknown): {
    statusCode: number;
    message: string;
    error: string;
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        return { statusCode, message: body, error: exception.name };
      }

      if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        const message = Array.isArray(b['message'])
          ? (b['message'] as string[]).join(', ')
          : String(b['message'] ?? exception.message);
        const error = String(b['error'] ?? exception.name);
        return { statusCode, message, error };
      }
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2025') {
        return this.resolveResponse(
          new NotFoundException('Recurso no encontrado'),
        );
      }
      if (exception.code === 'P2002') {
        return this.resolveResponse(
          new ConflictException('Ya existe un registro con esos datos'),
        );
      }
      if (exception.code === 'P2003') {
        return this.resolveResponse(
          new ConflictException(
            'Referencia inválida: el registro relacionado no existe',
          ),
        );
      }
      if (exception.code === 'P2014') {
        return this.resolveResponse(
          new ConflictException('La relación requerida no puede eliminarse'),
        );
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'InternalServerError',
    };
  }
}
