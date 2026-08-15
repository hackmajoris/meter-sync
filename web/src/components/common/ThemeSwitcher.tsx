import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

export type Theme = 'dark' | 'light'

export interface ThemeSwitcherProps {
  theme: Theme
  onChange: (theme: Theme) => void
}

export const ThemeSwitcher: FC<ThemeSwitcherProps> = ({ theme, onChange }) => {
  const { t } = useTranslation()
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--bg4)', borderRadius: 8, padding: 4 }}>
      {[
        { value: 'dark' as const, label: t('settings.theme_dark'), icon: '🌙' },
        { value: 'light' as const, label: t('settings.theme_light'), icon: '☀️' }
      ].map(({ value, label, icon }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          style={{
            background: theme === value ? 'var(--bg3)' : 'transparent',
            border: theme === value ? '1px solid var(--border2)' : '1px solid transparent',
            borderRadius: 6,
            padding: '6px 10px',
            color: theme === value ? 'var(--text)' : 'var(--text2)',
            cursor: 'pointer',
            fontFamily: 'Inter Variable',
            fontSize: 12,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            transition: 'all 0.15s'
          }}
        >
          <span>{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
