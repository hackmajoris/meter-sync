import { useState, type FC } from 'react'

type Mode = 'new' | 'open'

export const SetupView: FC = () => {
  const [mode, setMode] = useState<Mode>('new')
  const [folder, setFolder] = useState('')
  const [dbPath, setDbPath] = useState('')
  const [key, setKey] = useState('')
  const [keyConfirm, setKeyConfirm] = useState('')
  const [existingKey, setExistingKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const valid =
    mode === 'new'
      ? !!folder && !!key && key === keyConfirm
      : !!dbPath && !!existingKey

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'new' && key !== keyConfirm) {
      setError('Passwords do not match.')
      return
    }
    setError(null)
    setLoading(true)
    const data =
      mode === 'new'
        ? { dbFolder: folder, encryptionKey: key }
        : { dbPath, encryptionKey: existingKey }
    const result = await window.electronAPI!.completeSetup(data)
    if (!result.ok) {
      setError(result.error ?? 'Setup failed.')
      setLoading(false)
    }
    // On success, Electron navigates the window to the app — no further action needed.
  }

  async function pickFolder() {
    const picked = await window.electronAPI!.pickDbFolder()
    if (picked) setFolder(picked)
  }

  async function pickFile() {
    const picked = await window.electronAPI!.pickDbFile()
    if (picked) setDbPath(picked)
  }

  return (
    <div style={{
      height: '100vh', background: 'var(--bg)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'DM Sans',
    }}>
      <div style={{
        width: 420, background: 'var(--bg2)',
        border: '1px solid var(--border2)', borderRadius: 20,
        padding: 32, boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
      }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'Outfit', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
            Welcome to MeterSync
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
            Your data stays on your device, encrypted with a password you choose.
          </div>
        </div>

        {/* Mode toggle */}
        <div style={{
          display: 'flex', background: 'var(--bg3)', borderRadius: 10,
          padding: 3, marginBottom: 24, gap: 2,
        }}>
          {(['new', 'open'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null) }}
              style={{
                flex: 1, padding: '7px 0', border: 'none', borderRadius: 8,
                fontFamily: 'DM Sans', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                background: mode === m ? 'var(--bg4)' : 'transparent',
                color: mode === m ? 'var(--text)' : 'var(--text3)',
                transition: 'all 0.15s',
              }}
            >
              {m === 'new' ? 'New database' : 'Open existing'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'new' ? (
            <>
              <div className="modal-field">
                <label>Database folder</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    readOnly
                    value={folder}
                    placeholder="Choose a folder…"
                    style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 10, padding: '10px 14px', color: folder ? 'var(--text)' : 'var(--text3)', fontFamily: 'DM Sans', fontSize: 13, outline: 'none' }}
                  />
                  <button type="button" onClick={pickFolder} style={btnSecondary}>Browse</button>
                </div>
                {folder && (
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5 }}>
                    Database file: <span style={{ color: 'var(--text2)' }}>{folder}/data.db</span>
                  </div>
                )}
              </div>

              <div className="modal-field">
                <label>Encryption password</label>
                <input
                  type="password"
                  value={key}
                  onChange={e => setKey(e.target.value)}
                  placeholder="Choose a strong password"
                  autoComplete="new-password"
                />
              </div>

              <div className="modal-field">
                <label>Confirm password</label>
                <input
                  type="password"
                  value={keyConfirm}
                  onChange={e => setKeyConfirm(e.target.value)}
                  placeholder="Repeat the password"
                  autoComplete="new-password"
                />
                {key && keyConfirm && key !== keyConfirm && (
                  <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>Passwords do not match</div>
                )}
              </div>

              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20, lineHeight: 1.6, background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
                If you lose this password, your data cannot be recovered. Store it in a password manager.
              </div>
            </>
          ) : (
            <>
              <div className="modal-field">
                <label>Database file (.db)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    readOnly
                    value={dbPath}
                    placeholder="Select an existing database…"
                    style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 10, padding: '10px 14px', color: dbPath ? 'var(--text)' : 'var(--text3)', fontFamily: 'DM Sans', fontSize: 13, outline: 'none' }}
                  />
                  <button type="button" onClick={pickFile} style={btnSecondary}>Browse</button>
                </div>
              </div>

              <div className="modal-field">
                <label>Encryption password</label>
                <input
                  type="password"
                  value={existingKey}
                  onChange={e => setExistingKey(e.target.value)}
                  placeholder="Enter the database password"
                  autoComplete="current-password"
                />
              </div>
            </>
          )}

          {error && (
            <div style={{ fontSize: 13, color: '#ef4444', marginBottom: 16 }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={!valid || loading}
            className="btn-primary"
            style={{ width: '100%', opacity: (!valid || loading) ? 0.45 : 1 }}
          >
            {loading ? 'Starting…' : mode === 'new' ? 'Create & open' : 'Open'}
          </button>
        </form>
      </div>
    </div>
  )
}

const btnSecondary: React.CSSProperties = {
  background: 'var(--bg4)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '10px 14px',
  color: 'var(--text2)', cursor: 'pointer',
  fontFamily: 'DM Sans', fontSize: 13, fontWeight: 500,
  whiteSpace: 'nowrap', flexShrink: 0,
}
