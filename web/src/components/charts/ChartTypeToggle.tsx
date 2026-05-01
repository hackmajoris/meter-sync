import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

export interface ChartTypeToggleProps {
  type: 'line' | 'bar'
  onToggle: (type: 'line' | 'bar') => void
  color: string
}

export const ChartTypeToggle: FC<ChartTypeToggleProps> = ({ type, onToggle, color }) => {
  const { t } = useTranslation()
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--bg4)', borderRadius: 10, padding: 4 }}>
      {(['line', 'bar'] as const).map(chartType => (
        <button key={chartType} onClick={() => onToggle(chartType)} style={{
          background: type === chartType ? color + '33' : 'transparent',
          border: type === chartType ? `1px solid ${color}55` : '1px solid transparent',
          borderRadius: 7, padding: '5px 12px',
          color: type === chartType ? color : 'var(--text2)',
          cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 500,
          transition: 'all 0.15s'
        }}>
          {chartType === 'line' ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              {t('chart.line')}
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="18" y="3" width="4" height="18"/><rect x="10" y="8" width="4" height="13"/><rect x="2" y="13" width="4" height="8"/></svg>
              {t('chart.bar')}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
