import { useMemo, useState } from 'react'
import './App.css'
import { getProjectedPoints, getTeamPoints, getTournamentStatus } from './lib/tournament.js'
import { useTournament } from './state/useTournament.js'
import { useCurrentPlayer } from './state/useCurrentPlayer.js'
import Header from './components/Header.jsx'
import Scoreboard from './components/Scoreboard.jsx'
import DaySelector from './components/DaySelector.jsx'
import MatchBoard from './components/MatchBoard.jsx'
import MatchSchedule from './components/MatchSchedule.jsx'
import PlayersView from './components/PlayersView.jsx'
import ResultsView from './components/ResultsView.jsx'
import WhoAreYou from './components/WhoAreYou.jsx'
import AdminView from './components/admin/AdminView.jsx'

const TABS = ['Leaderboard', 'Matches', 'Players', 'Results']

function App() {
  const { tournament, apply, reset } = useTournament()
  const { teams, players, matches, days, targetPoints, holesPerMatch, adminIds } = tournament
  const [currentPlayerId, setCurrentPlayerId] = useCurrentPlayer()

  const playersById = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])),
    [players],
  )
  const points = getTeamPoints(matches, holesPerMatch)
  const projected = getProjectedPoints(matches, holesPerMatch)
  const status = getTournamentStatus(matches, days)

  const [activeTab, setActiveTab] = useState('Leaderboard')
  const [activeDay, setActiveDay] = useState(status.currentDay)

  const currentPlayer = playersById[currentPlayerId]
  if (!currentPlayer) {
    return <WhoAreYou teams={teams} players={players} onSelect={setCurrentPlayerId} />
  }

  // Not secure yet: anyone choosing an admin's name sees this tab.
  // Real sign-in for admins comes with the online database (Stage 6).
  const isAdmin = adminIds.includes(currentPlayerId)
  const tabs = isAdmin ? [...TABS, 'Admin'] : TABS
  const tab = tabs.includes(activeTab) ? activeTab : 'Leaderboard'

  const dayMatches = matches.filter((m) => m.day === activeDay)
  const showDays = tab === 'Leaderboard' || tab === 'Matches'

  return (
    <div className="app">
      <Header
        statusLabel={status.label}
        currentPlayer={currentPlayer}
        onChangePlayer={() => setCurrentPlayerId(null)}
      />

      <main className="page">
        {tournament.isDemo && tab !== 'Admin' && (
          <p className="demo-notice">
            Demonstration only. These scores are sample values, not a live tournament.
          </p>
        )}

        {tab !== 'Admin' && (
          <Scoreboard
            teams={teams}
            points={points}
            projected={projected}
            target={targetPoints}
            totalMatches={matches.length}
          />
        )}

        <nav className="tabs" aria-label="Sections">
          {tabs.map((name) => (
            <button
              key={name}
              type="button"
              className={`tab ${tab === name ? 'is-active' : ''} ${name === 'Admin' ? 'tab-admin' : ''}`}
              aria-current={tab === name ? 'page' : undefined}
              onClick={() => setActiveTab(name)}
            >
              {name}
            </button>
          ))}
        </nav>

        {showDays && (
          <DaySelector days={days} activeDay={activeDay} onChange={setActiveDay} />
        )}

        <section className="tab-panel" aria-label={tab}>
          {tab === 'Leaderboard' && (
            <MatchBoard
              matches={dayMatches}
              teams={teams}
              playersById={playersById}
              holesPerMatch={holesPerMatch}
            />
          )}
          {tab === 'Matches' && (
            <MatchSchedule
              matches={dayMatches}
              playersById={playersById}
              holesPerMatch={holesPerMatch}
            />
          )}
          {tab === 'Players' && <PlayersView teams={teams} players={players} />}
          {tab === 'Results' && (
            <ResultsView
              matches={matches}
              teams={teams}
              playersById={playersById}
              holesPerMatch={holesPerMatch}
            />
          )}
          {tab === 'Admin' && <AdminView tournament={tournament} apply={apply} reset={reset} />}
        </section>
      </main>
    </div>
  )
}

export default App
