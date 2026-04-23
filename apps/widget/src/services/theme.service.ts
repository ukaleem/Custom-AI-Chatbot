export class ThemeService {
  static apply(shadow: ShadowRoot, primaryColor: string): void {
    const root = shadow.host as HTMLElement;
    root.style.setProperty('--widget-primary', primaryColor);
  }

  static darken(hex: string, amount = 0.15): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - Math.round(255 * amount));
    const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * amount));
    const b = Math.max(0, (num & 0xff) - Math.round(255 * amount));
    return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
  }
}
