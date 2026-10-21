import { dayPoints, FORMATS, formatForDay, isTeamTotalFormat } from '../lib/formats.js'
import { dayTeamTotals, formatTeamTotal } from '../lib/strokeplay.js'
import { formatPoints } from '../lib/tournament.js'

// Above the leaderboard: the day's format, and on Stableford / stroke play
// days the live team totals that decide the day's points.
export default function DayFormatBar({ tournament, day }) {
  const format = formatForDay(tournament, day)
  const points = dayPoints(tournament, day)
  const label = FORMATS[format].label

  if (!isTeamTotalFormat(format)) {
    return (
      <p className="day-format">
        <strong>{label}</strong>
        <span>
          {points} match{points === 1 ? '' : 'es'} · {formatPoints(points)} point{points === 1 ? '' : 's'}
        </span>
      </p>
    )
  }

  const { totals, leader, started, complete } = dayTeamTotals(tournament, day)
  const { teams } = tournament
  const side = (id) => (
    <span className={`day-total day-total-${id.toLowerCase()} ${leader === id ? 'is-leading' : ''}`}>
      {teams[id].name} <strong>{started ? formatTeamTotal(format, totals[id]) : '–'}</strong>
    </span>
  )

  return (
    <div className="day-format day-format-team">
      <p>
        <strong>{label}</strong>
        <span>
          Team totals · {complete ? 'final' : `better total wins ${points} points`}
        </span>
      </p>
      <p className="day-totals">
        {side('HOME')}
        {side('CHALLENGERS')}
      </p>
    </div>
  )
}
