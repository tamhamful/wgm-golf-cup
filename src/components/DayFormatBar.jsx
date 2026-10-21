import { dayPoints, FORMATS, formatForDay, isTeamTotalFormat } from '../lib/formats.js'
import { dayCupPoints } from '../lib/strokeplay.js'
import { formatPoints } from '../lib/tournament.js'

// Above the leaderboard: the day's format, and on Stableford / stroke play
// days how the top-6 cup points currently split between the teams.
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

  const { points: split, started, complete } = dayCupPoints(tournament, day)
  const { teams } = tournament
  const leader = split.HOME > split.CHALLENGERS ? 'HOME' : split.CHALLENGERS > split.HOME ? 'CHALLENGERS' : null
  const side = (id) => (
    <span className={`day-total day-total-${id.toLowerCase()} ${leader === id ? 'is-leading' : ''}`}>
      {teams[id].name} <strong>{started ? formatPoints(split[id]) : '–'}</strong>
    </span>
  )

  return (
    <div className="day-format day-format-team">
      <p>
        <strong>{label}</strong>
        <span>
          Top {points} scores earn a point each{complete ? ' · final' : started ? ' · as it stands' : ''}
        </span>
      </p>
      <p className="day-totals">
        {side('HOME')}
        {side('CHALLENGERS')}
      </p>
    </div>
  )
}
