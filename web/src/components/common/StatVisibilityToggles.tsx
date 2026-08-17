import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { STAT_KEYS, type StatKey, type VisibleStats } from '../../utils/statCards'

export interface StatVisibilityTogglesProps {
  visibleStats: VisibleStats
  onToggle: (key: StatKey) => void
}

export const StatVisibilityToggles: FC<StatVisibilityTogglesProps> = ({ visibleStats, onToggle }) => {
  const { t } = useTranslation()
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {STAT_KEYS.map(key => {
        const on = visibleStats[key]
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            aria-pressed={on}
            style={{
              background: on ? 'var(--bg4)' : 'transparent',
              border: `1px solid ${on ? 'var(--border2)' : 'var(--border)'}`,
              borderRadius: 9, padding: '7px 12px',
              color: on ? 'var(--text)' : 'var(--text3)',
              cursor: 'pointer', fontFamily: 'Inter Variable', fontSize: 12, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 7, transition: 'all 0.15s'
            }}
          >
            <span style={{
              width: 14, height: 14, borderRadius: 4, flexShrink: 0,
              border: `1px solid ${on ? 'transparent' : 'var(--border2)'}`,
              background: on ? '#3b82f6' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {on && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              )}
            </span>
            {t(`stats.${key}`)}
          </button>
        )
      })}
    </div>
  )
}
