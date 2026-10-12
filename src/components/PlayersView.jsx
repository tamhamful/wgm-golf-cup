export default function PlayersView({ teams, players }) {
  return (
    <div className="players-grid">
      {['HOME', 'CHALLENGERS'].map((teamId) => {
        const teamPlayers = players.filter((p) => p.teamId === teamId)
        return (
          <section className={`players-team players-team-${teamId.toLowerCase()}`} key={teamId}>
            <h2 className="players-team-name">
              {teams[teamId].name}
              <span className="players-count">{teamPlayers.length} players</span>
            </h2>
            <ul className="players-list">
              {teamPlayers.map((player) => (
                <li key={player.id}>{player.name}</li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
