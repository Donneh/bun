export type DitherPattern = "corner" | "sweep";

export type DitherColor = "accent" | "ink";

export type Rgb = readonly [red: number, green: number, blue: number];

type Field = (x: number, y: number, seconds: number, width: number, height: number) => number;

interface PatternStyle {
  readonly field: Field;
  readonly opacity: number;
}

export interface DitherFrame {
  readonly pattern: DitherPattern;
  readonly intensity: number;
  readonly color: Rgb;
  readonly width: number;
  readonly height: number;
  readonly seconds: number;
}

export const STILL_FRAME_SECONDS = 2;

const BAYER_8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54,
  22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29,
  53, 21,
].map((rank) => (rank + 0.5) / 64);

const PATTERNS: Record<DitherPattern, PatternStyle> = {
  corner: {
    opacity: 0.41,
    field: (x, y, seconds, width, height) => {
      const radius = Math.hypot((1 - x / width) * 1.3, (y / height) * 1.8);
      const ring = 0.5 + 0.5 * Math.sin(radius * 18 - seconds * 1.2);
      return Math.max(0, 1 - radius * 1.7) * ring;
    },
  },
  sweep: {
    opacity: 0.24,
    field: (x, y, seconds, width, height) => {
      const sweep = 0.5 + 0.5 * Math.sin((x / width) * 2.4 + (y / height) * 4 - seconds * 2.2);
      return 0.06 + 0.5 * sweep ** 4;
    },
  },
};

export function paintDither(pixels: Uint8ClampedArray, frame: DitherFrame): void {
  const { field, opacity } = PATTERNS[frame.pattern];
  const alpha = Math.round(opacity * 255);
  const [red, green, blue] = frame.color;
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const value = field(x, y, frame.seconds, frame.width, frame.height) * frame.intensity;
      const threshold = BAYER_8[(y % 8) * 8 + (x % 8)] ?? 1;
      const offset = (y * frame.width + x) * 4;
      pixels[offset] = red;
      pixels[offset + 1] = green;
      pixels[offset + 2] = blue;
      pixels[offset + 3] = value > threshold ? alpha : 0;
    }
  }
}

export function parseRgb(color: string): Rgb {
  const [red = 0, green = 0, blue = 0] = color.match(/[\d.]+/g)?.map(Number) ?? [];
  return [red, green, blue];
}
