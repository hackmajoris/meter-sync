/**
 * Utility functions for the app
 */

import type { Entry } from '../lib'

/**
 * Random hex id. newId() only exists in secure contexts (HTTPS or
 * localhost), so it fails when the demo is served over plain HTTP on a LAN IP.
 */
export function newId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Parse CSV text into entries
 */
export function parseCSV(text: string): Entry[] {
  const lines = text.trim().split('\n')
  const entries: Entry[] = []
  
  for (const line of lines) {
    const parts = line.split(',').map(s => s.trim())
    if (parts.length < 2) continue
    
    const [date, valueStr, ...noteParts] = parts
    if (!date || date === 'date') continue
    
    const v = parseFloat(valueStr)
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/) || isNaN(v)) continue
    
    entries.push({
      id: newId(),
      date,
      value: v,
      note: noteParts.join(',').trim() || ''
    })
  }
  
  return entries
}

/**
 * Local YYYY-MM-DD for a date. toISOString() would return the UTC day, which
 * is the previous day for positive offsets in the early morning hours.
 */
export function localDate(d = new Date()): string {
  return d.toLocaleDateString('en-CA')
}

/**
 * Entries are cumulative meter readings. Returns daily consumption sorted
 * ascending by date. When days are missing between two readings, the
 * difference is spread evenly over each day of the gap, the last day taking
 * the rounding remainder so totals stay exact. The first reading has no
 * predecessor and is dropped.
 */
export function toConsumption(entries: Entry[]): Entry[] {
  const DAY = 86400000
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const out: Entry[] = []
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1], e = sorted[i]
    const start = Date.parse(prev.date + 'T00:00:00Z')
    const days = Math.round((Date.parse(e.date + 'T00:00:00Z') - start) / DAY)
    const delta = e.value - prev.value
    const share = +(delta / days).toFixed(2)
    for (let d = 1; d <= days; d++) {
      const date = new Date(start + d * DAY).toISOString().slice(0, 10)
      const value = d === days ? +(delta - share * (days - 1)).toFixed(2) : share
      out.push({ ...e, id: d === days ? e.id : `${e.id}-${date}`, date, value })
    }
  }
  return out
}

/**
 * Color palette for counters
 */
export const PALETTE = [
  '#3b82f6',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#f97316',
  '#14b8a6',
  '#a3e635',
  '#e879f9',
  '#fb923c'
]

/**
 * Download a file
 */
export function downloadFile(filename: string, content: string, mime = 'text/csv'): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Least-squares polynomial regression
 * Returns array of fitted y values
 */
export function polyfit(ys: number[], degree: number): number[] {
  const n = ys.length
  if (n < degree + 1) return ys.slice()
  
  const xs = ys.map((_, i) => i)
  
  // Build Vandermonde matrix A (n × d+1) and solve normal equations AᵀA·c = Aᵀy
  const d = degree + 1
  const A = xs.map(x => Array.from({ length: d }, (_, p) => Math.pow(x, p)))
  
  // AᵀA
  const AtA = Array.from({ length: d }, (_, i) =>
    Array.from({ length: d }, (_, j) =>
      A.reduce((s, row) => s + row[i] * row[j], 0)
    )
  )
  
  // Aᵀy
  const Aty = Array.from({ length: d }, (_, i) =>
    A.reduce((s, row, r) => s + row[i] * ys[r], 0)
  )
  
  // Gaussian elimination
  const aug = AtA.map((row, i) => [...row, Aty[i]])
  
  for (let col = 0; col < d; col++) {
    let maxRow = col
    for (let r = col + 1; r < d; r++) {
      if (Math.abs(aug[r][col]) > Math.abs(aug[maxRow][col])) {
        maxRow = r
      }
    }
    ;[aug[col], aug[maxRow]] = [aug[maxRow], aug[col]]
    
    for (let r = col + 1; r < d; r++) {
      const f = aug[r][col] / aug[col][col]
      for (let c = col; c <= d; c++) {
        aug[r][c] -= f * aug[col][c]
      }
    }
  }
  
  const coef = new Array(d).fill(0)
  for (let i = d - 1; i >= 0; i--) {
    coef[i] = aug[i][d]
    for (let j = i + 1; j < d; j++) {
      coef[i] -= aug[i][j] * coef[j]
    }
    coef[i] /= aug[i][i]
  }
  
  return xs.map(x =>
    +coef.reduce((s, c, p) => s + c * Math.pow(x, p), 0).toFixed(2)
  )
}
