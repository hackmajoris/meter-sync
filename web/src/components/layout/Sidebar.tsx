import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import type { House } from '../../lib'
import type { CounterWithEntries } from '../../hooks/useAppData'
import { getCounterIcon } from '../icons/CounterIcons'

export interface SidebarProps {
  houses: House[]
  counters: CounterWithEntries[]
  selectedId: string | null
  onSelectCounter: (id: string) => void
  onAddCounter: (houseId: string) => void
  onAddHouse: () => void
  onOpenSettings: () => void
  view: 'dashboard' | 'settings'
  isMobile: boolean
  sidebarOpen: boolean
  onCloseSidebar: () => void
}

export const Sidebar: FC<SidebarProps> = ({ 
  houses, 
  counters, 
  selectedId, 
  onSelectCounter, 
  onAddCounter, 
  onAddHouse,
  onOpenSettings,
  view,
  isMobile,
  sidebarOpen,
  onCloseSidebar
}) => {
  const { t } = useTranslation()

  return (
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
                  onClick={() => onAddCounter(house.id)}
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
                  onClick={() => { 
                    onSelectCounter(c.id)
                    if (isMobile) onCloseSidebar()
                  }}
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
                    {getCounterIcon(c.name, c.color)}
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
          onClick={onAddHouse}
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
          onClick={() => {
            onOpenSettings()
            if (isMobile) onCloseSidebar()
          }}
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
  )
}
