import { describeMatch, formatPoints, STATUS } from '../lib/tournament.js'

export default function ResultsView({ matches, teams, playersById, holesPerMatch }) {
  const completed = matches
    .map((match) => ({ match, view: describeMatch(match, holesPerMatch) }))
    .filter(({ view }) => view.status === STATUS.COMPLETE)

  if (completed.length === 0) {
    return <p className="empty-state">No matches have been completed yet.</p>
  }

  return (
    <ol className="results-list">
      {completed.map(({ match, view }) => {
        const home = playersById[match.homePlayerId]
        const challenger = playersById[match.challengerPlayerId]
        const outcome = view.side
          ? `${teams[view.side].name} win`
          : 'Match halved'

        return (
          <li className="result-row" key={match.id}>
            <div className="result-meta">
              Day {match.day} · Match {match.number}
            </div>
            <div className="result-players">
              <span className={view.side === 'HOME' ? 'result-winner result-winner-home' : ''}>
                {home.name}
              </span>
              <span className="result-score">{view.position}</span>
              <span
                className={view.side === 'CHALLENGERS' ? 'result-winner result-winner-challengers' : ''}
              >
                {challenger.name}
              </span>
            </div>
            <div className="result-points">
              <span>{outcome}</span>
              <span>
                {teams.HOME.name} {formatPoints(view.points.HOME)} – {formatPoints(view.points.CHALLENGERS)}{' '}
                {teams.CHALLENGERS.name}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
