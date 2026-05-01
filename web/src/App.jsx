import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip)

function parseCSV(text) {
  const lines = text.trim().split('\n')
  const entries = []
  for (const line of lines) {
    const parts = line.split(',').map(s => s.trim())
    if (parts.length < 2) continue
    const [date, valueStr, ...noteParts] = parts
    if (!date || date === 'date') continue
    const v = parseFloat(valueStr)
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/) || isNaN(v)) continue
    entries.push({ id: crypto.randomUUID(), date, value: v, note: noteParts.join(',').trim() || '' })
  }
  return entries
}

const PALETTE = [
  '#3b82f6','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#ec4899','#f97316','#14b8a6','#a3e635','#e879f9','#fb923c'
]

function ElectricIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  )
}
function GasIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>
    </svg>
  )
}
function WaterIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
    </svg>
  )
}
function DefaultIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
}

function getIcon(name, color) {
  const k = name.toLowerCase()
  if (k.includes('electric') || k.includes('power')) return <ElectricIcon color={color} />
  if (k.includes('gas')) return <GasIcon color={color} />
  if (k.includes('water')) return <WaterIcon color={color} />
  return <DefaultIcon color={color} />
}

function genSampleEntries(baseVal, variance, daysBack = 365) {
  const entries = []
  const today = new Date()
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    // Seasonal multiplier: higher in winter months (Dec-Feb), lower in summer (Jun-Aug)
    const month = d.getMonth() // 0=Jan
    const seasonal = 1 + 0.25 * Math.cos(((month - 0) / 12) * 2 * Math.PI)
    const val = +(baseVal * seasonal + (Math.random() - 0.5) * variance * 2).toFixed(2)
    entries.push({ id: crypto.randomUUID(), date: d.toISOString().split('T')[0], value: Math.max(0, val), note: '' })
  }
  return entries
}

const INITIAL_HOUSES = [
  { id: 'h1', name: 'Home' }
]

const INITIAL_COUNTERS = [
  { id: '1', name: 'Electricity', unit: 'kWh', color: '#3b82f6', houseId: 'h1', entries: genSampleEntries(14.5, 4) },
  { id: '2', name: 'Gas', unit: 'm³', color: '#f97316', houseId: 'h1', entries: genSampleEntries(3.2, 1) },
  { id: '3', name: 'Water', unit: 'L', color: '#06b6d4', houseId: 'h1', entries: genSampleEntries(180, 40) },
]

// Least-squares polynomial regression, returns array of fitted y values
function polyfit(ys, degree) {
  const n = ys.length
  if (n < degree + 1) return ys.slice()
  const xs = ys.map((_, i) => i)
  // Build Vandermonde matrix A (n × d+1) and solve normal equations AᵀA·c = Aᵀy
  const d = degree + 1
  const A = xs.map(x => Array.from({ length: d }, (_, p) => Math.pow(x, p)))
  // AᵀA
  const AtA = Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => A.reduce((s, row) => s + row[i] * row[j], 0)))
  // Aᵀy
  const Aty = Array.from({ length: d }, (_, i) => A.reduce((s, row, r) => s + row[i] * ys[r], 0))
  // Gaussian elimination
  const aug = AtA.map((row, i) => [...row, Aty[i]])
  for (let col = 0; col < d; col++) {
    let maxRow = col
    for (let r = col + 1; r < d; r++) if (Math.abs(aug[r][col]) > Math.abs(aug[maxRow][col])) maxRow = r;
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]]
    for (let r = col + 1; r < d; r++) {
      const f = aug[r][col] / aug[col][col]
      for (let c = col; c <= d; c++) aug[r][c] -= f * aug[col][c]
    }
  }
  const coef = new Array(d).fill(0)
  for (let i = d - 1; i >= 0; i--) {
    coef[i] = aug[i][d]
    for (let j = i + 1; j < d; j++) coef[i] -= aug[i][j] * coef[j]
    coef[i] /= aug[i][i]
  }
  return xs.map(x => +coef.reduce((s, c, p) => s + c * Math.pow(x, p), 0).toFixed(2))
}

function MeterChart({ counter, chartType, expanded, groupBy = 'day', showAvg = false, showTrend = false }) {
  const { t } = useTranslation()
  const chartRef = useRef(null)
  const sortedEntries = useMemo(() => [...counter.entries].sort((a,b) => a.date.localeCompare(b.date)), [counter.entries])

  const { labels, values } = useMemo(() => {
    if (groupBy === 'month') {
      const buckets = {}
      for (const e of sortedEntries) {
        const key = e.date.slice(0, 7)
        if (!buckets[key]) buckets[key] = 0
        buckets[key] += e.value
      }
      const keys = Object.keys(buckets).sort()
      return {
        labels: keys.map(k => {
          const [y, m] = k.split('-')
          return new Date(+y, +m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        }),
        values: keys.map(k => +buckets[k].toFixed(2)),
      }
    }
    return {
      labels: sortedEntries.map(e => {
        const d = new Date(e.date + 'T00:00:00')
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }),
      values: sortedEntries.map(e => e.value),
    }
  }, [sortedEntries, groupBy])

  const avgValues = useMemo(() => {
    if (!showAvg || values.length === 0) return null
    const avg = +(values.reduce((s, v) => s + v, 0) / values.length).toFixed(2)
    return new Array(values.length).fill(avg)
  }, [values, showAvg])

  const trendValues = useMemo(() => {
    if (!showTrend || values.length < 3) return null
    return polyfit(values, 3)
  }, [values, showTrend])

  const color = counter.color

  const overlayDatasets = []
  if (avgValues) overlayDatasets.push({
    label: t('chart.average'),
    data: avgValues,
    borderColor: '#a78bfa',
    borderWidth: 1.5,
    borderDash: [5, 4],
    pointRadius: 0,
    pointHoverRadius: 0,
    fill: false,
    tension: 0,
    order: 0,
  })
  if (trendValues) overlayDatasets.push({
    label: t('chart.trend'),
    data: trendValues,
    borderColor: '#f59e0b',
    borderWidth: 2,
    borderDash: [3, 3],
    pointRadius: 0,
    pointHoverRadius: 0,
    fill: false,
    tension: 0.4,
    order: 0,
  })

  const commonDataset = {
    label: counter.unit,
    data: values,
    borderColor: color,
    borderWidth: 2.5,
    tension: 0.4,
    pointRadius: 0,
    pointHoverRadius: 5,
    pointHoverBackgroundColor: color,
    pointHoverBorderColor: '#fff',
    pointHoverBorderWidth: 2,
    order: 1,
  }

  const lineData = {
    labels,
    datasets: [{
      ...commonDataset,
      backgroundColor: (ctx) => {
        const canvas = ctx.chart.ctx
        const gradient = canvas.createLinearGradient(0, 0, 0, expanded ? 500 : 200)
        gradient.addColorStop(0, color + '55')
        gradient.addColorStop(1, color + '00')
        return gradient
      },
      fill: true,
    }, ...overlayDatasets]
  }

  const barData = {
    labels,
    datasets: [{
      ...commonDataset,
      backgroundColor: color + 'cc',
      borderWidth: 0,
      borderRadius: 6,
      barPercentage: 0.6,
    }, ...overlayDatasets.map(ds => ({ ...ds, type: 'line' }))]
  }

  const tooltipLabelCb = (ctx) => {
    if (ctx.dataset.label === t('chart.average')) return ` ${t('chart.average')}: ${ctx.parsed.y} ${counter.unit}`
    if (ctx.dataset.label === t('chart.trend')) return ` ${t('chart.trend')}: ${ctx.parsed.y} ${counter.unit}`
    return ` ${ctx.parsed.y} ${counter.unit}`
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1a24',
        borderColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1,
        titleColor: '#9090a8',
        bodyColor: '#f0f0f8',
        padding: 12,
        cornerRadius: 10,
        callbacks: { label: tooltipLabelCb }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        border: { display: false },
        ticks: { color: '#5a5a72', font: { family: 'DM Sans', size: 11 }, maxTicksLimit: expanded ? 15 : 8, maxRotation: 0 }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        border: { display: false },
        ticks: { color: '#5a5a72', font: { family: 'DM Sans', size: 11 }, callback: v => `${v} ${counter.unit}` }
      }
    }
  }

  if (chartType === 'bar') {
    return <Bar ref={chartRef} data={barData} options={options} style={{ width: '100%', height: '100%' }} />
  }
  return <Line ref={chartRef} data={lineData} options={options} style={{ width: '100%', height: '100%' }} />
}

function LanguageSwitcher() {
  const { i18n } = useTranslation()
  
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('language', lng)
  }

  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--bg4)', borderRadius: 8, padding: 4 }}>
      {[
        { code: 'en', label: 'EN', flag: '🇬🇧' },
        { code: 'ro', label: 'RO', flag: '🇷🇴' }
      ].map(({ code, label, flag }) => (
        <button
          key={code}
          onClick={() => changeLanguage(code)}
          style={{
            background: i18n.language === code ? 'var(--bg3)' : 'transparent',
            border: i18n.language === code ? '1px solid var(--border2)' : '1px solid transparent',
            borderRadius: 6,
            padding: '6px 10px',
            color: i18n.language === code ? 'var(--text)' : 'var(--text2)',
            cursor: 'pointer',
            fontFamily: 'DM Sans',
            fontSize: 12,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            transition: 'all 0.15s'
          }}
          onMouseEnter={e => { 
            if (i18n.language !== code) {
              e.currentTarget.style.background = 'var(--bg3)22'
            }
          }}
          onMouseLeave={e => { 
            if (i18n.language !== code) {
              e.currentTarget.style.background = 'transparent'
            }
          }}
        >
          <span>{flag}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}

function ChartTypeToggle({ type, onToggle, color }) {
  const { t } = useTranslation()
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--bg4)', borderRadius: 10, padding: 4 }}>
      {['line', 'bar'].map(chartType => (
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

function GroupByToggle({ groupBy, onToggle, color }) {
  const { t } = useTranslation()
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--bg4)', borderRadius: 10, padding: 4 }}>
      {[{ value: 'day', label: t('chart.daily') }, { value: 'month', label: t('chart.monthly') }].map(({ value, label }) => (
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

function OverlayToggles({ showAvg, showTrend, onToggleAvg, onToggleTrend }) {
  const { t } = useTranslation()
  const item = (checked, onToggle, dotColor, label) => (
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

function StatCard({ label, value, unit, color, percent }) {
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

function AddCounterModal({ onClose, onAdd, houses, defaultHouseId }) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('kWh')
  const [color, setColor] = useState(PALETTE[0])
  const [houseId, setHouseId] = useState(defaultHouseId || houses[0]?.id || '')

  const handleSubmit = () => {
    if (!name.trim()) return
    onAdd({ id: crypto.randomUUID(), name: name.trim(), unit, color, houseId, entries: [] })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>{t('counter.new')}</h2>
        <div className="modal-field">
          <label>{t('fields.name')}</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t('placeholders.counter_name')} autoFocus onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>
        <div className="modal-field">
          <label>{t('fields.unit')}</label>
          <input value={unit} onChange={e => setUnit(e.target.value)} placeholder={t('placeholders.unit')} />
        </div>
        {houses.length > 1 && (
          <div className="modal-field">
            <label>{t('fields.house')}</label>
            <select value={houseId} onChange={e => setHouseId(e.target.value)}>
              {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
        )}
        <div className="modal-field">
          <label>{t('fields.color')}</label>
          <div className="color-grid">
            {PALETTE.map(c => (
              <div key={c} className={`color-swatch${c === color ? ' selected' : ''}`} style={{ background: c }} onClick={() => setColor(c)} />
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>{t('actions.cancel')}</button>
          <button className="btn-primary" style={{ '--accent': color }} onClick={handleSubmit}>{t('counter.add')}</button>
        </div>
      </div>
    </div>
  )
}

function AddHouseModal({ onClose, onAdd }) {
  const { t } = useTranslation()
  const [name, setName] = useState('')

  const handleSubmit = () => {
    if (!name.trim()) return
    onAdd({ id: crypto.randomUUID(), name: name.trim() })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>{t('house.new')}</h2>
        <div className="modal-field">
          <label>{t('fields.name')}</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t('placeholders.house_name')} autoFocus onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>{t('actions.cancel')}</button>
          <button className="btn-primary" onClick={handleSubmit}>{t('house.add')}</button>
        </div>
      </div>
    </div>
  )
}

function AddEntryModal({ counter, onClose, onAdd }) {
  const { t } = useTranslation()
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')

  const handleSubmit = () => {
    const v = parseFloat(value)
    if (!date || isNaN(v)) return
    onAdd({ id: crypto.randomUUID(), date, value: v, note })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>{t('entry.add')}</h2>
        <div className="modal-field">
          <label>{t('fields.date')}</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="modal-field">
          <label>{t('fields.value')} ({counter.unit})</label>
          <input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder={t('placeholders.value')} step="0.01" autoFocus onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>
        <div className="modal-field">
          <label>{t('fields.note')} {t('entries.optional')}</label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder={t('placeholders.note')} />
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>{t('actions.cancel')}</button>
          <button className="btn-primary" style={{ '--accent': counter.color }} onClick={handleSubmit}>{t('entry.save')}</button>
        </div>
      </div>
    </div>
  )
}

function ExpandedChart({ counter, chartType, onClose, onToggleType, groupBy, onToggleGroupBy, showAvg, showTrend, onToggleAvg, onToggleTrend }) {
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

function downloadFile(filename, content, mime = 'text/csv') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function SettingsPage({ counters, onImport, onBack }) {
  const { t } = useTranslation()
  const [importFeedback, setImportFeedback] = useState({})
  const fileInputRef = useRef(null)
  const currentCounterRef = useRef(null)

  const handleImportClick = (counterId) => {
    currentCounterRef.current = counterId
    fileInputRef.current?.click()
  }

  const handleExport = (counter) => {
    const rows = ['date,value,note', ...counter.entries
      .slice().sort((a, b) => a.date.localeCompare(b.date))
      .map(e => `${e.date},${e.value},${e.note ?? ''}`)]
    downloadFile(`${counter.name.toLowerCase().replace(/\s+/g, '_')}_entries.csv`, rows.join('\n'))
  }

  const handleDownloadTemplate = () => {
    const rows = ['date,value,note', '2024-01-15,14.5,Meter read', '2024-01-16,12.3,', '2024-01-17,15.8,High usage']
    downloadFile('counter_template.csv', rows.join('\n'))
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file || !currentCounterRef.current) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result
      if (typeof text === 'string') {
        const entries = parseCSV(text)
        if (entries.length === 0) {
          setImportFeedback(prev => ({ ...prev, [currentCounterRef.current]: t('settings.import_error') }))
          setTimeout(() => setImportFeedback(prev => {
            const updated = { ...prev }
            delete updated[currentCounterRef.current]
            return updated
          }), 3000)
          return
        }
        onImport(currentCounterRef.current, entries)
        setImportFeedback(prev => ({ ...prev, [currentCounterRef.current]: t('settings.import_success', { count: entries.length }) }))
        setTimeout(() => setImportFeedback(prev => {
          const updated = { ...prev }
          delete updated[currentCounterRef.current]
          return updated
        }), 3000)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
      <div style={{
        padding: '22px 28px 18px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16
      }}>
        <div>
          <div style={{ fontFamily: 'Outfit', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>{t('settings.title')}</div>
          <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 1 }}>{t('settings.subtitle')}</div>
        </div>
        <button
          onClick={onBack}
          style={{
            background: 'transparent', border: 'none', padding: '7px 10px', borderRadius: 9,
            cursor: 'pointer', color: 'var(--text2)', fontFamily: 'DM Sans', fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 6, transition: 'color 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text2)'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          {t('settings.back')}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
        <div style={{ marginBottom: 32, padding: '16px 20px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: 'Outfit', fontSize: 14, fontWeight: 600 }}>{t('settings.language')}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{t('settings.language_subtitle')}</div>
            </div>
          </div>
          <LanguageSwitcher />
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {counters.map(counter => (
            <div
              key={counter.id}
              style={{
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: counter.color + '22',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {getIcon(counter.name, counter.color)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                    {counter.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                    {t('settings.entries_count', { count: counter.entries.length })} • {counter.unit}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 'fit-content' }}>
                {importFeedback[counter.id] && (
                  <div style={{
                    fontSize: 12,
                    color: importFeedback[counter.id].startsWith('✓') ? '#10b981' : '#ef4444'
                  }}>
                    {importFeedback[counter.id]}
                  </div>
                )}
                <button
                  onClick={() => handleExport(counter)}
                  style={{
                    background: 'var(--bg4)', border: '1px solid var(--border)',
                    borderRadius: 9, padding: '7px 14px',
                    color: 'var(--text2)', cursor: 'pointer',
                    fontFamily: 'DM Sans', fontSize: 13, fontWeight: 500,
                    display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--text3)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text2)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  {t('settings.export')}
                </button>
                <button
                  onClick={() => handleImportClick(counter.id)}
                  style={{
                    background: counter.color + '22',
                    border: `1px solid ${counter.color}55`,
                    borderRadius: 9,
                    padding: '7px 14px',
                    color: counter.color,
                    cursor: 'pointer',
                    fontFamily: 'DM Sans',
                    fontSize: 13,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = counter.color + '33'
                    e.currentTarget.style.borderColor = counter.color + '77'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = counter.color + '22'
                    e.currentTarget.style.borderColor = counter.color + '55'
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  {t('settings.import')}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 32, padding: '16px 20px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontFamily: 'Outfit', fontSize: 14, fontWeight: 600 }}>{t('settings.csv_format')}</div>
            <button
              onClick={handleDownloadTemplate}
              style={{
                background: 'var(--bg4)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '5px 12px',
                color: 'var(--text2)', cursor: 'pointer',
                fontFamily: 'DM Sans', fontSize: 12, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--text3)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text2)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {t('settings.download_template')}
            </button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
            <p style={{ margin: '0 0 8px 0' }}>{t('settings.format_description')}</p>
            <code style={{ display: 'block', background: 'var(--bg3)', padding: '8px 12px', borderRadius: 6, overflow: 'auto', fontSize: 11 }}>
              date,value,note<br/>2024-01-15,14.5,Meter read<br/>2024-01-16,12.3,<br/>2024-01-17,15.8,High usage
            </code>
            <p style={{ margin: '8px 0 0 0' }} dangerouslySetInnerHTML={{ __html: t('settings.format_notes') }} />
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  )
}

export default function App() {
  const { t } = useTranslation()
  const [houses, setHouses] = useState(INITIAL_HOUSES)
  const [counters, setCounters] = useState(INITIAL_COUNTERS)
  const [selectedId, setSelectedId] = useState(INITIAL_COUNTERS[0].id)
  const [chartType, setChartType] = useState('line')
  const [groupBy, setGroupBy] = useState('day')
  const [showAvg, setShowAvg] = useState(false)
  const [showTrend, setShowTrend] = useState(false)
  const [showAddCounter, setShowAddCounter] = useState(false)
  const [showAddHouse, setShowAddHouse] = useState(false)
  const [showAddEntry, setShowAddEntry] = useState(false)
  const [showExpandedChart, setShowExpandedChart] = useState(false)
  const [addingToHouseId, setAddingToHouseId] = useState(INITIAL_HOUSES[0].id)
  const [view, setView] = useState('dashboard')
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768)
  const isMobile = windowWidth < 768

  const counter = counters.find(c => c.id === selectedId) || counters[0]
  const sortedEntries = useMemo(() =>
    [...(counter?.entries || [])].sort((a,b) => b.date.localeCompare(a.date)),
    [counter?.entries]
  )

  const stats = useMemo(() => {
    if (!counter?.entries.length) return null
    const vals = counter.entries.map(e => e.value)
    const avg = vals.reduce((a,b) => a+b, 0) / vals.length

    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const todayEntry = counter.entries.find(e => e.date === today)
    const yesterdayEntry = counter.entries.find(e => e.date === yesterday)

    let diff = null, diffPercent = null
    if (todayEntry && yesterdayEntry) {
      diff = (todayEntry.value - yesterdayEntry.value).toFixed(2)
      diffPercent = ((diff / yesterdayEntry.value) * 100).toFixed(1)
    }

    return {
      avg: avg.toFixed(2),
      total: vals.reduce((a,b) => a+b, 0).toFixed(1),
      max: Math.max(...vals).toFixed(2),
      min: Math.min(...vals).toFixed(2),
      diff,
      diffPercent,
    }
  }, [counter?.entries])

  const addHouse = (h) => { setHouses(prev => [...prev, h]) }

  const addCounter = (c) => { setCounters(prev => [...prev, c]); setSelectedId(c.id) }

  const addEntry = (entry) => {
    setCounters(prev => prev.map(c => c.id === selectedId
      ? { ...c, entries: [...c.entries.filter(e => e.date !== entry.date), entry] }
      : c
    ))
  }

  const deleteEntry = (id) => {
    setCounters(prev => prev.map(c => c.id === selectedId
      ? { ...c, entries: c.entries.filter(e => e.id !== id) }
      : c
    ))
  }

  const deleteCounter = (id) => {
    const next = counters.filter(c => c.id !== id)
    setCounters(next)
    if (selectedId === id) setSelectedId(next[0]?.id || null)
  }

  const importEntries = (counterId, newEntries) => {
    setCounters(prev => prev.map(c => {
      if (c.id !== counterId) return c
      const existingDates = new Set(c.entries.map(e => e.date))
      const toAdd = newEntries.filter(e => !existingDates.has(e.date))
      return { ...c, entries: [...c.entries, ...toAdd] }
    }))
  }

  useEffect(() => {
    const handler = e => {
      if (e.key === 'Escape') {
        setShowExpandedChart(false)
        setShowAddCounter(false)
        setShowAddEntry(false)
        if (isMobile) setSidebarOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isMobile])

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth
      setWindowWidth(w)
      setSidebarOpen(w >= 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div style={{ height: '100vh', background: 'var(--bg)', display: 'flex', justifyContent: 'center' }}>
    <div style={{ display: 'flex', width: '100%', maxWidth: 1440, height: '100vh', overflow: 'hidden', position: 'relative' }}>
      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 199,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: 'var(--sidebar-w)', minWidth: 'var(--sidebar-w)',
        background: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        ...(isMobile ? {
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 200,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
        } : {})
      }}>
        <div style={{ padding: '24px 20px 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'Outfit', fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            {t('app.title')}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
          {houses.map(house => {
            const houseCounters = counters.filter(c => c.houseId === house.id)
            return (
              <div key={house.id} style={{ marginBottom: 16 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  paddingLeft: 8, paddingRight: 4, marginBottom: 4
                }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                    {house.name}
                  </div>
                  <button
                    title={`Add counter to ${house.name}`}
                    onClick={() => { setAddingToHouseId(house.id); setShowAddCounter(true) }}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'var(--text3)', padding: '2px 4px', borderRadius: 5,
                      display: 'flex', alignItems: 'center', transition: 'color 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                </div>
                {houseCounters.length === 0 && (
                  <div style={{ paddingLeft: 8, fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>{t('counter.no_counters')}</div>
                )}
                {houseCounters.map(c => (
                  <div
                    key={c.id}
                    onClick={() => { setSelectedId(c.id); if (isMobile) setSidebarOpen(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 10px', borderRadius: 11, marginBottom: 2,
                      cursor: 'pointer',
                      background: c.id === selectedId ? c.color + '18' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                      background: c.color + '22',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {getIcon(c.name, c.color)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 500, fontSize: 13,
                        color: c.id === selectedId ? c.color : 'var(--text)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{c.unit}</div>
                    </div>
                    {c.id === selectedId && (
                      <div style={{ width: 4, height: 4, borderRadius: 99, background: c.color, flexShrink: 0 }} />
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={() => setShowAddHouse(true)}
            style={{
              width: '100%', padding: '9px', borderRadius: 11,
              background: 'var(--bg3)', border: '1px dashed var(--border2)',
              color: 'var(--text2)', cursor: 'pointer',
              fontFamily: 'DM Sans', fontSize: 13, fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              transition: 'background 0.15s, color 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg4)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.color = 'var(--text2)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            {t('house.add')}
          </button>
          <button
            onClick={() => { setView('settings'); if (isMobile) setSidebarOpen(false) }}
            style={{
              width: '100%', padding: '9px', borderRadius: 11,
              background: view === 'settings' ? 'var(--bg4)' : 'var(--bg3)',
              border: '1px solid var(--border)',
              color: view === 'settings' ? 'var(--text)' : 'var(--text2)',
              cursor: 'pointer',
              fontFamily: 'DM Sans', fontSize: 13, fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              transition: 'background 0.15s, color 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg4)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={e => { e.currentTarget.style.background = view === 'settings' ? 'var(--bg4)' : 'var(--bg3)'; e.currentTarget.style.color = view === 'settings' ? 'var(--text)' : 'var(--text2)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="1"/><path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 0l4.24-4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08 0l4.24 4.24"/></svg>
            {t('settings.title')}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
        {view === 'settings' ? (
          <SettingsPage counters={counters} onImport={importEntries} onBack={() => setView('dashboard')} />
        ) : counter ? (
          <>
            <div style={{
              padding: isMobile ? '14px 16px 12px' : '22px 28px 18px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14 }}>
                {isMobile && (
                  <button
                    onClick={() => setSidebarOpen(true)}
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
                  {getIcon(counter.name, counter.color)}
                </div>
                <div>
                  <div style={{ fontFamily: 'Outfit', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>{counter.name}</div>
                  <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 1 }}>{counter.entries.length} entries</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={() => { if (window.confirm(t('counter.delete_confirm', { name: counter.name }))) deleteCounter(counter.id) }}
                  style={{ background: 'transparent', border: 'none', padding: '7px 10px', borderRadius: 9, cursor: 'pointer', color: 'var(--text3)', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
                <button
                  onClick={() => setShowAddEntry(true)}
                  style={{
                    background: counter.color, border: 'none', borderRadius: 10,
                    padding: '8px 16px', color: '#fff', cursor: 'pointer',
                    fontFamily: 'DM Sans', fontSize: 13, fontWeight: 500,
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
              {stats && (
                <div className="stats-row" style={{ display: 'flex', gap: 10, marginBottom: 16, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', paddingBottom: 2 }}>
                  {stats.diff !== null && (
                    <StatCard label={t('stats.today_vs_yesterday')} value={stats.diff} unit={counter.unit} color={counter.color} percent={stats.diffPercent} />
                  )}
                  <StatCard label={t('stats.average')} value={stats.avg} unit={counter.unit} color={counter.color} />
                  <StatCard label={t('stats.total')} value={stats.total} unit={counter.unit} color={counter.color} />
                  <StatCard label={t('stats.peak')} value={stats.max} unit={counter.unit} color={counter.color} />
                  <StatCard label={t('stats.lowest')} value={stats.min} unit={counter.unit} color={counter.color} />
                </div>
              )}

              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, padding: '20px 22px', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: 'Outfit', fontSize: 15, fontWeight: 600 }}>{t('chart.usage_over_time')}</div>
                    <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 2 }}>{t('chart.last_entries', { count: counter.entries.length })}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <GroupByToggle groupBy={groupBy} onToggle={setGroupBy} color={counter.color} />
                    <ChartTypeToggle type={chartType} onToggle={setChartType} color={counter.color} />
                    <button
                      onClick={() => setShowExpandedChart(true)}
                      style={{
                        background: 'var(--bg4)', border: 'none', borderRadius: 9,
                        padding: '7px 10px', cursor: 'pointer', color: 'var(--text2)',
                        display: 'flex', alignItems: 'center', gap: 5,
                        fontFamily: 'DM Sans', fontSize: 12,
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
                  <OverlayToggles showAvg={showAvg} showTrend={showTrend} onToggleAvg={() => setShowAvg(v => !v)} onToggleTrend={() => setShowTrend(v => !v)} />
                </div>
                <div style={{ height: 200 }}>
                  {counter.entries.length > 0
                    ? <MeterChart counter={counter} chartType={chartType} expanded={false} groupBy={groupBy} showAvg={showAvg} showTrend={showTrend} />
                    : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 13 }}>{t('entry.no_data')}</div>
                  }
                </div>
              </div>

              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 500 }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'Outfit', fontSize: 15, fontWeight: 600 }}>{t('entries.title')}</div>
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
                              <span style={{ fontFamily: 'Outfit', fontWeight: 600, fontSize: 15, color: counter.color }}>{entry.value}</span>
                              <span style={{ color: 'var(--text3)', fontSize: 12, marginLeft: 4 }}>{counter.unit}</span>
                            </td>
                            <td style={{ padding: '12px 20px', fontSize: 12, color: 'var(--text3)' }}>{entry.note || '—'}</td>
                            <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                              <button
                                onClick={() => deleteEntry(entry.id)}
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
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, position: 'relative' }}>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                style={{ position: 'absolute', top: 16, left: 16, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: '4px', borderRadius: 8, display: 'flex', alignItems: 'center' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
            )}
            <div style={{ fontSize: 40 }}>⚡</div>
            <div style={{ fontFamily: 'Outfit', fontSize: 18, fontWeight: 600 }}>{t('counter.no_counters')}</div>
            <div style={{ color: 'var(--text2)', fontSize: 14 }}>Add your first counter to start tracking</div>
            <button
              onClick={() => setShowAddCounter(true)}
              style={{ marginTop: 8, background: '#3b82f6', border: 'none', borderRadius: 12, padding: '10px 22px', color: '#fff', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 14, fontWeight: 500 }}
            >
              {t('counter.add')}
            </button>
          </div>
        )
        }
      </main>

      {showAddCounter && <AddCounterModal onClose={() => setShowAddCounter(false)} onAdd={addCounter} houses={houses} defaultHouseId={addingToHouseId} />}
      {showAddHouse && <AddHouseModal onClose={() => setShowAddHouse(false)} onAdd={addHouse} />}
      {showAddEntry && counter && <AddEntryModal counter={counter} onClose={() => setShowAddEntry(false)} onAdd={addEntry} />}
      {showExpandedChart && counter && (
        <ExpandedChart counter={counter} chartType={chartType} onClose={() => setShowExpandedChart(false)} onToggleType={setChartType} groupBy={groupBy} onToggleGroupBy={setGroupBy} showAvg={showAvg} showTrend={showTrend} onToggleAvg={() => setShowAvg(v => !v)} onToggleTrend={() => setShowTrend(v => !v)} />
      )}
    </div>
    </div>
  )
}
