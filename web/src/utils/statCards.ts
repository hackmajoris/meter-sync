/**
 * Stat cards shown on the dashboard. The key doubles as the i18n key under
 * `stats.` and as the localStorage flag name.
 */

export const STAT_KEYS = ['today_vs_yesterday', 'average', 'total', 'year_total', 'peak', 'lowest'] as const

export type StatKey = typeof STAT_KEYS[number]

export type VisibleStats = Record<StatKey, boolean>

const STORAGE_KEY = 'visibleStats'

export const ALL_STATS_VISIBLE: VisibleStats = Object.fromEntries(
  STAT_KEYS.map(k => [k, true])
) as VisibleStats

/** Unknown/missing keys fall back to visible, so new cards show up by default. */
export function parseVisibleStats(json: string): VisibleStats {
  try {
    const stored = JSON.parse(json) as Partial<VisibleStats>
    return { ...ALL_STATS_VISIBLE, ...stored }
  } catch {
    return ALL_STATS_VISIBLE
  }
}

export function loadVisibleStats(): VisibleStats {
  return parseVisibleStats(localStorage.getItem(STORAGE_KEY) || '{}')
}

export function saveVisibleStats(stats: VisibleStats): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
}
