import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // ── Prisma Errors ──────────────────────────────────────────────────────
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        response.status(HttpStatus.CONFLICT).json({
          success: false,
          message: 'Data sudah digunakan',
          statusCode: HttpStatus.CONFLICT,
        });
        return;
      }

      if (exception.code === 'P2025') {
        response.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: 'Data tidak ditemukan',
          statusCode: HttpStatus.NOT_FOUND,
        });
        return;
      }
    }

    // ── HTTP Exceptions (NestJS built-in + manual throw) ───────────────────
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let message: string;

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const body = exceptionResponse as Record<string, unknown>;

        // ValidationPipe menghasilkan { message: string[] }
        if (Array.isArray(body.message)) {
          message = (body.message as string[])[0];
        } else if (typeof body.message === 'string') {
          message = body.message;
        } else {
          message = exception.message;
        }
      } else {
        message = exception.message;
      }

      response.status(statusCode).json({
        success: false,
        message,
        statusCode,
      });
      return;
    }

    // ── Unknown / Unhandled Errors ─────────────────────────────────────────
    console.error('Unhandled exception:', exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
}