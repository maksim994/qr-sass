type Gradient = { colors?: [string, string] | string[] } | null | undefined;

export type ScannabilityStyle = {
  foreground?: string;
  background?: string;
  margin?: number;
  logoScale?: number;
  transparent?: boolean;
  bgTransparent?: boolean;
  dotColor?: string;
  bgColor?: string;
  cornerSquareColor?: string;
  cornerDotColor?: string;
  dotGradient?: Gradient;
  bgGradient?: Gradient;
};

function parseHexColor(input: string | undefined): string | null {
  if (!input) return null;
  const raw = input.trim().toLowerCase();
  if (!raw || raw === "transparent" || raw === "none") return null;
  const hex = raw.startsWith("#") ? raw.slice(1) : raw;
  if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/.test(hex)) return null;
  if (hex.length === 3) {
    return hex
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  return hex;
}

function collectColors(value: string | undefined, gradient: Gradient): { colors: string[]; invalid: boolean } {
  const colors: string[] = [];
  let invalid = false;
  if (gradient?.colors && gradient.colors.length > 0) {
    for (const stop of gradient.colors) {
      const parsed = parseHexColor(stop);
      if (!parsed) invalid = true;
      else colors.push(parsed);
    }
  } else if (value != null && value !== "") {
    const hex = parseHexColor(value);
    if (!hex) invalid = true;
    else colors.push(hex);
  }
  return { colors, invalid };
}

function luminance(hex6: string) {
  const parts = [0, 2, 4].map((i) => parseInt(hex6.slice(i, i + 2), 16) / 255);
  const transformed = parts.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * transformed[0] + 0.7152 * transformed[1] + 0.0722 * transformed[2];
}

function contrastRatio(a: string, b: string) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}

function minContrast(foregrounds: string[], backgrounds: string[]): number {
  let min = Infinity;
  for (const fg of foregrounds) {
    for (const bg of backgrounds) {
      min = Math.min(min, contrastRatio(fg, bg));
    }
  }
  return min;
}

/** Score the style that will actually be rendered, including gradients and finders. */
export function evaluateScannability(style: ScannabilityStyle) {
  const warnings: string[] = [];

  if (style.transparent || style.bgTransparent) {
    return {
      score: 0,
      warnings: ["Прозрачный фон нельзя оценить автоматически. Проверьте код камерой на материале печати."],
      safeToUse: false,
    };
  }

  const modules = collectColors(style.dotColor ?? style.foreground ?? "#111111", style.dotGradient);
  const finders = collectColors(style.cornerSquareColor, undefined);
  const finderDots = collectColors(style.cornerDotColor, undefined);
  const backgrounds = collectColors(style.bgColor ?? style.background ?? "#ffffff", style.bgGradient);
  const invalid = modules.invalid || finders.invalid || finderDots.invalid || backgrounds.invalid;

  if (invalid) {
    return {
      score: 0,
      warnings: ["Прозрачные или не-HEX цвета нельзя надёжно напечатать. Укажите непрозрачный HEX."],
      safeToUse: false,
    };
  }

  const foregrounds = [...modules.colors, ...finders.colors, ...finderDots.colors];
  if (foregrounds.length === 0 || backgrounds.colors.length === 0) {
    return {
      score: 0,
      warnings: ["Некорректный цвет точек или фона. Укажите непрозрачный HEX-цвет."],
      safeToUse: false,
    };
  }

  let score = 100;
  const margin = style.margin ?? 2;
  const logoScale = style.logoScale ?? 0;
  const contrast = minContrast(foregrounds, backgrounds.colors);

  if (!Number.isFinite(contrast) || contrast < 4.5) {
    score -= 35;
    warnings.push("Слишком слабый контраст — сканер может не прочитать код.");
  } else if (contrast < 7) {
    score -= 10;
    warnings.push("Контраст приемлемый, но не оптимальный.");
  }

  if (margin < 2) {
    score -= 15;
    warnings.push("Слишком маленькая тихая зона; отступ должен быть не меньше 2.");
  }

  if (logoScale > 0.25) {
    score -= 30;
    warnings.push("Логотип слишком большой для устойчивого сканирования.");
  } else if (logoScale > 0.18) {
    score -= 10;
    warnings.push("Крупный логотип может ухудшить чтение.");
  }

  return {
    score: Math.max(0, score),
    warnings,
    safeToUse: score >= 70,
  };
}

export function styleToScannability(style: ScannabilityStyle & Record<string, unknown>): ScannabilityStyle {
  return {
    foreground: typeof style.dotColor === "string" ? style.dotColor : style.foreground,
    background: typeof style.bgColor === "string" ? style.bgColor : style.background,
    transparent: Boolean(style.transparent || style.bgTransparent),
    bgTransparent: Boolean(style.bgTransparent),
    margin: typeof style.margin === "number" ? style.margin : undefined,
    logoScale: typeof style.logoScale === "number" ? style.logoScale : undefined,
    dotColor: typeof style.dotColor === "string" ? style.dotColor : undefined,
    bgColor: typeof style.bgColor === "string" ? style.bgColor : undefined,
    cornerSquareColor: typeof style.cornerSquareColor === "string" ? style.cornerSquareColor : undefined,
    cornerDotColor: typeof style.cornerDotColor === "string" ? style.cornerDotColor : undefined,
    dotGradient: style.dotGradient as Gradient,
    bgGradient: style.bgGradient as Gradient,
  };
}
