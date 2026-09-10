import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { AppError, ErrorCode, getErrorMessage, logger, SupportedLocales } from '@openclinic/core';
import { ZodError } from 'zod';

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply): void {
  const acceptLang = request.headers['accept-language'] ?? '';
  const locale = acceptLang.includes('en') ? SupportedLocales.EN_US : SupportedLocales.PT_BR;

  const errObj = error as any;
  if (error instanceof AppError || typeof errObj?.toProblemDetail === 'function' || (errObj?.statusCode && errObj?.code)) {
    const statusCode = errObj.statusCode ?? 500;
    const problemDetail = typeof errObj?.toProblemDetail === 'function'
      ? errObj.toProblemDetail(request.url, locale)
      : {
          type: `urn:openclinic:error:${String(errObj.code || ErrorCode.INTERNAL_ERROR).toLowerCase().replace(/_/g, '-')}`,
          title: errObj.name || 'AppError',
          status: statusCode,
          code: errObj.code || ErrorCode.INTERNAL_ERROR,
          detail: errObj.message || getErrorMessage(errObj.code || ErrorCode.INTERNAL_ERROR, locale),
          instance: request.url,
          details: errObj.details,
        };
    reply.status(statusCode).send(problemDetail);
    return;
  }

  if (error instanceof ZodError) {
    reply.status(422).send({
      type: `urn:openclinic:error:${ErrorCode.VALIDATION_ERROR.toLowerCase().replace(/_/g, '-')}`,
      title: 'ValidationError',
      status: 422,
      code: ErrorCode.VALIDATION_ERROR,
      detail: getErrorMessage(ErrorCode.VALIDATION_ERROR, locale),
      errors: error.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
    return;
  }

  logger.error({ err: error, url: request.url, method: request.method }, 'Unhandled server error');

  reply.status(500).send({
    type: `urn:openclinic:error:${ErrorCode.INTERNAL_ERROR.toLowerCase().replace(/_/g, '-')}`,
    title: 'InternalServerError',
    status: 500,
    code: ErrorCode.INTERNAL_ERROR,
    detail: getErrorMessage(ErrorCode.INTERNAL_ERROR, locale),
  });
}
