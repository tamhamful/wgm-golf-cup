import { useState } from 'react'

// A text box that saves when you press Enter or move away from it.
// If the save is refused (e.g. blank name), it goes back to the saved value.
export default function EditableText({ id, value, onSave, label, className = '' }) {
  const [draft, setDraft] = useState(value)
  const [lastValue, setLastValue] = useState(value)

  // Keep in step if the saved value changes elsewhere.
  if (value !== lastValue) {
    setLastValue(value)
    setDraft(value)
  }

  const commit = () => {
    if (draft === value) return
    const error = onSave(draft)
    if (error) setDraft(value)
  }

  return (
    <input
      id={id}
      className={`text-input ${className}`}
      type="text"
      value={draft}
      aria-label={label}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          setDraft(value)
          e.currentTarget.blur()
        }
      }}
    />
  )
}
