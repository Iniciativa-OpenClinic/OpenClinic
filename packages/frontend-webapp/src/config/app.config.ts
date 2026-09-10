/**
 * Configurações gerais da aplicação frontend OpenClinic.
 */
export const APP_CONFIG = {
  /**
   * Tempo em segundos para fechamento automático de mensagens e alertas de feedback.
   */
  NOTIFICATION_AUTO_DISMISS_SECONDS: 5,

  /**
   * Tempo em milissegundos para fechamento automático de mensagens e alertas de feedback.
   */
  get NOTIFICATION_AUTO_DISMISS_MS(): number {
    return this.NOTIFICATION_AUTO_DISMISS_SECONDS * 1000;
  },

  /**
   * Nome padrão do sistema / produto.
   */
  APP_NAME: 'OpenClinic',
} as const;

export type AppConfig = typeof APP_CONFIG;
