import { useState } from 'react'
import { addPlayer, movePlayer, removePlayer, renamePlayer, renameTeam } from '../../lib/admin.js'
import EditableText from './EditableText.jsx'

const TEAM_IDS = ['HOME', 'CHALLENGERS']
const PLAYERS_PER_TEAM = 6

function AddPlayerForm({ run }) {
  const [name, setName] = useState('')

  return (
    <form
      className="add-player"
      onSubmit={(e) => {
        e.preventDefault()
        if (!run(addPlayer, name)) setName('')
      }}
    >
      <input
        className="text-input"
        type="text"
        placeholder="New player name"
        aria-label="New player name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button type="submit" className="button button-secondary" disabled={!name.trim()}>
        Add player
      </button>
    </form>
  )
}

function RemoveButton({ player, run, confirm }) {
  return (
    <button
      type="button"
      className="button button-quiet button-danger-text"
      onClick={() => {
        if (confirm(`Remove ${player.name} from the tournament?`)) run(removePlayer, player.id)
      }}
    >
      Remove
    </button>
  )
}

export default function AdminTeams({ tournament, run, confirm }) {
  const { teams, players, adminIds } = tournament
  const unassigned = players.filter((p) => !p.teamId)

  const nameField = (player) => (
    <EditableText
      label={`${player.name} name`}
      value={player.name}
      onSave={(name) => run(renamePlayer, player.id, name)}
    />
  )
  const adminTag = (player) =>
    adminIds.includes(player.id) && <span className="admin-tag">Admin</span>

  return (
    <div className="admin-teams-page">
      <section className="admin-unassigned">
        <div className="admin-team-count">
          <h3 className="admin-subheading">Unassigned</h3>
          <span>
            {unassigned.length} player{unassigned.length === 1 ? '' : 's'} not yet on a team
          </span>
        </div>

        {unassigned.length > 0 && (
          <ul className="admin-player-list">
            {unassigned.map((player) => (
              <li key={player.id} className="admin-player">
                {nameField(player)}
                {adminTag(player)}
                <button
                  type="button"
                  className="button button-assign button-assign-home"
                  onClick={() => run(movePlayer, player.id, 'HOME')}
                  aria-label={`Move ${player.name} to ${teams.HOME.name}`}
                >
                  → {teams.HOME.name}
                </button>
                <button
                  type="button"
                  className="button button-assign button-assign-challengers"
                  onClick={() => run(movePlayer, player.id, 'CHALLENGERS')}
                  aria-label={`Move ${player.name} to ${teams.CHALLENGERS.name}`}
                >
                  → {teams.CHALLENGERS.name}
                </button>
                <RemoveButton player={player} run={run} confirm={confirm} />
              </li>
            ))}
          </ul>
        )}

        <AddPlayerForm run={run} />
      </section>

      <div className="admin-teams">
        {TEAM_IDS.map((teamId) => {
          const teamPlayers = players.filter((p) => p.teamId === teamId)
          const sizeOk = teamPlayers.length === PLAYERS_PER_TEAM

          return (
            <section key={teamId} className={`admin-team admin-team-${teamId.toLowerCase()}`}>
              <label className="field-label" htmlFor={`team-name-${teamId}`}>
                {teamId === 'HOME' ? 'Home side (left)' : 'Challengers side (right)'} team name
              </label>
              <EditableText
                id={`team-name-${teamId}`}
                className="team-name-input"
                value={teams[teamId].name}
                onSave={(name) => run(renameTeam, teamId, name)}
              />

              <div className="admin-team-count">
                <span>{teamPlayers.length} players</span>
                {!sizeOk && <span className="warning-text">Should be {PLAYERS_PER_TEAM}</span>}
              </div>

              <ul className="admin-player-list">
                {teamPlayers.map((player) => (
                  <li key={player.id} className="admin-player">
                    {nameField(player)}
                    {adminTag(player)}
                    <select
                      className="select-input team-select"
                      aria-label={`${player.name} team`}
                      value={teamId}
                      onChange={(e) => run(movePlayer, player.id, e.target.value || null)}
                    >
                      <option value="HOME">{teams.HOME.name}</option>
                      <option value="CHALLENGERS">{teams.CHALLENGERS.name}</option>
                      <option value="">Unassigned</option>
                    </select>
                    <RemoveButton player={player} run={run} confirm={confirm} />
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
