/** Nokori brand tokens (PRD section 2.1). Dollars first, planet second — green is structural, not decorative. */
export const colors = {
  green: '#2F6B4F',
  greenDark: '#245540',
  greenSoft: '#DCEAE1',
  ink: '#1F2A24',
  inkMuted: '#5D6B64',
  inkFaint: '#8B968F',
  mist: '#EDF3EF',
  surface: '#FFFFFF',
  border: '#DCE5DF',
  amber: '#E0A458',
  amberSoft: '#FBF0DF',
  tomato: '#C6533B',
  tomatoSoft: '#F8E3DE',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const type = {
  display: { fontSize: 40, fontWeight: '700' as const, letterSpacing: -1 },
  title: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.4 },
  heading: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.3 },
  caption: { fontSize: 12, fontWeight: '400' as const },
} as const;
