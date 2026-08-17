import { useMemo, type FC } from 'react'
import { useTranslation } from 'react-i18next'
import type { CounterWithEntries } from '../../hooks/useAppData'
import { getCounterIcon } from '../icons/CounterIcons'
import { StatCard } from '../common/StatCard'
import { MeterChart } from '../charts/MeterChart'
import { ChartTypeToggle } from '../charts/ChartTypeToggle'
import { GroupByToggle } from '../charts/GroupByToggle'
import { RangeToggle, type ChartRange } from '../charts/RangeToggle'
import type { Theme } from '../common/ThemeSwitcher'
import { OverlayToggles } from '../charts/OverlayToggles'
import { localDate } from '../../utils/helpers'
import type { VisibleStats } from '../../utils/statCards'

export interface DashboardPageProps {
  counter: CounterWithEntries | null
  chartType: 'line' | 'bar'
  onToggleChartType: (type: 'line' | 'bar') => void
  groupBy: 'day' | 'month' | 'year'
  onToggleGroupBy: (groupBy: 'day' | 'month' | 'year') => void
  range: ChartRange
  onToggleRange: (range: ChartRange) => void
  theme: Theme
  showAvg: boolean
  showTrend: boolean
  visibleStats: VisibleStats
  onToggleAvg: () => void
  onToggleTrend: () => void
  onAddEntry: () => void
  onDeleteCounter: (id: string) => void
  onDeleteEntry: (entryId: string) => void
  onExpandChart: () => void
  onAddCounter: () => void
  onAddHouse: () => void
  hasHouses: boolean
  isMobile: boolean
  onOpenSidebar: () => void
}

interface ComparisonRowProps {
  label: string
  currentLabel: string
  previousLabel: string
  current: number | null
  previous: number | null
  unit: string
  color: string
  emptyText: string
  divider?: boolean
}

// Consumption going up is bad, so increases are red and decreases green.
const ComparisonRow: FC<ComparisonRowProps> = ({ label, currentLabel, previousLabel, current, previous, unit, color, emptyText, divider = true }) => {
  const hasBoth = current !== null && previous !== null
  const delta = hasBoth ? current - previous : null
  const percent = hasBoth && previous !== 0 ? (delta! / previous) * 100 : null
  const deltaColor = delta === null || delta === 0 ? 'var(--text3)' : delta > 0 ? '#ef4444' : '#22c55e'

  return (
    <div style={{ padding: '12px 0', borderBottom: divider ? '1px solid var(--border)' : 'none' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>{label}</div>
        {current === null ? (
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>{emptyText}</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontFamily: 'Outfit Variable', fontSize: 18, fontWeight: 600, color }}>
              {current.toFixed(2)} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text2)' }}>{unit}</span>
            </span>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>
              {previousLabel} {previous === null ? '—' : previous.toFixed(2)}
            </span>
          </div>
        )}
      </div>
      <div style={{ marginTop: 6, fontSize: 11, color: deltaColor }}>
        {delta === null
          ? '—'
          : `${delta >= 0 ? '↑' : '↓'} ${Math.abs(delta).toFixed(2)} ${unit}${percent === null ? '' : ` (${delta >= 0 ? '+' : '−'}${Math.abs(percent).toFixed(1)}%)`} ${currentLabel}`}
      </div>
    </div>
  )
}

export const DashboardPage: FC<DashboardPageProps> = ({
  counter,
  chartType,
  onToggleChartType,
  groupBy,
  onToggleGroupBy,
  range,
  onToggleRange,
  theme,
  showAvg,
  showTrend,
  visibleStats,
  onToggleAvg,
  onToggleTrend,
  onAddEntry,
  onDeleteCounter,
  onDeleteEntry,
  onExpandChart,
  onAddCounter,
  onAddHouse,
  hasHouses,
  isMobile,
  onOpenSidebar
}) => {
  const { t } = useTranslation()

  const sortedEntries = useMemo(() =>
    [...(counter?.entries || [])].sort((a,b) => b.date.localeCompare(a.date)),
    [counter?.entries]
  )

  const stats = useMemo(() => {
    if (!counter?.entries.length) return null
    const vals = counter.entries.map(e => e.value)
    const avg = vals.reduce((a,b) => a+b, 0) / vals.length

    const today = localDate()
    const yesterday = localDate(new Date(Date.now() - 86400000))
    const todayEntry = counter.entries.find(e => e.date === today)
    const yesterdayEntry = counter.entries.find(e => e.date === yesterday)

    let diff = null, diffPercent = null
    if (todayEntry && yesterdayEntry) {
      const diffValue = todayEntry.value - yesterdayEntry.value
      diff = diffValue.toFixed(2)
      diffPercent = ((diffValue / yesterdayEntry.value) * 100).toFixed(1)
    }

    const month = today.slice(0, 7)
    const year = today.slice(0, 4)
    const monthEntries = counter.entries.filter(e => e.date.startsWith(month))
    const monthSum = monthEntries.reduce((a, e) => a + e.value, 0)
    const monthTotal = monthSum.toFixed(1)

    const prevMonthDate = new Date()
    prevMonthDate.setDate(1)
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1)
    const prevMonth = localDate(prevMonthDate).slice(0, 7)
    const prevMonthSum = counter.entries.filter(e => e.date.startsWith(prevMonth)).reduce((a, e) => a + e.value, 0)

    const yearTotal = counter.entries.filter(e => e.date.startsWith(year)).reduce((a, e) => a + e.value, 0).toFixed(1)
    let peak = null, low = null
    if (monthEntries.length) {
      const peakEntry = monthEntries.reduce((a, e) => e.value > a.value ? e : a)
      const lowEntry = monthEntries.reduce((a, e) => e.value < a.value ? e : a)
      peak = { value: peakEntry.value.toFixed(2), date: peakEntry.date }
      low = { value: lowEntry.value.toFixed(2), date: lowEntry.date }
    }

    return {
      avg: avg.toFixed(2),
      monthTotal,
      yearTotal,
      peak,
      low,
      diff,
      diffPercent,
      monthVsPrev: { current: monthSum, previous: prevMonthSum },
      todayVsYesterday: { current: todayEntry?.value ?? null, previous: yesterdayEntry?.value ?? null },
    }
  }, [counter?.entries])

  if (!counter) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, position: 'relative' }}>
        {isMobile && (
          <button
            onClick={onOpenSidebar}
            style={{ position: 'absolute', top: 16, left: 16, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: '4px', borderRadius: 8, display: 'flex', alignItems: 'center' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        )}
        <div style={{ fontSize: 40 }}>{hasHouses ? '⚡' : '🏠'}</div>
        <div style={{ fontFamily: 'Outfit Variable', fontSize: 18, fontWeight: 600 }}>
          {hasHouses ? t('counter.no_counters') : t('house.no_houses')}
        </div>
        <div style={{ color: 'var(--text2)', fontSize: 14 }}>
          {hasHouses ? t('house.no_counters_sub') : t('house.no_houses_sub')}
        </div>
        <button
          onClick={hasHouses ? onAddCounter : onAddHouse}
          style={{ marginTop: 8, background: '#3b82f6', border: 'none', borderRadius: 12, padding: '10px 22px', color: '#fff', cursor: 'pointer', fontFamily: 'Inter Variable', fontSize: 14, fontWeight: 500 }}
        >
          {hasHouses ? t('counter.add') : t('house.add')}
        </button>
      </div>
    )
  }

  return (
    <>
      <div style={{
        padding: isMobile ? '14px 16px 12px' : '22px 28px 18px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14 }}>
          {isMobile && (
            <button
              onClick={onOpenSidebar}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: '4px', borderRadius: 8, display: 'flex', alignItems: 'center' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          )}
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: counter.color + '22',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {getCounterIcon(counter.name, counter.color)}
          </div>
          <div>
            <div style={{ fontFamily: 'Outfit Variable', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>{counter.name}</div>
            <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 1 }}>{counter.entries.length} entries</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => { if (window.confirm(t('counter.delete_confirm', { name: counter.name }))) onDeleteCounter(counter.id) }}
            style={{ background: 'transparent', border: 'none', padding: '7px 10px', borderRadius: 9, cursor: 'pointer', color: 'var(--text3)', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
          <button
            onClick={onAddEntry}
            style={{
              background: counter.color, border: 'none', borderRadius: 10,
              padding: '8px 16px', color: '#fff', cursor: 'pointer',
              fontFamily: 'Inter Variable', fontSize: 13, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: `0 4px 16px ${counter.color}44`,
              transition: 'opacity 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {t('entry.add')}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '14px 14px' : '20px 28px' }}>
        {stats && Object.values(visibleStats).some(Boolean) && (
          <div className="stats-row" style={{ display: 'flex', gap: 10, marginBottom: 16, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', paddingBottom: 2 }}>
            {visibleStats.today_vs_yesterday && stats.diff !== null && (
              <StatCard label={t('stats.today_vs_yesterday')} value={stats.diff} unit={counter.unit} color={counter.color} percent={parseFloat(stats.diffPercent!)} />
            )}
            {visibleStats.average && (
              <StatCard label={t('stats.average')} value={stats.avg} unit={counter.unit} color={counter.color} />
            )}
            {visibleStats.total && (
              <StatCard label={t('stats.total')} value={stats.monthTotal} unit={counter.unit} color={counter.color} />
            )}
            {visibleStats.year_total && (
              <StatCard label={t('stats.year_total')} value={stats.yearTotal} unit={counter.unit} color={counter.color} />
            )}
            {visibleStats.peak && stats.peak && (
              <StatCard label={t('stats.peak')} value={stats.peak.value} unit={counter.unit} color={counter.color} sub={stats.peak.date} />
            )}
            {visibleStats.lowest && stats.low && (
              <StatCard label={t('stats.lowest')} value={stats.low.value} unit={counter.unit} color={counter.color} sub={stats.low.date} />
            )}
          </div>
        )}

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, padding: '20px 22px', marginBottom: 20 }}>
          <div className="chart-header" style={{ marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: 'Outfit Variable', fontSize: 15, fontWeight: 600 }}>{t('chart.usage_over_time')}</div>
              <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 2 }}>{t('chart.last_entries', { count: counter.entries.length })}</div>
            </div>
            <div className="chart-controls" style={{ minWidth: 0 }}>
              <RangeToggle range={range} onToggle={onToggleRange} color={counter.color} />
              <GroupByToggle groupBy={groupBy} onToggle={onToggleGroupBy} color={counter.color} />
              <ChartTypeToggle type={chartType} onToggle={onToggleChartType} color={counter.color} />
              <button
                onClick={onExpandChart}
                style={{
                  background: 'var(--bg4)', border: 'none', borderRadius: 9,
                  padding: '7px 10px', cursor: 'pointer', color: 'var(--text2)',
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontFamily: 'Inter Variable', fontSize: 12,
                  transition: 'background 0.15s, color 0.15s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.color = 'var(--text)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg4)'; e.currentTarget.style.color = 'var(--text2)' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                {t('chart.expand')}
              </button>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <OverlayToggles showAvg={showAvg} showTrend={showTrend} onToggleAvg={onToggleAvg} onToggleTrend={onToggleTrend} />
          </div>
          <div style={{ height: 200 }}>
            {counter.entries.length > 0
              ? <MeterChart counter={counter} chartType={chartType} expanded={false} groupBy={groupBy} range={range} theme={theme} showAvg={showAvg} showTrend={showTrend} />
              : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 13 }}>{t('entry.no_data')}</div>
            }
          </div>
        </div>

        {stats && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, padding: '16px 20px 4px', marginBottom: 20 }}>
            <div style={{ fontFamily: 'Outfit Variable', fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{t('comparison.title')}</div>
            <ComparisonRow
              label={t('comparison.month')}
              currentLabel={t('comparison.vs_prev_month')}
              previousLabel={t('comparison.prev_month')}
              current={stats.monthVsPrev.current}
              previous={stats.monthVsPrev.previous}
              unit={counter.unit}
              color={counter.color}
              emptyText={t('comparison.no_data')}
            />
            <ComparisonRow
              label={t('comparison.day')}
              currentLabel={t('comparison.vs_yesterday')}
              previousLabel={t('comparison.yesterday')}
              current={stats.todayVsYesterday.current}
              previous={stats.todayVsYesterday.previous}
              unit={counter.unit}
              color={counter.color}
              emptyText={t('comparison.no_data')}
              divider={false}
            />
          </div>
        )}

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 500 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ fontFamily: 'Outfit Variable', fontSize: 15, fontWeight: 600 }}>{t('entries.title')}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{t('entries.records', { count: sortedEntries.length })}</div>
          </div>
          {sortedEntries.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
              {t('entry.no_data')}
            </div>
          ) : (
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ background: 'var(--bg3)' }}>
                    {[t('fields.date'), t('fields.value'), t('fields.note'), ''].map((h, i) => (
                      <th key={i} style={{
                        padding: '10px 20px',
                        textAlign: h === t('fields.value') ? 'right' : 'left',
                        fontSize: 11, color: 'var(--text3)', fontWeight: 500,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        borderBottom: '1px solid var(--border)'
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedEntries.map((entry, i) => (
                    <tr
                      key={entry.id}
                      style={{ borderBottom: i < sortedEntries.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text2)' }}>
                        {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                        <span style={{ fontFamily: 'Outfit Variable', fontWeight: 600, fontSize: 15, color: counter.color }}>{entry.value}</span>
                        <span style={{ color: 'var(--text3)', fontSize: 12, marginLeft: 4 }}>{counter.unit}</span>
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: 12, color: 'var(--text3)' }}>{entry.note || '—'}</td>
                      <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                        <button
                          onClick={() => onDeleteEntry(entry.id)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: '4px 6px', borderRadius: 6, transition: 'color 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </>
  )
}
