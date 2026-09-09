export { hashPassword, verifyPassword, hashToken, timingSafeEqual } from './crypto/index.js';
export { createAccessToken, createRefreshToken, decodeToken } from './jwt/index.js';
export type { TokenPayload, JwtConfig } from './jwt/index.js';
export {
  getErrorMessage,
  getSuccessMessage,
  formatTemplate,
  ErrorMessages,
  SuccessMessages,
  AppError,
  DomainError,
  AuthenticationError,
  AccessDeniedError,
  EntityNotFoundError,
  EntityAlreadyExistsError,
  ValidationError,
  BruteForceError,
  ErrorCode,
  SuccessCode,
} from './errors/index.js';
export type { ProblemDetail, ErrorCodeValue, SuccessCodeValue } from './errors/index.js';
export {
  SupportedLocales,
  DEFAULT_LOCALE,
  type SupportedLocale,
  LOCALE_METADATA,
  type LocaleMetadata,
  getLocaleMetadata,
} from './domain/locales.js';
export {
  UserRole,
  type UserRoleType,
  ROLE_HIERARCHY,
  ResourceAction,
  type ResourceActionType,
  PermissionEffect,
  type PermissionEffectType,
  AuditStatus,
  type AuditStatusType,
  TenantStatus,
  type TenantStatusType,
  AlertBannerType,
  type AlertBannerTypeType,
  NotificationType,
  type NotificationTypeType,
  ResourceType,
  type ResourceTypeType,
  ApplicationContext,
  type ApplicationContextType,
  PermissionTargetType,
  type PermissionTargetTypeType,
  LoginIdentifierType,
  type LoginIdentifierTypeType,
} from './domain/enums.js';
export type {
  IAMCapabilityDTO,
  ApplicationPermissionSyncItemDTO,
  ApplicationPermissionSyncDTO,
  NavigationMenuItemDTO,
  NavigationMenuGroupDTO,
} from './domain/iam.dtos.js';
export type {
  PatientGender,
  PatientDTO,
  CreatePatientDTO,
  PractitionerType,
  PractitionerDTO,
  CreatePractitionerDTO,
  EncounterStatus,
  EncounterDTO,
  EncounterSummaryDTO,
  CreateEncounterDTO,
  HealthPlanDTO,
  ProcedureDTO,
} from './domain/clinical.dtos.js';
export {
  APP_RESOURCE_MANIFEST,
  type ResourceManifestItem,
  type AppResourceCode,
  type AppSectionCode,
} from './domain/resources.manifest.js';
export type { BaseEntity, RepositoryInterface } from './domain/entities.js';
export {
  ValueObject,
  Cpf,
  Cns,
  Cnpj,
  Cnes,
  Cep,
  Phone,
  Email,
  BirthDate,
  Uf,
  BRAZILIAN_UFS,
  BRAZILIAN_UF_NAMES,
  type BrazilianUfCode,
  type BrazilianRegion,
  Rg,
  Username,
  Name,
  HashedPassword,
  PasswordPolicy,
  type PasswordValidationResult,
  Country,
  type CountryCode,
  STANDARD_COUNTRIES,
  type CountryOption,
} from './domain/value-objects/index.js';
export * as shared from './shared/index.js';
export { createLogger, logger } from './logger/index.js';
export type { LogLevel, LoggerConfig, Logger } from './logger/index.js';
export { createPool, withTransaction } from './database/index.js';
export type { DbConfig, Pool, PoolClient } from './database/index.js';
