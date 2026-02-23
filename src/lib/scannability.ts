type StyleConfig = {
  foreground?: string;
  background?: string;
  margin?: number;
  logoScale?: number;
};

function luminance(hex: string) {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((x) => x + x)
          .join("")
      : normalized;
  const parts = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
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

export function evaluateScannability(style: StyleConfig) {
  const foreground = style.foreground ?? "#111111";
  const background = style.background ?? "#ffffff";
  const margin = style.margin ?? 2;
  const logoScale = style.logoScale ?? 0;

  let score = 100;
  const warnings: string[] = [];

  const contrast = contrastRatio(foreground, background);
  if (contrast < 4.5) {
    score -= 35;
    warnings.push("Low contrast may reduce scan reliability.");
  } else if (contrast < 7) {
    score -= 10;
    warnings.push("Contrast is acceptable but not optimal.");
  }

  if (margin < 2) {
    score -= 15;
    warnings.push("Quiet zone is too small; keep margin >= 2.");
  }

  if (logoScale > 0.25) {
    score -= 30;
    warnings.push("Logo size is too large for safe scanning.");
  } else if (logoScale > 0.18) {
    score -= 10;
    warnings.push("Large logo may impact scan quality.");
  }

  return {
    score: Math.max(0, score),
    warnings,
    safeToUse: score >= 70,
  };
}
