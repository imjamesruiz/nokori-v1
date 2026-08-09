import { useColorScheme } from 'react-native';

/**
 * Nokori's design language.
 *
 * The product shows an operator how much money they threw away. So the interface behaves like
 * a good receipt: one number is loud, everything else is quiet and precisely aligned. Green is
 * the brand, but it is spent sparingly — on one hero surface and one primary action — because
 * when everything is green, nothing reads as important.
 */

const brand = {
  green: '#2F6B4F',
  greenDeep: '#1E4634',
  greenLift: '#4E9A75',
} as const;

export const palette = {
  light: {
    // A barely-warm paper rather than a mint tint, so white surfaces read as clean, not cold.
    canvas: '#F5F6F3',
    surface: '#FFFFFF',
    surfaceSunken: '#EFF1EE',
    surfaceInverse: brand.greenDeep,

    ink: '#16201B',
    inkMuted: '#65726B',
    inkFaint: '#94A09A',
    onBrand: '#FFFFFF',
    onBrandMuted: '#BFD8C9',

    brand: brand.green,
    brandPressed: brand.greenDeep,
    brandTint: '#E7F0EA',

    // Waste going up is bad news; down is good. Colour carries that, not just an arrow.
    up: '#C6533B',
    upTint: '#FBEAE5',
    down: '#2F6B4F',
    downTint: '#E7F0EA',
    warning: '#B87A2B',
    warningTint: '#FBF0DF',

    hairline: 'rgba(22, 32, 27, 0.08)',
    hairlineStrong: 'rgba(22, 32, 27, 0.14)',
    shadow: 'rgba(22, 32, 27, 0.10)',
    scrim: 'rgba(22, 32, 27, 0.45)',
  },
  dark: {
    canvas: '#0F1411',
    surface: '#181F1A',
    surfaceSunken: '#131916',
    surfaceInverse: '#20342A',

    ink: '#E9EFEA',
    inkMuted: '#9BA8A0',
    inkFaint: '#6E7B74',
    onBrand: '#FFFFFF',
    onBrandMuted: '#B6D2C2',

    brand: brand.greenLift,
    brandPressed: '#3F8763',
    brandTint: '#1B2C23',

    up: '#E68168',
    upTint: '#2E1E1A',
    down: '#6BB893',
    downTint: '#16281F',
    warning: '#E0A458',
    warningTint: '#2A2115',

    hairline: 'rgba(233, 239, 234, 0.10)',
    hairlineStrong: 'rgba(233, 239, 234, 0.18)',
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

export const text = {
  // Reserved for the single headline number on a screen.
  display: { fontSize: 44, lineHeight: 48, fontWeight: '700' as const, letterSpacing: -1.6 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const, letterSpacing: -0.6 },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const, letterSpacing: -0.3 },
  subhead: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: '600' as const },
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
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

export interface Theme {
  colors: Colors;
  scheme: 'light' | 'dark';
  space: typeof space;
  radius: typeof radius;
  text: typeof text;
  elevation: typeof elevation;
}

export function useTheme(): Theme {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { colors: palette[scheme], scheme, space, radius, text, elevation };
}
