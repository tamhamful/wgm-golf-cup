export default function DaySelector({ days, activeDay, onChange }) {
  return (
    <div className="day-selector" role="group" aria-label="Select day">
      {days.map((day) => (
        <button
          key={day}
          type="button"
          className={`day-button ${activeDay === day ? 'is-active' : ''}`}
          aria-pressed={activeDay === day}
          onClick={() => onChange(day)}
        >
          Day {day}
        </button>
      ))}
    </div>
  )
}
