import { useState } from 'react'
import { setMatchPlayer } from '../../lib/admin.js'
import { STATUS, STATUS_LABEL } from '../../lib/tournament.js'
import { getMatchStatus } from '../../lib/scoring.js'
import DaySelector from '../DaySelector.jsx'

// Choosing a player who is already in another match that day swaps the two
// players over (see setMatchPlayer in lib/admin.js).
function PlayerSelect({ match, side, tournament, run }) {
  const field = side === 'HOME' ? 'homePlayerId' : 'challengerPlayerId'
  const teamPlayers = tournament.players.filter((p) => p.teamId === side)
  const locked = getMatchStatus(match, tournament.holesPerMatch) !== STATUS.NOT_STARTED

  return (
    <select
      className={`select-input select-${side.toLowerCase()} ${match[field] ? '' : 'is-empty'}`}
      aria-label={`Match ${match.number} ${tournament.teams[side].name} player`}
      value={match[field] ?? ''}
      disabled={locked}
      onChange={(e) => run(setMatchPlayer, match.id, side, e.target.value || null)}
    >
      <option value="">Choose player…</option>
      {teamPlayers.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  )
}

export default function AdminPairings({ tournament, run }) {
  const { days, groups, matches } = tournament
  const [day, setDay] = useState(days[0])

  const dayMatches = matches.filter((m) => m.day === day)
  const dayGroups = groups.filter((g) => g.day === day)
  const incomplete = dayMatches.filter((m) => !m.homePlayerId || !m.challengerPlayerId).length

  return (
    <div className="admin-pairings">
      <DaySelector days={days} activeDay={day} onChange={setDay} />

      {incomplete > 0 && (
        <p className="warning-box">
          {incomplete} match{incomplete === 1 ? '' : 'es'} still need players.
        </p>
      )}

      {dayGroups.map((group) => {
        const groupMatches = dayMatches.filter((m) => m.groupId === group.id)

        return (
          <section key={group.id} className="pairing-group">
            <div className="pairing-group-header">
              <h3>Group {group.number}</h3>
              <span className="pairing-group-note">Any of these four players can enter scores</span>
            </div>

            {groupMatches.map((match) => {
              const status = getMatchStatus(match, tournament.holesPerMatch)
              const locked = status !== STATUS.NOT_STARTED
              return (
                <div key={match.id} className="pairing-row">
                  <span className="pairing-number">M{match.number}</span>
                  <PlayerSelect match={match} side="HOME" tournament={tournament} run={run} />
                  <span className="pairing-v">v</span>
                  <PlayerSelect match={match} side="CHALLENGERS" tournament={tournament} run={run} />
                  {locked && (
                    <span className="pairing-locked">{STATUS_LABEL[status]} · locked</span>
                  )}
                </div>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
