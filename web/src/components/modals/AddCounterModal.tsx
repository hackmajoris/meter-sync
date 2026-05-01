import { useState, type FC } from 'react'
import { useTranslation } from 'react-i18next'
import type { House } from '../../lib'
import { PALETTE } from '../../utils/helpers'
import { ColorPicker } from '../common/ColorPicker'

export interface AddCounterModalProps {
  onClose: () => void
  onAdd: (data: { name: string; unit: string; color: string; houseId: string }) => Promise<void>
  houses: House[]
  defaultHouseId?: string
}

export const AddCounterModal: FC<AddCounterModalProps> = ({ onClose, onAdd, houses, defaultHouseId }) => {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('kWh')
  const [color, setColor] = useState(PALETTE[0])
  const [houseId, setHouseId] = useState(defaultHouseId || houses[0]?.id || '')

  const handleSubmit = async () => {
    if (!name.trim()) return
    await onAdd({ name: name.trim(), unit, color, houseId })
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
          <ColorPicker selectedColor={color} onColorSelect={setColor} />
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>{t('actions.cancel')}</button>
          <button className="btn-primary" style={{ '--accent': color } as any} onClick={handleSubmit}>{t('counter.add')}</button>
        </div>
      </div>
    </div>
  )
}
