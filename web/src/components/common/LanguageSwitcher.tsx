import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

export const LanguageSwitcher: FC = () => {
  const { i18n } = useTranslation()
  
  const changeLanguage = (lng: string) => {
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
