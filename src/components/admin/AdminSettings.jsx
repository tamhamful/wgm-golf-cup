import { useEffect, useState } from 'react'
import { setTargetPoints } from '../../lib/admin.js'
import { totalPointsAvailable } from '../../lib/formats.js'
import { formatPoints } from '../../lib/tournament.js'
import { addAdmin, listAdmins, removeAdmin } from '../../state/adminApi.js'

function AdminList({ signedInEmail }) {
  const [admins, setAdmins] = useState([])
  const [newEmail, setNewEmail] = useState('')
  const [message, setMessage] = useState(null)

  const refresh = () =>
    listAdmins()
      .then(setAdmins)
      .catch((error) => setMessage(error.message))

  useEffect(() => {
    refresh()
  }, [])

  const add = async (e) => {
    e.preventDefault()
    const error = await addAdmin(newEmail)
    setMessage(error)
    if (!error) {
      setNewEmail('')
      refresh()
    }
  }

  const remove = async (email) => {
    if (!window.confirm(`Remove ${email} as an admin?`)) return
    const error = await removeAdmin(email)
    setMessage(error)
    if (!error) refresh()
  }

  return (
    <>
      {message && <p className="error-box">{message}</p>}
      <ul className="admin-email-list">
        {admins.map((email) => (
          <li key={email}>
            <span>
              {email}
              {email === signedInEmail?.toLowerCase() && <span className="checklist-team"> (you)</span>}
            </span>
            <button
              type="button"
              className="button button-quiet button-danger-text"
              onClick={() => remove(email)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form className="add-player" onSubmit={add}>
        <input
          className="text-input"
          type="email"
          placeholder="Email address"
          aria-label="New admin email address"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
        />
        <button type="submit" className="button button-secondary" disabled={!newEmail.trim()}>
          Add admin
        </button>
      </form>
    </>
  )
}

export default function AdminSettings({ tournament, run, signedInEmail, onClearScores }) {
  const { targetPoints } = tournament
  const available = totalPointsAvailable(tournament)
  // More than half the points available guarantees a win.
  const decisive = Math.floor(available / 2) + 0.5
  const targetProblem =
    targetPoints > available
      ? `Only ${available} points are available with the current formats, so nobody can reach ${formatPoints(targetPoints)}.`
      : targetPoints <= available / 2
        ? `Both teams could reach ${formatPoints(targetPoints)}. More than half the points (${formatPoints(decisive)}) guarantees a winner.`
        : null

  return (
    <div className="admin-settings">
      <section className="settings-block">
        <h3>Admins</h3>
        <p className="settings-help">
          Admins sign in with an emailed link. They can change teams, pairings and settings, and
          enter or correct any score.
        </p>
        <AdminList signedInEmail={signedInEmail} />
      </section>

      <section className="settings-block">
        <h3>Points to win</h3>
        <p className="settings-help">
          {available} points are available with the current formats ({formatPoints(decisive)} is more than
          half). A team needs this many to win the cup.
        </p>
        <input
          key={targetPoints}
          className="text-input number-input"
          type="number"
          min="0.5"
          max={available}
          step="0.5"
          defaultValue={targetPoints}
          aria-label="Points to win"
          onBlur={(e) => {
            if (run(setTargetPoints, e.target.value)) e.target.value = targetPoints
          }}
        />
        {targetProblem && <p className="warning-box target-warning">{targetProblem}</p>}
      </section>

      <section className="settings-block settings-danger">
        <h3>Clear all scores</h3>
        <p className="settings-help">
          Removes every hole result in every match, all ticker notices and the "demonstration"
          label, ready for the real tournament. Teams, players and pairings are kept. This cannot
          be undone.
        </p>
        <button
          type="button"
          className="button button-danger"
          onClick={() => {
            if (window.confirm('Clear every score in the tournament? This cannot be undone.')) {
              onClearScores()
            }
          }}
        >
          Clear all scores
        </button>
      </section>
    </div>
  )
}
