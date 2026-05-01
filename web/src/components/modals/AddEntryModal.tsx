import { useState, type FC } from 'react'
import { useTranslation } from 'react-i18next'
import type { CounterWithEntries } from '../../hooks/useAppData'

export interface AddEntryModalProps {
  counter: CounterWithEntries
  onClose: () => void
  onAdd: (counterId: string, data: { date: string; value: number; note: string }) => Promise<void>
}

export const AddEntryModal: FC<AddEntryModalProps> = ({ counter, onClose, onAdd }) => {
  const { t } = useTranslation()
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')

  const handleSubmit = async () => {
    const v = parseFloat(value)
    if (!date || isNaN(v)) return
    await onAdd(counter.id, { date, value: v, note })
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
          <button className="btn-primary" style={{ '--accent': counter.color } as any} onClick={handleSubmit}>{t('entry.save')}</button>
        </div>
      </div>
    </div>
  )
}
