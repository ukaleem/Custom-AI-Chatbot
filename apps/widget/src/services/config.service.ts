export interface WidgetConfig {
  tenantId: string;
  language: string;
  primaryColor: string;
  botName: string;
  position: 'bottom-right' | 'bottom-left';
  apiUrl: string;
}

export class ConfigService {
  static fromElement(el: HTMLElement): WidgetConfig {
    const raw = el.getAttribute('api-url') ?? '';
    const apiUrl = raw || `${window.location.protocol}//${window.location.host}`;
    return {
      tenantId: el.getAttribute('tenant-id') ?? '',
      language: el.getAttribute('language') ?? 'auto',
      primaryColor: el.getAttribute('primary-color') ?? '#2563EB',
      botName: el.getAttribute('bot-name') ?? 'Guide',
      position: (el.getAttribute('position') as 'bottom-right' | 'bottom-left') ?? 'bottom-right',
      apiUrl,
    };
  }
}
