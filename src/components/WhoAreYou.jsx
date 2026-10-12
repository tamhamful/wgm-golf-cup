export default function WhoAreYou({ teams, players, onSelect }) {
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand" aria-label="WGM Golf Cup">
            <span className="brand-mark">WGM</span>
            <span className="brand-title">Golf Cup</span>
          </div>
        </div>
      </header>

      <main className="page who-page">
        <h1 className="who-title">Who are you?</h1>
        <p className="who-intro">Choose your name. This device will remember you.</p>

        <div className="who-teams">
          {['HOME', 'CHALLENGERS'].map((teamId) => (
            <section key={teamId} className={`who-team who-team-${teamId.toLowerCase()}`}>
              <h2 className="who-team-name">{teams[teamId].name}</h2>
              <ul className="who-list">
                {players
                  .filter((p) => p.teamId === teamId)
                  .map((player) => (
                    <li key={player.id}>
                      <button
                        type="button"
                        className="who-player"
                        onClick={() => onSelect(player.id)}
                      >
                        {player.name}
                      </button>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
