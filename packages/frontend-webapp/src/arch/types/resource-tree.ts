import { ApplicationContext, UserRole } from '@openclinic/core/shared';

export interface ResourceTreeNode {
  id: string;
  item_code: string;
  label?: string;
  label_key?: string | null;
  description?: string | null;
  icon?: string | null;
  route?: string | null;
  resource_type: string;
  context: ApplicationContext;
  sort_order: number;
  parent_id?: string | null;
  min_role?: UserRole;
  is_active: boolean;
  children?: ResourceTreeNode[];
}

export const renderResourceIcon = (icon?: string | null, type?: string): string => {
  if (!icon) {
    return type === 'MENU' ? '📁' : '📄';
  }
  if (icon.length <= 2) {
    return icon;
  }
  const iconMap: Record<string, string> = {
    'clipboard-list': '📋',
    'users': '👥',
    'file-text': '📝',
    'edit-3': '✍️',
    'file-plus': '💊',
    'activity': '🔬',
    'heart': '❤️',
    'thermometer': '🌡️',
    'shield-alert': '🚨',
    'calendar': '📅',
    'calendar-days': '🗓️',
    'user-check': '🧑‍🤝‍🧑',
    'clock': '⏱️',
    'syringe': '💉',
    'stethoscope': '🩺',
    'dollar-sign': '💰',
    'file-spreadsheet': '📊',
    'credit-card': '💳',
    'bar-chart-2': '📈',
    'trending-up': '📈',
    'clipboard-check': '✅',
    'user': '👤',
    'key': '🔒',
    'help-circle': '❓',
    'settings': '⚙️',
    'shield': '🛡️',
    'sliders': '👑',
    'building': '🏢',
  };
  return iconMap[icon] || '📌';
};
