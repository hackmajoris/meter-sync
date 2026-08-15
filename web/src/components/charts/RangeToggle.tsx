import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

export type ChartRange = '1y' | '3y' | '5y' | 'all'

export interface RangeToggleProps {
  range: ChartRange
  onToggle: (range: ChartRange) => void
  color: string
}

export const RangeToggle: FC<RangeToggleProps> = ({ range, onToggle, color }) => {
  const { t } = useTranslation()
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--bg4)', borderRadius: 10, padding: 4 }}>
      {[{ value: '1y' as const, label: t('chart.range_1y') }, { value: '3y' as const, label: t('chart.range_3y') }, { value: '5y' as const, label: t('chart.range_5y') }, { value: 'all' as const, label: t('chart.range_all') }].map(({ value, label }) => (
        <button key={value} onClick={() => onToggle(value)} style={{
          background: range === value ? color + '33' : 'transparent',
          border: range === value ? `1px solid ${color}55` : '1px solid transparent',
          borderRadius: 7, padding: '5px 12px',
          color: range === value ? color : 'var(--text2)',
          cursor: 'pointer', fontFamily: 'Inter Variable', fontSize: 12, fontWeight: 500,
          transition: 'all 0.15s'
        }}>
          {label}
        </button>
      ))}
    </div>
  )
}
