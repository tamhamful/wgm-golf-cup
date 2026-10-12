export default function PlayersView({ teams, players }) {
  const unassigned = players.filter((p) => !p.teamId)

  return (
    <>
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

      {unassigned.length > 0 && (
        <section className="players-team players-team-unassigned">
          <h2 className="players-team-name">
            Teams not yet picked
            <span className="players-count">{unassigned.length} players</span>
          </h2>
          <ul className="players-list">
            {unassigned.map((player) => (
              <li key={player.id}>{player.name}</li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
