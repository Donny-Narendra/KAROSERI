import { describe, it, expect, vi } from 'vitest';
import { convertColorToRgb, createStyleProxy } from '../pdfExportUtils';

describe('Utility: pdfExportUtils (Modern Tailwind v4 CSS Sanitization)', () => {
  describe('convertColorToRgb', () => {
    it('returns standard hex or rgb color unchanged', () => {
      expect(convertColorToRgb('#ffffff')).toBe('#ffffff');
      expect(convertColorToRgb('rgb(100, 150, 200)')).toBe('rgb(100, 150, 200)');
      expect(convertColorToRgb('transparent')).toBe('transparent');
      expect(convertColorToRgb('')).toBe('');
    });

    it('processes modern color formats such as oklch, lab, and color-mix', () => {
      // In jsdom environment where canvas 2D context may return fallback
      const result = convertColorToRgb('oklch(0.7 0.15 150)');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('converts oklch to rgb using canvas 2d context when available', () => {
      const mockCtx = {
        fillStyle: '',
        fillRect: vi.fn(),
        getImageData: vi.fn().mockReturnValue({
          data: [16, 185, 129, 255],
        }),
      };
      const origCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string, options?: ElementCreationOptions) => {
        if (tagName.toLowerCase() === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: () => mockCtx,
          } as unknown as HTMLCanvasElement;
        }
        return origCreateElement(tagName, options);
      });

      const converted = convertColorToRgb('oklch(0.7 0.15 150)');
      expect(converted).toBe('rgb(16, 185, 129)');
      vi.restoreAllMocks();
    });
  });

  describe('createStyleProxy', () => {
    it('proxies CSSStyleDeclaration and converts modern color tokens on getPropertyValue', () => {
      const mockStyle = {
        color: 'oklch(0.6 0.2 200)',
        backgroundColor: '#ffffff',
        getPropertyValue: vi.fn((prop: string) => {
          if (prop === 'color') return 'oklch(0.6 0.2 200)';
          if (prop === 'background-color') return '#ffffff';
          return '';
        }),
      } as unknown as CSSStyleDeclaration;

      const proxyGetter = createStyleProxy(() => mockStyle);
      const proxied = proxyGetter(document.createElement('div'));

      const bgVal = proxied.getPropertyValue('background-color');
      expect(bgVal).toBe('#ffffff');

      const colorVal = proxied.getPropertyValue('color');
      // Should have been processed by convertColorToRgb
      expect(colorVal).not.toContain('oklch');
    });

    it('proxies direct property access on CSSStyleDeclaration', () => {
      const mockStyle = {
        color: 'oklch(0.5 0.1 120)',
        borderWidth: '1px',
      } as unknown as CSSStyleDeclaration;

      const proxyGetter = createStyleProxy(() => mockStyle);
      const proxied = proxyGetter(document.createElement('div'));

      expect(proxied.borderWidth).toBe('1px');
      expect(proxied.color).not.toContain('oklch');
    });
  });
});
