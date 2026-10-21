import { useState } from 'react'
import { setDayFormat, setMatchPlayer } from '../../lib/admin.js'
import { STATUS, STATUS_LABEL } from '../../lib/tournament.js'
import { getMatchStatus } from '../../lib/scoring.js'
import {
  dayPoints,
  FORMAT_IDS,
  FORMATS,
  formatForDay,
  isPairsFormat,
  isTeamTotalFormat,
  matchIsReady,
} from '../../lib/formats.js'
import DaySelector from '../DaySelector.jsx'

// Choosing a player who is already playing that day swaps the two players
// over (see setMatchPlayer in lib/admin.js).
function PlayerSelect({ match, slot, side, tournament, run, locked, label }) {
  const teamPlayers = tournament.players.filter((p) => p.teamId === side)
  return (
    <select
      className={`select-input select-${side.toLowerCase()} ${match[slot] ? '' : 'is-empty'}`}
      aria-label={`Match ${match.number} ${tournament.teams[side].name} ${label}`}
      value={match[slot] ?? ''}
      disabled={locked}
      onChange={(e) => run(setMatchPlayer, match.id, slot, e.target.value || null)}
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

const FORMAT_HELP = {
  SINGLES: '6 matches, one against one. A point per match.',
  FOURBALL: '3 matches, pairs. Each plays their own ball; best score on the hole counts. A point per match.',
  FOURSOMES: '3 matches, pairs. Partners take alternate shots with one ball. A point per match.',
  STABLEFORD: '6 pairings. Gross scores with full handicap; the better team points total wins 6 points.',
  STROKE: '6 pairings. Gross scores with full handicap; the lower team net total wins 6 points.',
}

export default function AdminPairings({ tournament, run }) {
  const { days, groups, matches } = tournament
  const [day, setDay] = useState(days[0])

  const format = formatForDay(tournament, day)
  const pairs = isPairsFormat(format)
  const dayMatches = matches.filter((m) => m.day === day)
  const dayGroups = groups.filter((g) => g.day === day)
  const incomplete = dayMatches.filter((m) => !matchIsReady(tournament, m)).length
  const dayHasScores = dayMatches.some((m) => m.holes.length > 0)
  const missingHandicaps = isTeamTotalFormat(format)
    ? tournament.players.filter((p) => p.teamId && (p.handicap === null || p.handicap === undefined))
    : []

  const sideSelects = (match, side, locked) => {
    const main = side === 'HOME' ? 'homePlayerId' : 'challengerPlayerId'
    const partner = side === 'HOME' ? 'homePartnerId' : 'challengerPartnerId'
    const common = { match, side, tournament, run, locked }
    if (!pairs) return <PlayerSelect {...common} slot={main} label="player" />
    return (
      <span className="pairing-pair">
        <PlayerSelect {...common} slot={main} label="first player" />
        <PlayerSelect {...common} slot={partner} label="partner" />
      </span>
    )
  }

  return (
    <div className="admin-pairings">
      <DaySelector days={days} activeDay={day} onChange={setDay} />

      <section className="day-format-setting">
        <label className="field-label" htmlFor={`format-day-${day}`}>
          Day {day} format
        </label>
        <select
          id={`format-day-${day}`}
          className="select-input"
          value={format}
          disabled={dayHasScores}
          onChange={(e) => run(setDayFormat, day, e.target.value)}
        >
          {FORMAT_IDS.map((id) => (
            <option key={id} value={id}>
              {FORMATS[id].label}
            </option>
          ))}
        </select>
        <p className="settings-help">
          {FORMAT_HELP[format]} This day is worth {dayPoints(tournament, day)} points.
          {dayHasScores && ' The format is locked because this day already has scores.'}
        </p>
      </section>

      {incomplete > 0 && (
        <p className="warning-box">
          {incomplete} match{incomplete === 1 ? '' : 'es'} still need players.
        </p>
      )}
      {missingHandicaps.length > 0 && (
        <p className="warning-box">
          {missingHandicaps.length} player{missingHandicaps.length === 1 ? ' has' : 's have'} no handicap yet (they'll
          play off 0). Set handicaps in Teams &amp; players.
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
                <div key={match.id} className={`pairing-row ${pairs ? 'is-pairs' : ''}`}>
                  <span className="pairing-number">M{match.number}</span>
                  {sideSelects(match, 'HOME', locked)}
                  <span className="pairing-v">v</span>
                  {sideSelects(match, 'CHALLENGERS', locked)}
                  {locked && <span className="pairing-locked">{STATUS_LABEL[status]} · locked</span>}
                </div>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
