import { useMemo, useState } from 'react'
import './App.css'
import { getProjectedPoints, getTeamPoints, getTournamentStatus } from './lib/tournament.js'
import { canScoreMatch } from './lib/scoring.js'
import { isSupabaseConfigured } from './lib/supabaseClient.js'
import { useTournament } from './state/useTournament.js'
import { useAdminSession } from './state/useAdminSession.js'
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
import AdminSignIn from './components/AdminSignIn.jsx'
import Scorecard from './components/Scorecard.jsx'
import Ticker from './components/Ticker.jsx'
import { buildTickerEvents } from './lib/ticker.js'

const TABS = ['Leaderboard', 'Matches', 'Players', 'Results']

function Message({ title, children }) {
  return (
    <div className="app">
      <Header />
      <main className="page message-page">
        <h1 className="who-title">{title}</h1>
        {children}
      </main>
    </div>
  )
}

function App() {
  if (!isSupabaseConfigured) {
    return (
      <Message title="Not connected">
        <p className="who-intro">
          The database connection settings are missing (VITE_SUPABASE_URL and
          VITE_SUPABASE_PUBLISHABLE_KEY).
        </p>
      </Message>
    )
  }
  return <ConnectedApp />
}

function ConnectedApp() {
  const data = useTournament()
  const admin = useAdminSession()

  if (!data.tournament) {
    return data.loadError ? (
      <Message title="Can't load the tournament">
        <p className="who-intro">{data.loadError}</p>
        <button type="button" className="button button-secondary retry-button" onClick={data.reload}>
          Try again
        </button>
      </Message>
    ) : (
      <Message title="Loading…" />
    )
  }

  return <TournamentApp data={data} admin={admin} />
}

function TournamentApp({ data, admin }) {
  const { tournament, notices, apply, scoring, syncError, dismissSyncError } = data
  const { teams, players, matches, days, targetPoints, holesPerMatch } = tournament
  const [currentPlayerId, setCurrentPlayerId] = useCurrentPlayer()

  const playersById = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])),
    [players],
  )
  const tickerEvents = useMemo(() => buildTickerEvents(tournament, notices), [tournament, notices])
  const points = getTeamPoints(matches, holesPerMatch)
  const projected = getProjectedPoints(matches, holesPerMatch)
  const currentDay = tournament.currentDay ?? days[0]
  const status = getTournamentStatus(matches, days, holesPerMatch, currentDay)

  const [activeTab, setActiveTab] = useState('Leaderboard')
  const [scoringMatchId, setScoringMatchId] = useState(null)
  const [showSignIn, setShowSignIn] = useState(false)

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

  // Admin status comes from the email sign-in, checked by the database.
  // Players are identified by the name picked on this device.
  const actor = { playerId: currentPlayerId, isAdmin: admin.isAdmin }
  const tabs = admin.isAdmin ? [...TABS, 'Admin'] : TABS
  const tab = tabs.includes(activeTab) ? activeTab : 'Leaderboard'

  const dayMatches = matches.filter((m) => m.day === activeDay)
  const showDays = tab === 'Leaderboard' || tab === 'Matches'

  // Scoring: only the four players in a match's group, or an admin, can open it.
  const canOpenMatch = (match) =>
    Boolean(match.homePlayerId && match.challengerPlayerId) && canScoreMatch(tournament, match, actor)
  const openableToday = dayMatches.some(canOpenMatch)
  const scoringMatch = matches.find((m) => m.id === scoringMatchId)

  const header = (
    <Header
      statusLabel={status.label}
      currentPlayer={currentPlayer}
      onChangePlayer={() => {
        setScoringMatchId(null)
        setCurrentPlayerId(null)
      }}
    />
  )

  const syncBanner = syncError && (
    <p className="error-box sync-error" role="alert">
      {syncError}
      <button type="button" className="link-button" onClick={dismissSyncError}>
        Dismiss
      </button>
    </p>
  )

  if (showSignIn && !admin.isAdmin) {
    return (
      <div className="app">
        {header}
        <main className="page">
          <AdminSignIn
            signedInEmail={admin.email}
            isAdmin={admin.isAdmin}
            onSend={admin.sendSignInLink}
            onSignOut={admin.signOut}
            onClose={() => setShowSignIn(false)}
          />
        </main>
      </div>
    )
  }

  if (scoringMatch && canOpenMatch(scoringMatch)) {
    return (
      <div className="app">
        {header}
        <main className="page">
          {syncBanner}
          <Scorecard
            key={scoringMatch.id}
            tournament={tournament}
            match={scoringMatch}
            home={playersById[scoringMatch.homePlayerId]}
            challenger={playersById[scoringMatch.challengerPlayerId]}
            actor={actor}
            scoring={scoring}
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
      {header}

      <main className="page">
        {syncBanner}

        {tab !== 'Admin' && <Ticker events={tickerEvents} />}

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
                  {admin.isAdmin
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
          {tab === 'Admin' && (
            <AdminView
              tournament={tournament}
              apply={apply}
              onClearScores={() => scoring.clearAllScores(actor)}
              adminEmail={admin.email}
              onSignOut={admin.signOut}
              notices={notices}
              onPostNotice={data.postNotice}
              onDeleteNotice={data.deleteNotice}
            />
          )}
        </section>

        {!admin.isAdmin && (
          <footer className="page-footer">
            <button type="button" className="link-button" onClick={() => setShowSignIn(true)}>
              Admin sign in
            </button>
          </footer>
        )}
      </main>
    </div>
  )
}

export default App
