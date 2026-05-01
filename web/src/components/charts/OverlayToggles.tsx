import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

export interface OverlayTogglesProps {
  showAvg: boolean
  showTrend: boolean
  onToggleAvg: () => void
  onToggleTrend: () => void
}

export const OverlayToggles: FC<OverlayTogglesProps> = ({ showAvg, showTrend, onToggleAvg, onToggleTrend }) => {
  const { t } = useTranslation()
  
  const item = (checked: boolean, onToggle: () => void, dotColor: string, label: string) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}>
      <div
        onClick={onToggle}
        style={{
          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
          background: checked ? dotColor : 'transparent',
          border: `1.5px solid ${checked ? dotColor : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s', cursor: 'pointer',
        }}
      >
        {checked && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polyline points="1.5,5 4,7.5 8.5,2.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <span style={{ fontSize: 12, color: checked ? dotColor : 'var(--text2)', fontFamily: 'DM Sans', fontWeight: 500, transition: 'color 0.15s' }}>{label}</span>
    </label>
  )
  
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '0 2px' }}>
      {item(showAvg, onToggleAvg, '#a78bfa', t('chart.avg_line'))}
      {item(showTrend, onToggleTrend, '#f59e0b', t('chart.trend'))}
    </div>
  )
}
