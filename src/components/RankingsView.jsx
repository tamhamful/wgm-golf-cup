import { formatPoints } from '../lib/tournament.js'

// Players ranked by holes won across all their matches.
export default function RankingsView({ rankings, teams, currentPlayerId }) {
  if (rankings.length === 0) {
    return <p className="empty-state">Rankings will appear once players are on teams.</p>
  }

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
                {row.rank}
                {row.tied ? '=' : ''}
              </span>
              <span className="rankings-player" aria-hidden="true">
                <span className={`team-dot team-dot-${row.player.teamId.toLowerCase()}`} />
                <span className="rankings-name">
                  {row.player.name}
                  <span className="rankings-team">{team.name}</span>
                </span>
              </span>
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
