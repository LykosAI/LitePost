/**
 * HTTP method → color classes, one hue table for the whole app.
 *
 * Seven components had grown independent copies across three palettes, so a
 * GET badge was a different blue in the collections panel than in the tab
 * bar. Tailwind's scanner needs literal class strings, hence one map per
 * surface style rather than composing from a hue name.
 *
 * Hue table: GET sky · POST emerald · PUT amber · PATCH orange · DELETE rose
 * · HEAD violet · OPTIONS cyan.
 */

/** Plain colored text (palette rows, runner results). */
export const methodTextColors: Record<string, string> = {
  GET: "text-sky-400",
  POST: "text-emerald-400",
  PUT: "text-amber-400",
  PATCH: "text-orange-400",
  DELETE: "text-rose-400",
  HEAD: "text-violet-400",
  OPTIONS: "text-cyan-400",
}

/** Colored text with a soft glow (tab bar, URL-bar method select). */
export const methodGlowColors: Record<string, string> = {
  GET: "text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]",
  POST: "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]",
  PUT: "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]",
  PATCH: "text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.3)]",
  DELETE: "text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.3)]",
  HEAD: "text-violet-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.3)]",
  OPTIONS: "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]",
}

/** Tinted pill badge (history rows, collection cards). */
export const methodBadgeColors: Record<string, string> = {
  GET: "bg-sky-500/12 text-sky-400 ring-sky-500/20",
  POST: "bg-emerald-500/12 text-emerald-400 ring-emerald-500/20",
  PUT: "bg-amber-500/12 text-amber-400 ring-amber-500/20",
  PATCH: "bg-orange-500/12 text-orange-400 ring-orange-500/20",
  DELETE: "bg-rose-500/12 text-rose-400 ring-rose-500/20",
  HEAD: "bg-violet-500/12 text-violet-400 ring-violet-500/20",
  OPTIONS: "bg-cyan-500/12 text-cyan-400 ring-cyan-500/20",
}

/** Outlined badge (curl import preview). */
export const methodOutlineColors: Record<string, string> = {
  GET: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  POST: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  PUT: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  PATCH: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  DELETE: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  HEAD: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  OPTIONS: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
}
