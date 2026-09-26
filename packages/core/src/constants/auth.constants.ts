export const SUPPORTED_JWT_ALGORITHMS = ['HS256', 'HS384', 'HS512'] as const;
export type SupportedJwtAlgorithm = (typeof SUPPORTED_JWT_ALGORITHMS)[number];

/**
 * Canonical authentication and security default values.
 */
export const AUTH_SECURITY_DEFAULTS = {
  // Minimum length for symmetric JWT secret key
  JWT_MIN_KEY_LENGTH: 16,

  // Access Token lifetime in minutes (stateless JWT, short-lived security guardrail)
  ACCESS_TOKEN_EXPIRE_MINUTES: 15,

  // Refresh Token / Session lifetime in days (stateful, database-tracked)
  REFRESH_TOKEN_EXPIRE_DAYS: 7,

  // Default cryptographic signature algorithm for JWTs
  JWT_ALGORITHM: 'HS256' as SupportedJwtAlgorithm,

  // Supported cryptographic signature algorithms
  SUPPORTED_JWT_ALGORITHMS,

  // Default max consecutive failed login attempts before account lockout
  LOCKOUT_MAX_ATTEMPTS: 5,

  // Default lockout duration in minutes after exceeding max failed attempts
  LOCKOUT_DURATION_MINUTES: 15,

  // Default session inactivity timeout in minutes (CFM/HIPAA compliance baseline)
  DEFAULT_SESSION_TIMEOUT_MINUTES: 30,

  // Minimum length for passwords
  PASSWORD_MIN_LENGTH: 8,

  // Canonical token type for HTTP Authorization header
  TOKEN_TYPE_BEARER: 'bearer',

  // Default password reset token validity in minutes
  PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: 30,

  // Dummy hash used for constant-time comparison when user is not found (anti-timing attacks)
  DUMMY_ARGON2_HASH: '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$RdescudvJCsgqlfreOJRomIMacCa745TQUtOP10iWw4',

  // Canonical cookie name for HttpOnly refresh tokens
  REFRESH_TOKEN_COOKIE_NAME: 'refresh_token',

  // Canonical cookie path for HttpOnly refresh tokens
  REFRESH_TOKEN_COOKIE_PATH: '/api/v1/auth',
} as const;

export type AuthSecurityDefaults = typeof AUTH_SECURITY_DEFAULTS;
