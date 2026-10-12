import { useState } from 'react'
import { addPlayer, movePlayer, removePlayer, renamePlayer, renameTeam } from '../../lib/admin.js'
import EditableText from './EditableText.jsx'

const TEAM_IDS = ['HOME', 'CHALLENGERS']
const PLAYERS_PER_TEAM = 6

function AddPlayerForm({ teamId, teamName, run }) {
  const [name, setName] = useState('')

  return (
    <form
      className="add-player"
      onSubmit={(e) => {
        e.preventDefault()
        if (!run(addPlayer, name, teamId)) setName('')
      }}
    >
      <input
        className="text-input"
        type="text"
        placeholder="New player name"
        aria-label={`New ${teamName} player name`}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button type="submit" className="button button-secondary" disabled={!name.trim()}>
        Add
      </button>
    </form>
  )
}

export default function AdminTeams({ tournament, run, confirm }) {
  const { teams, players, adminIds } = tournament

  return (
    <div className="admin-teams">
      {TEAM_IDS.map((teamId) => {
        const otherTeamId = teamId === 'HOME' ? 'CHALLENGERS' : 'HOME'
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
                  <EditableText
                    label={`${player.name} name`}
                    value={player.name}
                    onSave={(name) => run(renamePlayer, player.id, name)}
                  />
                  {adminIds.includes(player.id) && <span className="admin-tag">Admin</span>}
                  <button
                    type="button"
                    className="button button-quiet"
                    onClick={() => run(movePlayer, player.id, otherTeamId)}
                    title={`Move to ${teams[otherTeamId].name}`}
                  >
                    {teamId === 'HOME' ? 'Move →' : '← Move'}
                  </button>
                  <button
                    type="button"
                    className="button button-quiet button-danger-text"
                    onClick={() => {
                      if (confirm(`Remove ${player.name} from the tournament?`)) {
                        run(removePlayer, player.id)
                      }
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>

            <AddPlayerForm teamId={teamId} teamName={teams[teamId].name} run={run} />
          </section>
        )
      })}
    </div>
  )
}
