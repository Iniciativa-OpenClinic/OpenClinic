export { hashPassword, verifyPassword, hashToken, timingSafeEqual } from './crypto/index.js';
export { createAccessToken, createRefreshToken, decodeToken } from './jwt/index.js';
export type { TokenPayload, JwtConfig } from './jwt/index.js';
export {
  AppError,
  DomainError,
  AuthenticationError,
  AccessDeniedError,
  EntityNotFoundError,
  EntityAlreadyExistsError,
  ValidationError,
  BruteForceError,
  ErrorCode,
} from './errors/index.js';
export type { ProblemDetail, ErrorCodeValue } from './errors/index.js';

export {
  SuccessCode,
  type SuccessCodeValue,
  getErrorMessage,
  getSuccessMessage,
  formatTemplate,
  catalogs,
  localePtBr,
  localeEnUs,
} from './i18n/index.js';
export {
  SupportedLocales,
  DEFAULT_LOCALE,
  type SupportedLocale,
  LOCALE_METADATA,
  type LocaleMetadata,
  getLocaleMetadata,
} from './domain/locales.js';
export {
  AUTH_SECURITY_DEFAULTS,
  type AuthSecurityDefaults,
  SUPPORTED_JWT_ALGORITHMS,
  type SupportedJwtAlgorithm,
  AUDIT_CONSTANTS,
  type AuditConstants,
  BOOTSTRAP_DEFAULTS,
  type BootstrapDefaults,
  SYSTEM_DEFAULTS,
  type SystemDefaults,
  TIME_CONSTANTS,
  type TimeConstants,
} from './constants/index.js';
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
  AuditResource,
  type AuditResourceType,
  AuditAction,
  type AuditActionType,
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
  NodeEnvironment,
  type NodeEnvironmentType,
  Environment,
  type EnvironmentType,
  LogLevel,
  type LogLevelType,
  SecretsProvider,
  type SecretsProviderType,
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
  Website,
  IPv4Address,
  IPv6Address,
  IpAddress,
  type IpVersion,
} from './domain/value-objects/index.js';
export * as shared from './shared/index.js';
export { createLogger, logger } from './logger/index.js';
export type { LoggerConfig, Logger } from './logger/index.js';
export { createPool, withTransaction, getDatabaseEnv, resolveDatabaseUrl, resolveDatabaseOwnerUrl, parseDatabaseUrl, isDdlRole } from './database/index.js';
export type { DbConfig, DatabaseEnvironment, Pool, PoolClient } from './database/index.js';
