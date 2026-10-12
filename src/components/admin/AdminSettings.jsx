import { setAdmin, setTargetPoints } from '../../lib/admin.js'

export default function AdminSettings({ tournament, run, confirm, onReset }) {
  const { players, adminIds, teams, targetPoints, matches } = tournament

  return (
    <div className="admin-settings">
      <section className="settings-block">
        <h3>Admins</h3>
        <p className="settings-help">
          Admins can change teams, pairings and settings, and will be able to enter or correct any
          score.
        </p>
        <ul className="admin-checklist">
          {players.map((player) => (
            <li key={player.id}>
              <label>
                <input
                  type="checkbox"
                  checked={adminIds.includes(player.id)}
                  onChange={(e) => run(setAdmin, player.id, e.target.checked)}
                />
                {player.name}
                <span className="checklist-team">
                  {player.teamId ? teams[player.teamId].name : 'Unassigned'}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="settings-block">
        <h3>Points to win</h3>
        <p className="settings-help">
          {matches.length} points are available in total. A team needs this many to win the cup.
        </p>
        <input
          key={targetPoints}
          className="text-input number-input"
          type="number"
          min="0.5"
          max={matches.length}
          step="0.5"
          defaultValue={targetPoints}
          aria-label="Points to win"
          onBlur={(e) => {
            if (run(setTargetPoints, e.target.value)) e.target.value = targetPoints
          }}
        />
      </section>

      <section className="settings-block settings-danger">
        <h3>Reset tournament</h3>
        <p className="settings-help">
          Puts every team, player, pairing and score back to the original demonstration data.
          This cannot be undone.
        </p>
        <button
          type="button"
          className="button button-danger"
          onClick={() => {
            if (confirm('Reset the whole tournament to the demonstration data? This cannot be undone.')) {
              onReset()
            }
          }}
        >
          Reset tournament
        </button>
      </section>
    </div>
  )
}
