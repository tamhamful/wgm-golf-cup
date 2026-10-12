import { formatPoints } from '../lib/tournament.js'

function TeamScore({ team, points, projected, target, align }) {
  const toWidth = (value) => `${Math.min(value / target, 1) * 100}%`

  return (
    <div className={`team-score team-score-${align}`}>
      <span className="team-score-name">{team.name}</span>
      <span className="team-score-points">{formatPoints(points)}</span>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={`${team.name} progress towards ${target} points`}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={points}
        aria-valuetext={`${formatPoints(points)} points, projected ${formatPoints(projected)}`}
      >
        <div className="progress-projected" style={{ width: toWidth(projected) }} />
        <div className="progress-fill" style={{ width: toWidth(points) }} />
      </div>
    </div>
  )
}

export default function Scoreboard({ teams, points, projected, target, totalMatches }) {
  const awarded = points.HOME + points.CHALLENGERS
  const remaining = totalMatches - awarded
  const hasProjection =
    projected.HOME !== points.HOME || projected.CHALLENGERS !== points.CHALLENGERS

  return (
    <section className="scoreboard" aria-label="Overall team score">
      <div className="scoreboard-teams">
        <TeamScore
          team={teams.HOME}
          points={points.HOME}
          projected={projected.HOME}
          target={target}
          align="home"
        />
        <div className="scoreboard-target">
          <span className="target-number">{target}</span>
          <span className="target-label">to win</span>
        </div>
        <TeamScore
          team={teams.CHALLENGERS}
          points={points.CHALLENGERS}
          projected={projected.CHALLENGERS}
          target={target}
          align="challengers"
        />
      </div>

      {hasProjection && (
        <p className="scoreboard-projected">
          <span className="projected-key" aria-hidden="true" />
          Projected {formatPoints(projected.HOME)} – {formatPoints(projected.CHALLENGERS)} if
          live matches finish as they stand
        </p>
      )}

      <p className="scoreboard-summary">
        {formatPoints(awarded)} of {totalMatches} points awarded ·{' '}
        {formatPoints(remaining)} remaining
      </p>
    </section>
  )
}
