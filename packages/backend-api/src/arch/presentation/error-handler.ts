import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { AppError, ErrorCode, getErrorMessage, logger, SupportedLocales, type SupportedLocale, type ProblemDetail } from '@openclinic/core';
import { ZodError } from 'zod';

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply): void {
  const acceptLang = request.headers['accept-language'] ?? '';
  const locale = acceptLang.includes('en') ? SupportedLocales.EN_US : SupportedLocales.PT_BR;

  const errObj = error as unknown as Record<string, unknown>;

  if (error instanceof AppError || (typeof errObj === 'object' && errObj !== null && typeof errObj['toProblemDetail'] === 'function')) {
    const problemDetail = typeof errObj?.['toProblemDetail'] === 'function'
      ? (errObj['toProblemDetail'] as (url: string, locale: SupportedLocale) => ProblemDetail)(request.url, locale)
      : (error as AppError).toProblemDetail(request.url, locale);
    reply.status(problemDetail.status).send(problemDetail);
    return;
  }

  if (error instanceof ZodError) {
    reply.status(422).send({
      type: `urn:openclinic:error:${ErrorCode.VALIDATION_ERROR.toLowerCase().replace(/_/g, '-')}`,
      title: 'ValidationError',
      status: 422,
      code: ErrorCode.VALIDATION_ERROR,
      detail: getErrorMessage(ErrorCode.VALIDATION_ERROR, locale),
      instance: request.url,
      errors: error.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
    return;
  }

  // Handle Fastify JSON parsing errors, bad content, or client 4xx errors
  const isSyntaxOrParseError = error.name === 'SyntaxError' || errObj.code === 'FST_ERR_CTP_INVALID_CONTENT';
  const rawStatus = typeof errObj.statusCode === 'number' ? errObj.statusCode : null;
  const statusCode = isSyntaxOrParseError ? 400 : (rawStatus !== null && rawStatus >= 400 && rawStatus < 500) ? rawStatus : null;

  if (statusCode) {
    const errorCode = statusCode === 400 ? ErrorCode.VALIDATION_ERROR : (errObj.code || ErrorCode.INTERNAL_ERROR);
    reply.status(statusCode).send({
      type: `urn:openclinic:error:${String(errorCode).toLowerCase().replace(/_/g, '-')}`,
      title: error.name || 'BadRequestError',
      status: statusCode,
      code: errorCode,
      detail: isSyntaxOrParseError ? 'Malformed JSON request payload' : (error.message || getErrorMessage(ErrorCode.VALIDATION_ERROR, locale)),
      instance: request.url,
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
    instance: request.url,
  });
}
