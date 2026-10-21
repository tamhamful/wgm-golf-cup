import { useState } from 'react'
import AdminTeams from './AdminTeams.jsx'
import AdminPairings from './AdminPairings.jsx'
import AdminSettings from './AdminSettings.jsx'
import AdminTicker from './AdminTicker.jsx'
import AdminCourse from './AdminCourse.jsx'
import DaySelector from '../DaySelector.jsx'
import { setCurrentDay } from '../../lib/admin.js'

const SECTIONS = ['Teams & players', 'Pairings', 'Course', 'Ticker', 'Settings']

export default function AdminView({
  tournament,
  apply,
  onClearScores,
  adminEmail,
  onSignOut,
  notices,
  onPostNotice,
  onDeleteNotice,
}) {
  const [section, setSection] = useState(SECTIONS[0])
  const [error, setError] = useState(null)

  // Runs an admin change and shows a message if it was refused.
  const run = (change, ...args) => {
    const message = apply(change, ...args)
    setError(message)
    return message
  }
  const confirm = (message) => window.confirm(message)

  return (
    <div className="admin">
      <p className="device-notice admin-signed-in">
        <span>
          Signed in as admin: <strong>{adminEmail}</strong>
        </span>
        <button type="button" className="link-button" onClick={onSignOut}>
          Sign out
        </button>
      </p>

      <section className="current-day">
        <div>
          <h3 className="admin-subheading">Leaderboard day</h3>
          <p className="settings-help">Everyone's leaderboard opens on this day.</p>
        </div>
        <DaySelector
          days={tournament.days}
          activeDay={tournament.currentDay ?? tournament.days[0]}
          onChange={(day) => run(setCurrentDay, day)}
        />
      </section>

      <div className="admin-sections" role="group" aria-label="Admin sections">
        {SECTIONS.map((name) => (
          <button
            key={name}
            type="button"
            className={`admin-section-button ${section === name ? 'is-active' : ''}`}
            aria-pressed={section === name}
            onClick={() => {
              setSection(name)
              setError(null)
            }}
          >
            {name}
          </button>
        ))}
      </div>

      {error && (
        <p className="error-box" role="alert">
          {error}
          <button type="button" className="link-button" onClick={() => setError(null)}>
            Dismiss
          </button>
        </p>
      )}

      {section === 'Teams & players' && (
        <AdminTeams tournament={tournament} run={run} confirm={confirm} />
      )}
      {section === 'Pairings' && <AdminPairings tournament={tournament} run={run} />}
      {section === 'Course' && <AdminCourse tournament={tournament} run={run} />}
      {section === 'Ticker' && (
        <AdminTicker notices={notices} onPost={onPostNotice} onDelete={onDeleteNotice} />
      )}
      {section === 'Settings' && (
        <AdminSettings
          tournament={tournament}
          run={run}
          signedInEmail={adminEmail}
          onClearScores={() => setError(onClearScores())}
        />
      )}
    </div>
  )
}
