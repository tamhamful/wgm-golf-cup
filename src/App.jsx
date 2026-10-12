import { useMemo, useState } from 'react'
import './App.css'
import { demoTournament } from './data/demoTournament.js'
import { getProjectedPoints, getTeamPoints, getTournamentStatus } from './lib/tournament.js'
import Header from './components/Header.jsx'
import Scoreboard from './components/Scoreboard.jsx'
import DaySelector from './components/DaySelector.jsx'
import MatchBoard from './components/MatchBoard.jsx'
import MatchSchedule from './components/MatchSchedule.jsx'
import PlayersView from './components/PlayersView.jsx'
import ResultsView from './components/ResultsView.jsx'

const TABS = ['Leaderboard', 'Matches', 'Players', 'Results']

function App() {
  const tournament = demoTournament
  const { teams, players, matches, days, targetPoints, holesPerMatch } = tournament

  const playersById = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])),
    [players],
  )
  const points = getTeamPoints(matches, holesPerMatch)
  const projected = getProjectedPoints(matches, holesPerMatch)
  const status = getTournamentStatus(matches, days)

  const [activeTab, setActiveTab] = useState('Leaderboard')
  const [activeDay, setActiveDay] = useState(status.currentDay)

  const dayMatches = matches.filter((m) => m.day === activeDay)
  const showDays = activeTab === 'Leaderboard' || activeTab === 'Matches'

  return (
    <div className="app">
      <Header statusLabel={status.label} />

      <main className="page">
        {tournament.isDemo && (
          <p className="demo-notice">
            Demonstration only. These scores are sample values, not a live tournament.
          </p>
        )}

        <Scoreboard
          teams={teams}
          points={points}
          projected={projected}
          target={targetPoints}
          totalMatches={matches.length}
        />

        <nav className="tabs" aria-label="Sections">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`tab ${activeTab === tab ? 'is-active' : ''}`}
              aria-current={activeTab === tab ? 'page' : undefined}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        {showDays && (
          <DaySelector days={days} activeDay={activeDay} onChange={setActiveDay} />
        )}

        <section className="tab-panel" aria-label={activeTab}>
          {activeTab === 'Leaderboard' && (
            <MatchBoard
              matches={dayMatches}
              teams={teams}
              playersById={playersById}
              holesPerMatch={holesPerMatch}
            />
          )}
          {activeTab === 'Matches' && (
            <MatchSchedule
              matches={dayMatches}
              playersById={playersById}
              holesPerMatch={holesPerMatch}
            />
          )}
          {activeTab === 'Players' && <PlayersView teams={teams} players={players} />}
          {activeTab === 'Results' && (
            <ResultsView
              matches={matches}
              teams={teams}
              playersById={playersById}
              holesPerMatch={holesPerMatch}
            />
          )}
        </section>
      </main>
    </div>
  )
}

export default App
