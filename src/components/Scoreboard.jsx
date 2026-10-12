import { formatPoints } from '../lib/tournament.js'

function TeamScore({ team, points, target, align }) {
  const progress = Math.min(points / target, 1) * 100

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
      >
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

export default function Scoreboard({ teams, points, target, totalMatches }) {
  const awarded = points.HOME + points.CHALLENGERS
  const remaining = totalMatches - awarded

  return (
    <section className="scoreboard" aria-label="Overall team score">
      <div className="scoreboard-teams">
        <TeamScore team={teams.HOME} points={points.HOME} target={target} align="home" />
        <div className="scoreboard-target">
          <span className="target-number">{target}</span>
          <span className="target-label">to win</span>
        </div>
        <TeamScore
          team={teams.CHALLENGERS}
          points={points.CHALLENGERS}
          target={target}
          align="challengers"
        />
      </div>

      <p className="scoreboard-summary">
        {formatPoints(awarded)} of {totalMatches} points awarded ·{' '}
        {formatPoints(remaining)} remaining
      </p>
    </section>
  )
}
