import { Platform, useColorScheme } from 'react-native';

import { useAppearance } from './appearance';

/**
 * Nokori's design language.
 *
 * The product shows an operator how much money they threw away. So the interface behaves like
 * a good receipt: one number is loud, everything else is quiet and precisely aligned. Green is
 * the brand, but it is spent sparingly — on one hero surface and one primary action — because
 * when everything is green, nothing reads as important.
 */

const brand = {
  /**
   * Olive rather than the PRD's blue-green #2F6B4F. The interface is warm receipt stock
   * (~44 deg), and a cool green (~152 deg) pulled against every other hue on screen. Moving
   * the green to ~85 deg puts the whole palette in one family.
   */
  olive: '#54682F',
  oliveDeep: '#3B4A1F',
  oliveLift: '#93A860',
} as const;

export const palette = {
  light: {
    // Kraft stock: the paper a ticket is actually printed on.
    canvas: '#F1ECDF',
    surface: '#FAF6EC',
    surfaceSunken: '#E8E1D0',
    surfaceInverse: brand.oliveDeep,

    ink: '#26261C',
    inkMuted: '#6B6A57',
    inkFaint: '#9A9581',
    onBrand: '#FAF6EC',
    onBrandMuted: '#C8CFAC',

    brand: brand.olive,
    brandPressed: brand.oliveDeep,
    brandTint: '#E7EBD6',

    // Waste going up is bad news; down is good. Colour carries that, not just an arrow.
    up: '#A8552F',
    upTint: '#F7E4D9',
    down: brand.olive,
    downTint: '#E7EBD6',
    warning: '#B07C22',
    warningTint: '#F8ECD5',

    hairline: 'rgba(38, 38, 28, 0.14)',
    hairlineStrong: 'rgba(38, 38, 28, 0.30)',
    shadow: 'rgba(38, 38, 28, 0.13)',
    scrim: 'rgba(38, 38, 28, 0.45)',
  },
  dark: {
    canvas: '#14130E',
    surface: '#1D1B14',
    surfaceSunken: '#191710',
    surfaceInverse: '#2A3119',

    ink: '#EDE8D9',
    inkMuted: '#A39E8B',
    inkFaint: '#75705F',
    onBrand: '#14130E',
    onBrandMuted: '#C8CFAC',

    brand: brand.oliveLift,
    brandPressed: '#77894C',
    brandTint: '#232817',

    up: '#D08560',
    upTint: '#2C1D14',
    down: brand.oliveLift,
    downTint: '#1F2415',
    warning: '#D6A44F',
    warningTint: '#2A2213',

    hairline: 'rgba(237, 232, 217, 0.16)',
    hairlineStrong: 'rgba(237, 232, 217, 0.34)',
    shadow: 'rgba(0, 0, 0, 0.55)',
    scrim: 'rgba(0, 0, 0, 0.6)',
  },
} as const;

/** Widened from the literal palette so light and dark share one assignable shape. */
export type Colors = { [K in keyof (typeof palette)['light']]: string };

/** 4pt base. Tight values group related things; the large ones separate sections. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/**
 * Every money value uses tabular figures so digits sit in the same column down a list —
 * the difference between a list of numbers and a table you can actually scan.
 */
export const tabular = { fontVariant: ['tabular-nums' as const] };

/**
 * Figures and receipt rows are set in monospace — the voice of a printed ticket, and it makes
 * every amount align by construction. Item names and chrome stay in the system sans.
 */
export const mono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, SFMono-Regular, Menlo, monospace',
}) as string;

export const text = {
  // Reserved for the single headline number on a screen.
  display: { fontSize: 44, lineHeight: 48, fontWeight: '700' as const, letterSpacing: -1.6 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const, letterSpacing: -0.6 },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const, letterSpacing: -0.3 },
  subhead: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const, letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '600' as const },
  // Sentence case, muted — the old all-caps labels shouted over the data they described.
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
} as const;

export const elevation = {
  /** Cards sit flat on the canvas with a hairline; only the hero and floating action lift. */
  card: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  lifted: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

/** Widened so the light and flat (dark) elevation sets share one assignable shape. */
export type Elevation = {
  [K in keyof typeof elevation]: {
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
};

export interface Theme {
  colors: Colors;
  scheme: 'light' | 'dark';
  space: typeof space;
  radius: typeof radius;
  text: typeof text;
  elevation: Elevation;
}

/**
 * Dark interfaces separate layers by surface brightness, not shadow — a shadow on a dark
 * background reads as smudge. Depth there comes from `surface` being lighter than `canvas`.
 */
const flatElevation = {
  card: { ...elevation.card, shadowOpacity: 0, elevation: 0 },
  lifted: { ...elevation.lifted, shadowOpacity: 0, elevation: 0 },
} as const;

export function useTheme(): Theme {
  const system = useColorScheme();
  const { preference } = useAppearance();
  // An explicit choice wins; 'system' follows the OS.
  const scheme =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  return {
    colors: palette[scheme],
    scheme,
    space,
    radius,
    text,
    elevation: scheme === 'dark' ? flatElevation : elevation,
  };
}
