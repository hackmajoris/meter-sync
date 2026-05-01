import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import type { CounterWithEntries } from '../../hooks/useAppData'
import { MeterChart } from './MeterChart'
import { ChartTypeToggle } from './ChartTypeToggle'
import { GroupByToggle } from './GroupByToggle'
import { OverlayToggles } from './OverlayToggles'

export interface ExpandedChartProps {
  counter: CounterWithEntries
  chartType: 'line' | 'bar'
  onClose: () => void
  onToggleType: (type: 'line' | 'bar') => void
  groupBy: 'day' | 'month'
  onToggleGroupBy: (groupBy: 'day' | 'month') => void
  showAvg: boolean
  showTrend: boolean
  onToggleAvg: () => void
  onToggleTrend: () => void
}

export const ExpandedChart: FC<ExpandedChartProps> = ({ 
  counter, 
  chartType, 
  onClose, 
  onToggleType, 
  groupBy, 
  onToggleGroupBy, 
  showAvg, 
  showTrend, 
  onToggleAvg, 
  onToggleTrend 
}) => {
  const { t } = useTranslation()
  return (
    <div className="chart-expanded-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="chart-expanded-inner">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: 'Outfit', fontSize: 22, fontWeight: 600 }}>{counter.name}</div>
            <div style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>{t('chart.full_history')}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <GroupByToggle groupBy={groupBy} onToggle={onToggleGroupBy} color={counter.color} />
            <ChartTypeToggle type={chartType} onToggle={onToggleType} color={counter.color} />
            <button onClick={onClose} style={{
              background: 'var(--bg4)', border: 'none', borderRadius: 10, padding: '8px 14px',
              color: 'var(--text2)', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              {t('chart.close')}
            </button>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <OverlayToggles showAvg={showAvg} showTrend={showTrend} onToggleAvg={onToggleAvg} onToggleTrend={onToggleTrend} />
        </div>
        <div style={{ height: 460 }}>
          <MeterChart counter={counter} chartType={chartType} expanded={true} groupBy={groupBy} showAvg={showAvg} showTrend={showTrend} />
        </div>
      </div>
    </div>
  )
}
