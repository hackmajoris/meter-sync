/**
 * Utility functions for the app
 */

import type { Entry } from '../lib'

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
      id: crypto.randomUUID(),
      date,
      value: v,
      note: noteParts.join(',').trim() || ''
    })
  }
  
  return entries
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
