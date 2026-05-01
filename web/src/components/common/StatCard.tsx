import type { FC } from 'react'

export interface StatCardProps {
  label: string
  value: string
  unit: string
  color: string
  percent?: number
}

export const StatCard: FC<StatCardProps> = ({ label, value, unit, color, percent }) => {
  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 18px', flex: '0 0 auto', minWidth: 150 }}>
      <div style={{ color: 'var(--text3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'Outfit', fontSize: 22, fontWeight: 600, color }}>
        {value} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text2)' }}>{unit}</span>
      </div>
      {percent !== undefined && (
        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
          {percent >= 0 ? '↑' : '↓'} {Math.abs(percent)}%
        </div>
      )}
    </div>
  )
}
