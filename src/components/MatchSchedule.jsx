import { describeMatch, STATUS_LABEL } from '../lib/tournament.js'

export default function MatchSchedule({ matches, playersById, holesPerMatch }) {
  return (
    <ol className="schedule-list">
      {matches.map((match) => {
        const view = describeMatch(match, holesPerMatch)
        const home = playersById[match.homePlayerId]
        const challenger = playersById[match.challengerPlayerId]

        return (
          <li className="schedule-row" key={match.id}>
            <span className="schedule-number">M{match.number}</span>

            <div className="schedule-players">
              <span className={`schedule-player ${view.side === 'HOME' ? 'is-leading' : ''}`}>
                <span className="team-dot team-dot-home" aria-hidden="true" />
                {home.name}
              </span>
              <span className={`schedule-player ${view.side === 'CHALLENGERS' ? 'is-leading' : ''}`}>
                <span className="team-dot team-dot-challengers" aria-hidden="true" />
                {challenger.name}
              </span>
            </div>

            <div className="schedule-state">
              <span className={`status-badge status-badge-${view.status.toLowerCase()}`}>
                {STATUS_LABEL[view.status]}
              </span>
              {view.position && (
                <span className="schedule-position">
                  {view.position}
                  <span className="schedule-detail">{view.detail}</span>
                </span>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
