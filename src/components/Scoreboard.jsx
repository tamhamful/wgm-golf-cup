import { formatPoints } from '../lib/tournament.js'

function TeamScore({ team, points, align }) {
  return (
    <div className={`team-score team-score-${align}`}>
      <span className="team-score-name">{team.name}</span>
      <span className="team-score-points">{formatPoints(points)}</span>
    </div>
  )
}

// One bar for the whole competition: its full width is every point available.
// Blue fills from the left, green from the right, and the centre mark is the
// halfway point (9 of 18). Light shades show the projected scores.
function ScoreBar({ teams, points, projected, totalPoints }) {
  const pct = (value) => `${Math.min(value / totalPoints, 1) * 100}%`
  const label =
    `${teams.HOME.name} ${formatPoints(points.HOME)}, projected ${formatPoints(projected.HOME)}. ` +
    `${teams.CHALLENGERS.name} ${formatPoints(points.CHALLENGERS)}, projected ${formatPoints(projected.CHALLENGERS)}. ` +
    `Out of ${totalPoints} points.`

  return (
    <div className="score-bar" role="img" aria-label={label}>
      <div className="score-bar-fill is-home is-projected" style={{ width: pct(projected.HOME) }} />
      <div className="score-bar-fill is-home" style={{ width: pct(points.HOME) }} />
      <div className="score-bar-fill is-challengers is-projected" style={{ width: pct(projected.CHALLENGERS) }} />
      <div className="score-bar-fill is-challengers" style={{ width: pct(points.CHALLENGERS) }} />
      <div className="score-bar-midpoint" />
    </div>
  )
}

export default function Scoreboard({ teams, points, projected, target, totalMatches }) {
  const remaining = totalMatches - points.HOME - points.CHALLENGERS

  return (
    <section className="scoreboard" aria-label="Overall team score">
      <div className="scoreboard-teams">
        <TeamScore team={teams.HOME} points={points.HOME} align="home" />
        <div className="scoreboard-target">
          <span className="target-number">{formatPoints(target)}</span>
          <span className="target-label">to win</span>
        </div>
        <TeamScore team={teams.CHALLENGERS} points={points.CHALLENGERS} align="challengers" />
      </div>

      <ScoreBar teams={teams} points={points} projected={projected} totalPoints={totalMatches} />
      <div className="score-bar-scale" aria-hidden="true">
        <span>0</span>
        <span>{formatPoints(totalMatches / 2)}</span>
        <span>0</span>
      </div>

      <p className="scoreboard-summary">
        {formatPoints(remaining)} point{remaining === 1 ? '' : 's'} remaining
      </p>
    </section>
  )
}
