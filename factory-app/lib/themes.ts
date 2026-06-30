export interface ThemeConfig {
  id: string;
  name: string;
  description: string;
  previewColors: string[]; // Tailwind bg classes for color dot preview
  twPrimary: string;       // Tailwind color name e.g. 'emerald'
  twBg: string;            // Tailwind bg class e.g. 'bg-gray-950'
  twSurface: string;
  twBorder: string;
  twText: string;
  twTextMuted: string;
  // Values injected into the generated platform's system prompt
  cssContext: string;
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'dark_pro',
    name: 'Dark Professional',
    description: 'Easy on the eyes for long counter shifts',
    previewColors: ['bg-gray-950', 'bg-gray-800', 'bg-emerald-500'],
    twPrimary: 'emerald',
    twBg: 'bg-gray-950', twSurface: 'bg-gray-900', twBorder: 'border-gray-800',
    twText: 'text-white', twTextMuted: 'text-gray-400',
    cssContext: 'Dark theme: background #030712, surface #111827, border #1f2937, primary emerald-500 (#10b981), text white. Use dark Tailwind classes throughout.',
  },
  {
    id: 'light_clean',
    name: 'Light & Clean',
    description: 'Bright and airy — great for well-lit shop counters',
    previewColors: ['bg-slate-50', 'bg-white', 'bg-blue-500'],
    twPrimary: 'blue',
    twBg: 'bg-slate-50', twSurface: 'bg-white', twBorder: 'border-slate-200',
    twText: 'text-slate-900', twTextMuted: 'text-slate-500',
    cssContext: 'Light theme: background #f8fafc (slate-50), surface white, border #e2e8f0 (slate-200), primary blue-500 (#3b82f6), text slate-900. Use light Tailwind classes throughout.',
  },
  {
    id: 'warm_earthy',
    name: 'Warm & Earthy',
    description: 'Welcoming tones — perfect for neighbourhood shops',
    previewColors: ['bg-amber-50', 'bg-white', 'bg-amber-500'],
    twPrimary: 'amber',
    twBg: 'bg-amber-50', twSurface: 'bg-white', twBorder: 'border-amber-200',
    twText: 'text-stone-900', twTextMuted: 'text-stone-500',
    cssContext: 'Warm earthy theme: background #fffbeb (amber-50), surface white, border amber-200, primary amber-600 (#d97706), text stone-900. Use warm Tailwind classes throughout.',
  },
  {
    id: 'modern_minimal',
    name: 'Modern Minimal',
    description: 'Bold black & white with red accents — zero clutter',
    previewColors: ['bg-zinc-50', 'bg-white', 'bg-red-500'],
    twPrimary: 'red',
    twBg: 'bg-zinc-50', twSurface: 'bg-white', twBorder: 'border-zinc-200',
    twText: 'text-zinc-900', twTextMuted: 'text-zinc-500',
    cssContext: 'Modern minimal theme: background #fafafa (zinc-50), surface white, border zinc-200, primary red-500 (#ef4444), text zinc-900. Minimal decoration, strong typography.',
  },
];

export function getTheme(id: string): ThemeConfig {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
