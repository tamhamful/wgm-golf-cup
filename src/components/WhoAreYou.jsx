import Brand from './Brand.jsx'

// One alphabetical list with no team information: players may not know
// their teams until the sides have been picked.
export default function WhoAreYou({ players, onSelect }) {
  const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <Brand />
        </div>
      </header>

      <main className="page who-page">
        <h1 className="who-title">Who are you?</h1>
        <p className="who-intro">Choose your name. This device will remember you.</p>

        <ul className="who-list">
          {sorted.map((player) => (
            <li key={player.id}>
              <button type="button" className="who-player" onClick={() => onSelect(player.id)}>
                {player.name}
              </button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
