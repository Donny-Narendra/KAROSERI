/**
 * Utility functions for html2pdf / html2canvas modern CSS (Tailwind v4 oklch/color-mix) compatibility.
 */

export const convertColorToRgb = (colorStr: string): string => {
  if (
    !colorStr ||
    (!colorStr.includes('oklch') &&
      !colorStr.includes('color-mix') &&
      !colorStr.includes('lab') &&
      !colorStr.includes('lch'))
  ) {
    return colorStr;
  }
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '#000000';
    ctx.fillStyle = colorStr;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(2)})`;
  } catch {
    return '#000000';
  }
};

export const createStyleProxy = (
  origGetComputedStyle: (elt: Element, pseudoElt?: string | null) => CSSStyleDeclaration
) => {
  return function (elt: Element, pseudoElt?: string | null): CSSStyleDeclaration {
    const style = origGetComputedStyle(elt, pseudoElt);
    return new Proxy(style, {
      get(target, prop) {
        if (prop === 'getPropertyValue') {
          return function (name: string): string {
            const val = target.getPropertyValue(name);
            if (
              typeof val === 'string' &&
              (val.includes('oklch') ||
                val.includes('color-mix') ||
                val.includes('lab') ||
                val.includes('lch'))
            ) {
              return convertColorToRgb(val);
            }
            return val;
          };
        }
        const val = (target as any)[prop];
        if (typeof val === 'function') {
          return val.bind(target);
        }
        if (
          typeof val === 'string' &&
          (val.includes('oklch') ||
            val.includes('color-mix') ||
            val.includes('lab') ||
            val.includes('lch'))
        ) {
          return convertColorToRgb(val);
        }
        return val;
      },
    });
  };
};
