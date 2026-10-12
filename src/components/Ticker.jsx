import { useEffect, useState } from 'react'

const ROTATE_EVERY_MS = 6000
const STRIP_COUNT = 6 // the strip cycles through the latest few events
const LIST_COUNT = 40 // the expanded list shows more

function timeAgo(time, now) {
  if (!time) return ''
  const minutes = Math.floor((now - new Date(time).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(time).toLocaleDateString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })
}

function EventLine({ event, now }) {
  return (
    <>
      {event.kind === 'notice' && <span className="ticker-label">Notice</span>}
      <span className="ticker-text">{event.text}</span>
      <span className="ticker-time">{timeAgo(event.time, now)}</span>
    </>
  )
}

const accentClass = (event) =>
  event.kind === 'notice' ? 'is-notice' : event.team ? `is-${event.team.toLowerCase()}` : ''

// A slim strip under the header showing one event at a time, changing every
// few seconds. Tap it to see the full list of recent events.
export default function Ticker({ events }) {
  const [now, setNow] = useState(() => Date.now())
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const [latestId, setLatestId] = useState(events[0]?.id)

  // When something new happens, jump straight to it.
  if (events[0]?.id !== latestId) {
    setLatestId(events[0]?.id)
    setIndex(0)
  }

  const recent = events.slice(0, STRIP_COUNT)

  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(clock)
  }, [])

  useEffect(() => {
    if (open || recent.length < 2) return undefined
    const rotate = setInterval(() => setIndex((i) => (i + 1) % recent.length), ROTATE_EVERY_MS)
    return () => clearInterval(rotate)
  }, [open, recent.length])

  if (events.length === 0) return null
  const current = recent[index % recent.length]

  return (
    <section className="ticker" aria-label="Latest news">
      <button
        type="button"
        className={`ticker-strip ${accentClass(current)}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="ticker-live" aria-hidden="true">
          Latest
        </span>
        <span key={current.id} className="ticker-item">
          <EventLine event={current} now={now} />
        </span>
        <span className="ticker-toggle" aria-hidden="true">
          {open ? '▴' : '▾'}
        </span>
      </button>

      {open && (
        <ol className="ticker-list">
          {events.slice(0, LIST_COUNT).map((event) => (
            <li key={event.id} className={accentClass(event)}>
              <EventLine event={event} now={now} />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
