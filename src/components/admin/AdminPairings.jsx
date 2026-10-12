import { useState } from 'react'
import { setGroupScorer, setMatchPlayer } from '../../lib/admin.js'
import { STATUS, STATUS_LABEL } from '../../lib/tournament.js'
import DaySelector from '../DaySelector.jsx'

function PlayerSelect({ match, side, tournament, dayMatches, run }) {
  const field = side === 'HOME' ? 'homePlayerId' : 'challengerPlayerId'
  const teamPlayers = tournament.players.filter((p) => p.teamId === side)
  const locked = match.state.status !== STATUS.NOT_STARTED

  // Shows which match each player is already in today, so swaps are obvious.
  const playingIn = (playerId) => dayMatches.find((m) => m.id !== match.id && m[field] === playerId)

  return (
    <select
      className={`select-input select-${side.toLowerCase()} ${match[field] ? '' : 'is-empty'}`}
      aria-label={`Match ${match.number} ${tournament.teams[side].name} player`}
      value={match[field] ?? ''}
      disabled={locked}
      onChange={(e) => run(setMatchPlayer, match.id, side, e.target.value || null)}
    >
      <option value="">Choose player…</option>
      {teamPlayers.map((p) => {
        const other = playingIn(p.id)
        return (
          <option key={p.id} value={p.id}>
            {p.name}
            {other ? ` (swap from M${other.number})` : ''}
          </option>
        )
      })}
    </select>
  )
}

export default function AdminPairings({ tournament, run }) {
  const { days, groups, matches, players } = tournament
  const [day, setDay] = useState(days[0])
  const playerName = (id) => players.find((p) => p.id === id)?.name

  const dayMatches = matches.filter((m) => m.day === day)
  const dayGroups = groups.filter((g) => g.day === day)
  const incomplete = dayMatches.filter((m) => !m.homePlayerId || !m.challengerPlayerId).length
  const noScorer = dayGroups.filter((g) => !g.scorerId).length

  return (
    <div className="admin-pairings">
      <DaySelector days={days} activeDay={day} onChange={setDay} />

      {(incomplete > 0 || noScorer > 0) && (
        <p className="warning-box">
          {incomplete > 0 && `${incomplete} match${incomplete === 1 ? '' : 'es'} still need players. `}
          {noScorer > 0 && `${noScorer} group${noScorer === 1 ? '' : 's'} need a scorer.`}
        </p>
      )}

      {dayGroups.map((group) => {
        const groupMatches = dayMatches.filter((m) => m.groupId === group.id)
        const groupPlayerIds = groupMatches
          .flatMap((m) => [m.homePlayerId, m.challengerPlayerId])
          .filter(Boolean)

        return (
          <section key={group.id} className="pairing-group">
            <div className="pairing-group-header">
              <h3>Group {group.number}</h3>
              <label className="scorer-field">
                <span>Scorer</span>
                <select
                  className={`select-input ${group.scorerId ? '' : 'is-empty'}`}
                  value={group.scorerId ?? ''}
                  onChange={(e) => run(setGroupScorer, group.id, e.target.value || null)}
                >
                  <option value="">Choose scorer…</option>
                  {groupPlayerIds.map((id) => (
                    <option key={id} value={id}>
                      {playerName(id)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {groupMatches.map((match) => {
              const locked = match.state.status !== STATUS.NOT_STARTED
              return (
                <div key={match.id} className="pairing-row">
                  <span className="pairing-number">M{match.number}</span>
                  <PlayerSelect match={match} side="HOME" tournament={tournament} dayMatches={dayMatches} run={run} />
                  <span className="pairing-v">v</span>
                  <PlayerSelect match={match} side="CHALLENGERS" tournament={tournament} dayMatches={dayMatches} run={run} />
                  {locked && (
                    <span className="pairing-locked">{STATUS_LABEL[match.state.status]} · locked</span>
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
