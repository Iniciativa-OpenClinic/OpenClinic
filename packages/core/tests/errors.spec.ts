import { describe, it, expect } from 'vitest';
import {
  ErrorCode,
  SuccessCode,
  getErrorMessage,
  getSuccessMessage,
  formatTemplate,
  AppError,
  AccessDeniedError,
  ValidationError,
  SupportedLocales,
  errorMessagesPtBr,
  errorMessagesEnUs,
  successMessagesPtBr,
  successMessagesEnUs,
} from '../src/errors/index.js';

describe('@openclinic/core - Errors and Messages', () => {
  it('should interpolate template parameters in formatTemplate', () => {
    const tmpl = 'Usuário {name} ({username}) foi excluído.';
    const result = formatTemplate(tmpl, { name: 'Carlos', username: 'dr.carlos' });
    expect(result).toBe('Usuário Carlos (dr.carlos) foi excluído.');
  });

  it('should return default error message in pt-BR and en-US', () => {
    const msgPt = getErrorMessage(ErrorCode.USER_CANNOT_DEACTIVATE_SELF, SupportedLocales.PT_BR);
    expect(msgPt).toBe('Você não pode desativar sua própria conta de usuário.');

    const msgEn = getErrorMessage(ErrorCode.USER_CANNOT_DEACTIVATE_SELF, SupportedLocales.EN_US);
    expect(msgEn).toBe('You cannot deactivate your own user account.');
  });

  it('should return interpolated success message in pt-BR and en-US', () => {
    const msgPt = getSuccessMessage(SuccessCode.USER_DELETED, SupportedLocales.PT_BR, { name: 'Carlos', username: 'carlos1' });
    expect(msgPt).toBe('Usuário Carlos (carlos1) foi excluído com sucesso.');

    const msgEn = getSuccessMessage(SuccessCode.USER_DELETED, SupportedLocales.EN_US, { name: 'Carlos', username: 'carlos1' });
    expect(msgEn).toBe('User Carlos (carlos1) was deleted successfully.');
  });

  it('should create ProblemDetail structure from AppError with code and details', () => {
    const error = new AccessDeniedError(ErrorCode.OWNER_IMMUTABLE);
    const problem = error.toProblemDetail('/api/v1/iam/users/123', SupportedLocales.PT_BR);
    expect(problem.status).toBe(403);
    expect(problem.code).toBe(ErrorCode.OWNER_IMMUTABLE);
    expect(problem.detail).toContain('Administradores');

    const problemEn = error.toProblemDetail('/api/v1/iam/users/123', SupportedLocales.EN_US);
    expect(problemEn.detail).toContain('Administrators');
  });

  it('should instantiate ValidationError using ErrorCode and resolve catalog message', () => {
    const error = new ValidationError('new_password', ErrorCode.PASSWORD_TOO_SHORT);
    expect(error.code).toBe(ErrorCode.PASSWORD_TOO_SHORT);
    expect(error.statusCode).toBe(422);
    expect(error.message).toBe('A senha deve conter no mínimo 8 caracteres.');
  });

  it('should maintain parity between pt-BR and en-US error catalogs', () => {
    const ptKeys = Object.keys(errorMessagesPtBr).sort();
    const enKeys = Object.keys(errorMessagesEnUs).sort();
    expect(enKeys).toEqual(ptKeys);
  });

  it('should maintain parity between pt-BR and en-US success catalogs', () => {
    const ptKeys = Object.keys(successMessagesPtBr).sort();
    const enKeys = Object.keys(successMessagesEnUs).sort();
    expect(enKeys).toEqual(ptKeys);
  });
});
