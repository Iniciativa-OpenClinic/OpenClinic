export type { BaseEntity } from './domain/base-entity.js';
export type { RepositoryInterface } from './domain/repository.interface.js';
export { UserRole, ResourceAction, PermissionEffect, AuditStatus, TenantStatus } from './domain/enums.js';
export { AppError, DomainError, AuthenticationError, AccessDeniedError, EntityNotFoundError, EntityAlreadyExistsError, ValidationError, BruteForceError, ErrorCode } from './domain/exceptions.js';
