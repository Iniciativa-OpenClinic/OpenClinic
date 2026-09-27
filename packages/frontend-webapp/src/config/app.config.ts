/**
 * Global frontend application settings and constants.
 */
export const APP_CONFIG = {
  // Automatic feedback alert dismiss duration in seconds
  NOTIFICATION_AUTO_DISMISS_SECONDS: 5,

  // Automatic feedback alert dismiss duration in milliseconds
  get NOTIFICATION_AUTO_DISMISS_MS(): number {
    return this.NOTIFICATION_AUTO_DISMISS_SECONDS * 1000;
  },

  // Default system product name
  APP_NAME: 'OpenClinic',
} as const;

export type AppConfig = typeof APP_CONFIG;
