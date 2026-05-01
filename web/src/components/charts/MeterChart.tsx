import { useRef, useMemo, type FC } from 'react'
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
import type { CounterWithEntries } from '../../hooks/useAppData'
import { polyfit } from '../../utils/helpers'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip)

export interface MeterChartProps {
  counter: CounterWithEntries
  chartType: 'line' | 'bar'
  expanded: boolean
  groupBy?: 'day' | 'month'
  showAvg?: boolean
  showTrend?: boolean
}

export const MeterChart: FC<MeterChartProps> = ({ 
  counter, 
  chartType, 
  expanded, 
  groupBy = 'day', 
  showAvg = false, 
  showTrend = false 
}) => {
  const { t } = useTranslation()
  const chartRef = useRef(null)
  const sortedEntries = useMemo(() => [...counter.entries].sort((a,b) => a.date.localeCompare(b.date)), [counter.entries])

  const { labels, values } = useMemo(() => {
    if (groupBy === 'month') {
      const buckets: Record<string, number> = {}
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
      backgroundColor: (ctx: any) => {
        const canvas = ctx.chart.ctx
        const gradient = canvas.createLinearGradient(0, 0, 0, expanded ? 500 : 200)
        gradient.addColorStop(0, color + '55')
        gradient.addColorStop(1, color + '00')
        return gradient
      },
      fill: true,
    }, ...overlayDatasets]
  }

  const barData: any = {
    labels,
    datasets: [{
      ...commonDataset,
      backgroundColor: color + 'cc',
      borderWidth: 0,
      borderRadius: 6,
      barPercentage: 0.6,
    }, ...overlayDatasets.map(ds => ({ ...ds, type: 'line' as const }))]
  }

  const tooltipLabelCb = (ctx: any) => {
    if (ctx.dataset.label === t('chart.average')) return ` ${t('chart.average')}: ${ctx.parsed.y} ${counter.unit}`
    if (ctx.dataset.label === t('chart.trend')) return ` ${t('chart.trend')}: ${ctx.parsed.y} ${counter.unit}`
    return ` ${ctx.parsed.y} ${counter.unit}`
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
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
        ticks: { color: '#5a5a72', font: { family: 'DM Sans', size: 11 }, callback: (v: any) => `${v} ${counter.unit}` }
      }
    }
  }

  if (chartType === 'bar') {
    return <Bar ref={chartRef} data={barData} options={options} style={{ width: '100%', height: '100%' }} />
  }
  return <Line ref={chartRef} data={lineData} options={options} style={{ width: '100%', height: '100%' }} />
}
