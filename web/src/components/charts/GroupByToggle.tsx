import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

export interface GroupByToggleProps {
  groupBy: 'day' | 'month'
  onToggle: (groupBy: 'day' | 'month') => void
  color: string
}

export const GroupByToggle: FC<GroupByToggleProps> = ({ groupBy, onToggle, color }) => {
  const { t } = useTranslation()
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--bg4)', borderRadius: 10, padding: 4 }}>
      {[{ value: 'day' as const, label: t('chart.daily') }, { value: 'month' as const, label: t('chart.monthly') }].map(({ value, label }) => (
        <button key={value} onClick={() => onToggle(value)} style={{
          background: groupBy === value ? color + '33' : 'transparent',
          border: groupBy === value ? `1px solid ${color}55` : '1px solid transparent',
          borderRadius: 7, padding: '5px 12px',
          color: groupBy === value ? color : 'var(--text2)',
          cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 500,
          transition: 'all 0.15s'
        }}>
          {label}
        </button>
      ))}
    </div>
  )
}
