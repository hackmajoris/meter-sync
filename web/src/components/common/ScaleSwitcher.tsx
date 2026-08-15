import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

export type Scale = 'sm' | 'md' | 'lg'

export const SCALE_ZOOM: Record<Scale, number> = { sm: 0.9, md: 1, lg: 1.1 }

export interface ScaleSwitcherProps {
  scale: Scale
  onChange: (scale: Scale) => void
}

export const ScaleSwitcher: FC<ScaleSwitcherProps> = ({ scale, onChange }) => {
  const { t } = useTranslation()
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--bg4)', borderRadius: 8, padding: 4 }}>
      {[
        { value: 'sm' as const, label: t('settings.scale_sm') },
        { value: 'md' as const, label: t('settings.scale_md') },
        { value: 'lg' as const, label: t('settings.scale_lg') }
      ].map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          style={{
            background: scale === value ? 'var(--bg3)' : 'transparent',
            border: scale === value ? '1px solid var(--border2)' : '1px solid transparent',
            borderRadius: 6,
            padding: '6px 12px',
            color: scale === value ? 'var(--text)' : 'var(--text2)',
            cursor: 'pointer',
            fontFamily: 'Inter Variable',
            fontSize: 12,
            fontWeight: 500,
            transition: 'all 0.15s'
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
