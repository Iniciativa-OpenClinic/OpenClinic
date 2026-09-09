import { SupportedLocales } from '@openclinic/core/shared';

/**
 * Neutral fallback constants for client bootstrap resilience.
 * Used during offline scenarios or prior to the first successful API response from /api/v1/public/config.
 */
export const DEFAULT_PUBLIC_CONFIG_FALLBACKS = {
  APP_NAME: 'OpenClinic',
  APP_SUBTITLE: 'Prontuário Eletrônico do Paciente (PEP) Open Source',
  APP_DESCRIPTION: 'OpenClinic Clinical Management System',
  APP_VERSION: '1.0.0',
  APP_LOGO_URL: '/logo.png',
  APP_FAVICON_URL: '/favicon.png',
  TENANT_NAME: 'OpenClinic System',
  DEFAULT_LOCALE: SupportedLocales.PT_BR,
  SUPPORTED_LOCALES: [SupportedLocales.PT_BR, SupportedLocales.EN_US],
  DEFAULT_TIMEZONE: 'America/Sao_Paulo',
  DEFAULT_DIALING_CODE: '+55',
  ACCEPTED_LOGIN_METHODS: ['PASSWORD'],
} as const;
