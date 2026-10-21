import { useState } from 'react'
import { formatPoints } from '../lib/tournament.js'
import { FORMATS, formatForDay, isTeamTotalFormat } from '../lib/formats.js'
import { getDayRankings } from '../lib/rankings.js'
import { formatRoundScore } from '../lib/strokeplay.js'
import { formatHandicap } from '../lib/admin.js'

function PlayerCell({ player, team }) {
  return (
    <span className="rankings-player" aria-hidden="true">
      <span className={`team-dot team-dot-${player.teamId.toLowerCase()}`} />
      <span className="rankings-name">
        {player.name}
        <span className="rankings-team">{team.name}</span>
      </span>
    </span>
  )
}

const rankText = (row) => `${row.rank}${row.tied ? '=' : ''}`

// Match play: ranked by holes won across all match-play matches.
function MatchPlayTable({ rankings, teams, currentPlayerId }) {
  return (
    <div className="rankings">
      <div className="rankings-row rankings-head" aria-hidden="true">
        <span>#</span>
        <span>Player</span>
        <span className="rankings-num">Holes won</span>
        <span className="rankings-num">Played</span>
        <span className="rankings-num">Pts</span>
      </div>
      <ol className="rankings-list">
        {rankings.map((row) => {
          const team = teams[row.player.teamId]
          return (
            <li
              key={row.player.id}
              className={`rankings-row ${row.player.id === currentPlayerId ? 'is-you' : ''}`}
              aria-label={`${row.tied ? 'Joint ' : ''}${row.rank}: ${row.player.name}, ${team.name}. ${row.holesWon} holes won from ${row.holesPlayed} played, ${formatPoints(row.points)} points`}
            >
              <span className="rankings-rank" aria-hidden="true">
                {rankText(row)}
              </span>
              <PlayerCell player={row.player} team={team} />
              <span className="rankings-num rankings-won" aria-hidden="true">
                {row.holesWon}
              </span>
              <span className="rankings-num" aria-hidden="true">
                {row.holesPlayed}
              </span>
              <span className="rankings-num" aria-hidden="true">
                {formatPoints(row.points)}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// Stableford / stroke play day: individual table for that day. The top 6
// (highlighted, above the cut line) each earn a cup point for their team.
function DayTable({ tournament, day, currentPlayerId }) {
  const format = formatForDay(tournament, day)
  const rows = getDayRankings(tournament, day)
  const { teams } = tournament
  const stableford = format === 'STABLEFORD'
  const lastScoring = rows.reduce((last, row, i) => (row.cupPoints > 0 ? i : last), -1)

  return (
    <div className="rankings">
      <div className="rankings-row rankings-head" aria-hidden="true">
        <span>#</span>
        <span>Player</span>
        <span className="rankings-num">{stableford ? 'Points' : 'Net'}</span>
        <span className="rankings-num">Thru</span>
        <span className="rankings-num">Hcp</span>
      </div>
      <ol className="rankings-list">
        {rows.flatMap((row, i) => {
          const team = teams[row.player.teamId]
          const started = row.holesPlayed > 0
          const score = started ? (stableford ? row.points : formatRoundScore(format, row)) : '–'
          const cupText =
            row.cupPoints === 1 ? ', earning a cup point' : row.cupPoints > 0 ? `, sharing a cup point (${formatPoints(row.cupPoints)})` : ''
          const line = (
            <li
              key={row.player.id}
              className={`rankings-row ${row.player.id === currentPlayerId ? 'is-you' : ''} ${row.cupPoints > 0 ? 'is-top' : ''}`}
              aria-label={`${started ? `${row.tied ? 'Joint ' : ''}${row.rank}: ` : ''}${row.player.name}, ${team.name}. ${started ? `${score}${stableford ? ' points' : ' net'} through ${row.holesPlayed}${cupText}` : 'not started'}`}
            >
              <span className="rankings-rank" aria-hidden="true">
                {started ? rankText(row) : ''}
              </span>
              <PlayerCell player={row.player} team={team} />
              <span className="rankings-num rankings-won" aria-hidden="true">
                {score}
              </span>
              <span className="rankings-num" aria-hidden="true">
                {row.finished ? 'F' : started ? row.holesPlayed : '–'}
              </span>
              <span className="rankings-num" aria-hidden="true">
                {formatHandicap(row.player.handicap) || '0'}
              </span>
            </li>
          )
          if (i !== lastScoring) return [line]
          return [
            line,
            <li key="cut" className="rankings-cut" aria-hidden="true">
              ▲ Top 6 earn a cup point
            </li>,
          ]
        })}
      </ol>
    </div>
  )
}

export default function RankingsView({ tournament, rankings, teams, currentPlayerId }) {
  const teamTotalDays = tournament.days.filter((d) => isTeamTotalFormat(formatForDay(tournament, d)))
  const [view, setView] = useState('MATCH')

  if (rankings.length === 0) {
    return <p className="empty-state">Rankings will appear once players are on teams.</p>
  }

  const options = [
    { id: 'MATCH', label: 'Match play' },
    ...teamTotalDays.map((d) => ({ id: d, label: `Day ${d} ${FORMATS[formatForDay(tournament, d)].short}` })),
  ]
  const current = options.some((o) => o.id === view) ? view : 'MATCH'

  return (
    <>
      {options.length > 1 && (
        <div className="admin-sections rankings-views" role="group" aria-label="Rankings to show">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`admin-section-button ${current === o.id ? 'is-active' : ''}`}
              aria-pressed={current === o.id}
              onClick={() => setView(o.id)}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      {current === 'MATCH' ? (
        <MatchPlayTable rankings={rankings} teams={teams} currentPlayerId={currentPlayerId} />
      ) : (
        <DayTable tournament={tournament} day={current} currentPlayerId={currentPlayerId} />
      )}
    </>
  )
}
