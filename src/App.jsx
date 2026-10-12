import { useMemo, useState } from 'react'
import './App.css'
import { getProjectedPoints, getTeamPoints, getTournamentStatus } from './lib/tournament.js'
import { canScoreMatch } from './lib/scoring.js'
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
import Scorecard from './components/Scorecard.jsx'

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
  const currentDay = tournament.currentDay ?? days[0]
  const status = getTournamentStatus(matches, days, holesPerMatch, currentDay)

  const [activeTab, setActiveTab] = useState('Leaderboard')
  const [scoringMatchId, setScoringMatchId] = useState(null)

  // The leaderboard shows the admin's current day. A viewer can tap another
  // day to look at it, but when the admin changes the day everyone follows.
  const [viewedDay, setViewedDay] = useState(null)
  const [followingDay, setFollowingDay] = useState(currentDay)
  if (followingDay !== currentDay) {
    setFollowingDay(currentDay)
    setViewedDay(null)
  }
  const activeDay = viewedDay ?? currentDay
  const setActiveDay = (day) => setViewedDay(day === currentDay ? null : day)

  const currentPlayer = playersById[currentPlayerId]
  if (!currentPlayer) {
    return <WhoAreYou players={players} onSelect={setCurrentPlayerId} />
  }

  // Not secure yet: anyone choosing an admin's name sees this tab.
  // Real sign-in for admins comes with the online database (Stage 6).
  const isAdmin = adminIds.includes(currentPlayerId)
  const tabs = isAdmin ? [...TABS, 'Admin'] : TABS
  const tab = tabs.includes(activeTab) ? activeTab : 'Leaderboard'

  const dayMatches = matches.filter((m) => m.day === activeDay)
  const showDays = tab === 'Leaderboard' || tab === 'Matches'

  // Scoring: only the four players in a match's group, or an admin, can open it.
  const canOpenMatch = (match) =>
    Boolean(match.homePlayerId && match.challengerPlayerId) &&
    canScoreMatch(tournament, match, currentPlayerId)
  const openableToday = dayMatches.some(canOpenMatch)
  const scoringMatch = matches.find((m) => m.id === scoringMatchId)

  if (scoringMatch && canOpenMatch(scoringMatch)) {
    return (
      <div className="app">
        <Header
          statusLabel={status.label}
          currentPlayer={currentPlayer}
          onChangePlayer={() => {
            setScoringMatchId(null)
            setCurrentPlayerId(null)
          }}
        />
        <main className="page">
          <Scorecard
            key={scoringMatch.id}
            tournament={tournament}
            match={scoringMatch}
            home={playersById[scoringMatch.homePlayerId]}
            challenger={playersById[scoringMatch.challengerPlayerId]}
            currentPlayerId={currentPlayerId}
            apply={apply}
            onBack={() => setScoringMatchId(null)}
          />
        </main>
      </div>
    )
  }

  const openScorecard = (match) => {
    setScoringMatchId(match.id)
    window.scrollTo(0, 0)
  }

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
            <>
              {openableToday && (
                <p className="score-hint">
                  {isAdmin
                    ? 'Tap a match to enter or correct scores.'
                    : "Tap your group's matches to enter scores."}
                </p>
              )}
              <MatchBoard
                matches={dayMatches}
                teams={teams}
                playersById={playersById}
                holesPerMatch={holesPerMatch}
                canOpen={canOpenMatch}
                onOpen={openScorecard}
              />
            </>
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
