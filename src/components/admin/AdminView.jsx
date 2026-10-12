import { useState } from 'react'
import AdminTeams from './AdminTeams.jsx'
import AdminPairings from './AdminPairings.jsx'
import AdminSettings from './AdminSettings.jsx'

const SECTIONS = ['Teams & players', 'Pairings', 'Settings']

export default function AdminView({ tournament, apply, reset }) {
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
      <p className="device-notice">
        Changes are saved <strong>on this device only</strong> until the online database is set up.
        Other people won't see them yet.
      </p>

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
      {section === 'Settings' && (
        <AdminSettings
          tournament={tournament}
          run={run}
          confirm={confirm}
          onReset={() => {
            reset()
            setError(null)
          }}
        />
      )}
    </div>
  )
}
