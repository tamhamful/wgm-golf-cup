import { useState } from 'react'
import './App.css'

const BRAND = {
  blue: '#2596be',
  green: '#216d37',
}

const teams = [
  {
    id: 'blue',
    name: 'Team Blue',
    colour: BRAND.blue,
    players: [
      'Tom Hamilton',
      'James Wilson',
      'David Campbell',
      'Mark Stewart',
      'Andrew Brown',
      'Chris Taylor',
    ],
  },
  {
    id: 'green',
    name: 'Team Green',
    colour: BRAND.green,
    players: [
      'Paul Mitchell',
      'Steven Clark',
      'Gordon Reid',
      'Alan Murray',
      'Scott Fraser',
      'Brian Walker',
    ],
  },
]

const initialMatches = [
  {
    id: 1,
    day: 1,
    playerA: 'Tom Hamilton',
    playerB: 'Greig Dyer',
    teamA: 'blue',
    teamB: 'green',
    position: '1 UP',
    holesPlayed: 14,
    winner: 'blue',
    status: 'LIVE',
  },
  {
    id: 2,
    day: 1,
    playerA: 'Ian Ross',
    playerB: 'Ian Mathieson',
    teamA: 'blue',
    teamB: 'green',
    position: '2 UP',
    holesPlayed: 12,
    winner: 'green',
    status: 'LIVE',
  },
  {
    id: 3,
    day: 1,
    playerA: 'David Kelly',
    playerB: 'Bobby Brown',
    teamA: 'blue',
    teamB: 'green',
    position: '2&1',
    holesPlayed: 17,
    winner: 'blue',
    status: 'COMPLETE',
  },
  {
    id: 4,
    day: 1,
    playerA: 'James Wilson',
    playerB: 'Steven Clark',
    teamA: 'blue',
    teamB: 'green',
    position: 'ALL SQUARE',
    holesPlayed: 8,
    winner: null,
    status: 'LIVE',
  },
  {
    id: 5,
    day: 1,
    playerA: 'David Campbell',
    playerB: 'Gordon Reid',
    teamA: 'blue',
    teamB: 'green',
    position: 'NOT STARTED',
    holesPlayed: 0,
    winner: null,
    status: 'UP NEXT',
  },
  {
    id: 6,
    day: 1,
    playerA: 'Mark Stewart',
    playerB: 'Alan Murray',
    teamA: 'blue',
    teamB: 'green',
    position: 'NOT STARTED',
    holesPlayed: 0,
    winner: null,
    status: 'UP NEXT',
  },
]

function App() {
  const [activeDay, setActiveDay] = useState(1)
  const [activeTab, setActiveTab] = useState('Leaderboard')
  const [matches, setMatches] = useState(initialMatches)
const [homeTeamName, setHomeTeamName] = useState('Home Team')
const [challengersName, setChallengersName] = useState('Challengers')
const [showTeamSettings, setShowTeamSettings] = useState(false)
  // These are example starting points, not yet calculated from match results.
  const [bluePoints, setBluePoints] = useState(4.5)
  const [greenPoints, setGreenPoints] = useState(3.5)

  function changeDemoScore(matchId, winner) {
    setMatches((currentMatches) =>
      currentMatches.map((match) => {
        if (match.id !== matchId) return match

        return {
          ...match,
          scoreA: match.scoreA + (winner === 'blue' ? 1 : 0),
          scoreB: match.scoreB + (winner === 'green' ? 1 : 0),
          through: Math.min(match.through + 1, 18),
          status: 'LIVE',
        }
      }),
    )
  }

  function matchPosition(match) {
    const difference = match.scoreA - match.scoreB

    if (difference === 0) return 'ALL SQUARE'

    return `${Math.abs(difference)} UP`
  }

  const totalPoints = bluePoints + greenPoints
  const blueProgress = Math.min((bluePoints / 10) * 100, 100)
  const greenProgress = Math.min((greenPoints / 10) * 100, 100)

  const visibleMatches =
    activeTab === 'Results'
      ? matches.filter((match) => match.status === 'COMPLETE')
      : matches.filter((match) => match.day === activeDay)

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="WGM Golf Cup home">
          <span className="brand-mark">WGM</span>
          <span className="brand-divider" />
          <span className="brand-title">GOLF CUP</span>
        </a>

        <span className="tournament-label">THE ANNUAL TEAM CHALLENGE</span>
      </header>

      <main className="main-content">
        <section className="scoreboard">
          <div className="scoreboard-teams">
            <div className="score-team score-team-blue">
              <span className="team-colour-bar" />
              <div>
                <span className="team-overline">THE HOME TEAM</span>
                <h2>Team Blue</h2>
              </div>
              <span className="large-score">{bluePoints.toFixed(1)}</span>
            </div>

            <div className="score-separator">:</div>

            <div className="score-team score-team-green">
              <span className="large-score">{greenPoints.toFixed(1)}</span>
              <div>
                <span className="team-overline">THE CHALLENGERS</span>
                <h2>Team Green</h2>
              </div>
              <span className="team-colour-bar" />
            </div>
          </div>

          <div className="score-progress" aria-label="Progress towards ten points">
            <div
              className="score-progress-blue"
              style={{ width: `${blueProgress}%` }}
            />
            <div
              className="score-progress-green"
              style={{ width: `${greenProgress}%` }}
            />
          </div>

          <div className="scoreboard-footer">
            <span>
              <strong>{totalPoints.toFixed(1)}</strong> POINTS AWARDED
            </span>
            <span className="winning-target">
              FIRST TO <strong>10 POINTS</strong> WINS THE CUP
            </span>
            <span>
              <strong>{Math.max(0, 18 - totalPoints).toFixed(1)}</strong>{' '}
              POINTS REMAIN
            </span>
          </div>
        </section>

        <nav className="content-tabs" aria-label="Tournament sections">
          {['Leaderboard', 'Matches', 'Players', 'Results'].map((tab) => (
            <button
              key={tab}
              className={`content-tab ${activeTab === tab ? 'selected' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        {activeTab !== 'Players' && (
          <section className="day-navigation">
            <div>
              <span className="section-kicker">THE COMPETITION</span>
              <h1>
                {activeTab === 'Results'
                  ? 'Final results'
                  : activeTab === 'Matches'
                    ? 'Match centre'
                    : 'Leaderboard'}
              </h1>
            </div>

            {activeTab !== 'Results' && (
              <div className="day-buttons">
                {[1, 2, 3].map((day) => (
                  <button
                    key={day}
                    className={`day-button ${activeDay === day ? 'active' : ''}`}
                    onClick={() => setActiveDay(day)}
                  >
                    Day {day}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'Players' ? (
          <section className="players-section">
            <div className="section-title-row">
              <div>
                <span className="section-kicker">THE SQUADS</span>
                <h1>Meet the teams</h1>
              </div>
              <span className="subtle-label">12 PLAYERS</span>
            </div>

            <div className="players-grid">
              {teams.map((team) => (
                <article className="players-team" key={team.id}>
                  <h2>
                    <span
                      className="team-colour-bar"
                      style={{ backgroundColor: team.colour }}
                    />
                    {team.name}
                  </h2>

                  {team.players.map((player, index) => (
                    <div className="player-row" key={player}>
                      <span className="player-number">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span>{player}</span>
                    </div>
                  ))}
                </article>
              ))}
            </div>
          </section>
        ) : (
          <section className="matches-section">
            <div className="matches-heading">
              <div>
                <span className="section-kicker">
                  {activeTab === 'Results' ? 'COMPLETED MATCHES' : `DAY 0${activeDay}`}
                </span>
                <h2>
                  {activeTab === 'Results'
                    ? 'Results'
                    : activeTab === 'Matches'
                      ? 'All matches'
                      : 'Singles matches'}
                </h2>
              </div>
              <span className="subtle-label">
                {visibleMatches.length} MATCHES
              </span>
            </div>

            {visibleMatches.length === 0 ? (
              <div className="empty-state">
                <h3>No completed matches yet</h3>
                <p>Final scores will appear here when matches are completed.</p>
              </div>
            ) : (
              <div className="matches-list">
  <div className="leaderboard-columns">
    <div className="leaderboard-team-heading home-heading">
      <span className="team-heading-dot" />
      <span>{homeTeamName}</span>
    </div>

    <div className="leaderboard-centre-heading">MATCH</div>

    <div className="leaderboard-team-heading challengers-heading">
      <span>{challengersName}</span>
      <span className="team-heading-dot" />
    </div>
  </div>

  {visibleMatches.map((match) => (
    <article className="leaderboard-match" key={match.id}>
      <div
        className={`leaderboard-player home-player ${
          match.winner === 'blue' ? 'player-winning home-winning' : ''
        }`}
      >
        <span className="leaderboard-player-name">
          {match.playerA}
        </span>
      </div>

      <div className="leaderboard-match-position">
        <strong>{match.position}</strong>

        <span>
          {match.status === 'COMPLETE'
            ? 'FINAL'
            : match.holesPlayed > 0
              ? `${match.holesPlayed} HOLES`
              : match.status === 'UP NEXT'
                ? 'UP NEXT'
                : 'NOT STARTED'}
        </span>
      </div>

      <div
        className={`leaderboard-player challenger-player ${
          match.winner === 'green'
            ? 'player-winning challengers-winning'
            : ''
        }`}
      >
        <span className="leaderboard-player-name">
          {match.playerB}
        </span>
      </div>
    </article>
  ))}
</div>

  
            )}
          </section>
        )}

        <footer className="footer">
          <span>
            <strong>WGM</strong> GOLF CUP
          </span>
          <span>THE WORK. THE TEAM. THE CUP.</span>
        </footer>
      </main>
    </div>
  )
}

export default App