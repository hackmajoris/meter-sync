import type { FC } from 'react'
import { PALETTE } from '../../utils/helpers'

export interface ColorPickerProps {
  selectedColor: string
  onColorSelect: (color: string) => void
}

export const ColorPicker: FC<ColorPickerProps> = ({ selectedColor, onColorSelect }) => {
  return (
    <div className="color-grid">
      {PALETTE.map(c => (
        <div 
          key={c} 
          className={`color-swatch${c === selectedColor ? ' selected' : ''}`} 
          style={{ background: c }} 
          onClick={() => onColorSelect(c)} 
        />
      ))}
    </div>
  )
}
