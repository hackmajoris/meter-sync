import { useState, type FC } from 'react'
import { useTranslation } from 'react-i18next'

export interface AddHouseModalProps {
  onClose: () => void
  onAdd: (name: string) => Promise<void>
}

export const AddHouseModal: FC<AddHouseModalProps> = ({ onClose, onAdd }) => {
  const { t } = useTranslation()
  const [name, setName] = useState('')

  const handleSubmit = async () => {
    if (!name.trim()) return
    await onAdd(name.trim())
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
