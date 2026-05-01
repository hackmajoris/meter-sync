import { useRef, useState, useEffect, type FC } from 'react'
import { useTranslation } from 'react-i18next'
import type { CounterWithEntries } from '../../hooks/useAppData'
import { parseCSV, downloadFile } from '../../utils/helpers'
import { getCounterIcon } from '../icons/CounterIcons'
import { LanguageSwitcher } from '../common/LanguageSwitcher'

const isElectron = !!window.electronAPI

export interface SettingsPageProps {
  counters: CounterWithEntries[]
  onImport: (counterId: string, entries: Array<{ date: string; value: number; note?: string }>) => Promise<{ created: number; skipped: number }>
  onBack: () => void
}

export const SettingsPage: FC<SettingsPageProps> = ({ counters, onImport, onBack }) => {
  const { t } = useTranslation()
  const [importFeedback, setImportFeedback] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const currentCounterRef = useRef<string | null>(null)

  // Database section state (Electron only)
  const [dbPath, setDbPath] = useState<string | null>(null)
  const [keySet, setKeySet] = useState(false)
  const [changingKey, setChangingKey] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newKeyConfirm, setNewKeyConfirm] = useState('')
  const [keyError, setKeyError] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    if (!isElectron) return
    window.electronAPI!.getConfig().then(cfg => {
      setDbPath(cfg.dbPath)
      setKeySet(cfg.keySet)
    })
  }, [])

  async function handleChangeKey(e: React.FormEvent) {
    e.preventDefault()
    if (newKey !== newKeyConfirm) { setKeyError('Passwords do not match.'); return }
    setKeyError(null)
    const result = await window.electronAPI!.changeKey(newKey)
    if (result.ok) {
      setKeySet(true)
      setChangingKey(false)
      setNewKey('')
      setNewKeyConfirm('')
    } else {
      setKeyError(result.error ?? 'Failed to change password.')
    }
  }

  const handleImportClick = (counterId: string) => {
    currentCounterRef.current = counterId
    fileInputRef.current?.click()
  }

  const handleExport = (counter: CounterWithEntries) => {
    const rows = ['date,value,note', ...counter.entries
      .slice().sort((a, b) => a.date.localeCompare(b.date))
      .map(e => `${e.date},${e.value},${e.note ?? ''}`)]
    downloadFile(`${counter.name.toLowerCase().replace(/\s+/g, '_')}_entries.csv`, rows.join('\n'))
  }

  const handleDownloadTemplate = () => {
    const rows = ['date,value,note', '2024-01-15,14.5,Meter read', '2024-01-16,12.3,', '2024-01-17,15.8,High usage']
    downloadFile('counter_template.csv', rows.join('\n'))
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentCounterRef.current) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      const text = evt.target?.result
      if (typeof text === 'string') {
        const entries = parseCSV(text)
        if (entries.length === 0) {
          setImportFeedback(prev => ({ ...prev, [currentCounterRef.current!]: t('settings.import_error') }))
          setTimeout(() => setImportFeedback(prev => {
            const updated = { ...prev }
            delete updated[currentCounterRef.current!]
            return updated
          }), 3000)
          return
        }
        try {
          const result = await onImport(currentCounterRef.current!, entries)
          setImportFeedback(prev => ({ ...prev, [currentCounterRef.current!]: t('settings.import_success', { count: result.created }) }))
          setTimeout(() => setImportFeedback(prev => {
            const updated = { ...prev }
            delete updated[currentCounterRef.current!]
            return updated
          }), 3000)
        } catch (error) {
          setImportFeedback(prev => ({ ...prev, [currentCounterRef.current!]: t('settings.import_error') }))
          setTimeout(() => setImportFeedback(prev => {
            const updated = { ...prev }
            delete updated[currentCounterRef.current!]
            return updated
          }), 3000)
        }
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

        {/* Database section — Electron only */}
        {isElectron && (
          <div style={{ marginBottom: 32, padding: '16px 20px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12 }}>
            <div style={{ fontFamily: 'Outfit', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{t('settings.database')}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>{t('settings.database_subtitle')}</div>

            {/* Location row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 3, fontWeight: 500 }}>{t('settings.db_location')}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', wordBreak: 'break-all' }}>{dbPath ?? '—'}</div>
              </div>
            </div>

            {/* Encryption key row */}
            <div style={{ paddingTop: 14, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 3, fontWeight: 500 }}>{t('settings.db_password')}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>{keySet ? '••••••••' : 'Not set'}</div>
                </div>
                <button
                  onClick={() => { setChangingKey(v => !v); setKeyError(null); setNewKey(''); setNewKeyConfirm('') }}
                  style={{ background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--text2)', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 500, flexShrink: 0 }}
                >
                  {changingKey ? t('settings.cancel') : t('settings.db_change_password')}
                </button>
              </div>
              {changingKey && (
                <form onSubmit={handleChangeKey} style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 12, color: '#f59e0b', lineHeight: 1.5, background: 'rgba(245,158,11,0.08)', borderRadius: 8, padding: '8px 12px' }}>
                    {t('settings.db_password_warning')}
                  </div>
                  <input
                    type="password"
                    placeholder={t('settings.db_new_password')}
                    value={newKey}
                    onChange={e => setNewKey(e.target.value)}
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 13, outline: 'none' }}
                  />
                  <input
                    type="password"
                    placeholder={t('settings.db_confirm_password')}
                    value={newKeyConfirm}
                    onChange={e => setNewKeyConfirm(e.target.value)}
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 13, outline: 'none' }}
                  />
                  {keyError && <div style={{ fontSize: 12, color: '#ef4444' }}>{keyError}</div>}
                  <button
                    type="submit"
                    disabled={!newKey || !newKeyConfirm || newKey !== newKeyConfirm}
                    style={{ background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 8, padding: '9px', color: 'var(--text)', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 500, opacity: (!newKey || !newKeyConfirm || newKey !== newKeyConfirm) ? 0.4 : 1 }}
                  >
                    {t('settings.db_set_password')}
                  </button>
                </form>
              )}
            </div>

            {/* Reset row */}
            <div style={{ paddingTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 3, fontWeight: 500 }}>{t('settings.db_reset')}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{t('settings.db_reset_desc')}</div>
              </div>
              {confirmReset ? (
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => window.electronAPI!.resetConfig()}
                    style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '6px 12px', color: '#ef4444', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 500 }}
                  >
                    {t('settings.db_confirm_reset')}
                  </button>
                  <button onClick={() => setConfirmReset(false)} style={{ background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--text2)', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 500 }}>
                    {t('settings.cancel')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmReset(true)}
                  style={{ background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--text3)', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 500, flexShrink: 0 }}
                >
                  {t('settings.db_reset_btn')}
                </button>
              )}
            </div>
          </div>
        )}

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
                  {getCounterIcon(counter.name, counter.color)}
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
