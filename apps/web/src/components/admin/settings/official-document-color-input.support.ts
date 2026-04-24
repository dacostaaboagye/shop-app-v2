const COLOR_INPUT_PREFIX = String.fromCharCode(35);
const FALLBACK_COLOR_INPUT_VALUE = `${COLOR_INPUT_PREFIX}${"0".repeat(6)}`;
const HEX_DIGITS = "0123456789abcdefABCDEF";

export function toColorInputValue(value: string): string {
  const trimmed = value.trim();
  const hex = normalizeHexColor(trimmed);
  if (hex) return hex;

  const hsl = parseHslColor(trimmed);
  if (hsl) return hslToHex(hsl.h, hsl.s, hsl.l);

  return FALLBACK_COLOR_INPUT_VALUE;
}

function normalizeHexColor(value: string) {
  if (!value.startsWith(COLOR_INPUT_PREFIX)) return null;

  const color = value.slice(1);
  if (!isHexColorValue(color)) return null;

  if (color.length === 3) {
    const [r, g, b] = color.split("");
    if (!r || !g || !b) return null;
    return `${COLOR_INPUT_PREFIX}${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  return color.length === 6
    ? `${COLOR_INPUT_PREFIX}${color}`.toLowerCase()
    : null;
}

function isHexColorValue(value: string) {
  return (
    (value.length === 3 || value.length === 6) &&
    [...value].every((char) => HEX_DIGITS.includes(char))
  );
}

function parseHslColor(value: string) {
  const match =
    /^hsl\(\s*(-?\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\s*\)$/i.exec(
      value,
    );

  if (!match) return null;

  return {
    h: Number(match[1]),
    l: Number(match[3]) / 100,
    s: Number(match[2]) / 100,
  };
}

function hslToHex(hue: number, saturation: number, lightness: number) {
  const normalizedHue = (((hue % 360) + 360) % 360) / 360;
  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;

  const toRgb = (offset: number) => {
    let t = normalizedHue + offset;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  return [toRgb(1 / 3), toRgb(0), toRgb(-1 / 3)]
    .map((channel) =>
      Math.round(channel * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .padStart(6, "0")
    .replace(/^/, COLOR_INPUT_PREFIX);
}
