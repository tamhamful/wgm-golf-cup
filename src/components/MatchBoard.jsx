import { matchView, STATUS, teamRoleOf, UNASSIGNED_PLAYER } from '../lib/tournament.js'
import { sidePlayerIds } from '../lib/formats.js'

// Player name with (C) or (VC) after it for a captain or vice-captain.
function PlayerName({ player, teams }) {
  const role = teamRoleOf(teams, player)
  return (
    <span className="match-player-name">
      {player.name}
      {role && <span className="role-tag"> ({role})</span>}
    </span>
  )
}

// One player, or a pair shown one above the other.
function SideNames({ players, teams }) {
  if (players.length === 1) return <PlayerName player={players[0]} teams={teams} />
  return (
    <span className="match-pair">
      {players.map((p, i) => (
        <PlayerName key={p.id ?? i} player={p} teams={teams} />
      ))}
    </span>
  )
}

function MatchRow({ tournament, match, playersById, onOpen }) {
  const { teams } = tournament
  const view = matchView(tournament, match)
  const sidePlayers = (side) => sidePlayerIds(match, side).map((id) => playersById[id] ?? UNASSIGNED_PLAYER)
  const homePlayers = sidePlayers('HOME')
  const challengerPlayers = sidePlayers('CHALLENGERS')
  const homeName = homePlayers.map((p) => p.name).join(' & ')
  const challengerName = challengerPlayers.map((p) => p.name).join(' & ')

  const started = view.status !== STATUS.NOT_STARTED
  const homeLeads = view.side === 'HOME'
  const challengersLead = view.side === 'CHALLENGERS'

  let homeScore = null
  let challengerScore = null
  let summary = `${homeName} v ${challengerName}: not started`

  if (view.kind === 'MATCH') {
    // The score sits in the leader's box, on the edge next to the centre.
    // When all square (or halved), "AS" shows on both sides.
    const allSquare = started && !view.side
    homeScore = homeLeads ? view.position : allSquare ? 'AS' : null
    challengerScore = challengersLead ? view.position : allSquare ? 'AS' : null
    if (started) {
      const leaderName = homeLeads ? homeName : challengersLead ? challengerName : null
      const verb = view.status === STATUS.COMPLETE ? 'won' : 'leads'
      summary = leaderName
        ? `${leaderName} ${verb} ${view.position}, ${view.detail.toLowerCase()}`
        : `${homeName} v ${challengerName}: ${view.position.toLowerCase()}, ${view.detail.toLowerCase()}`
    }
  } else if (started) {
    // Stableford / stroke play: each player's own score, better one highlighted.
    homeScore = view.scores.HOME
    challengerScore = view.scores.CHALLENGERS
    summary = `${homeName} ${homeScore}, ${challengerName} ${challengerScore}, ${view.detail.toLowerCase()}`
  }

  const centre = view.status === STATUS.LIVE ? view.holesPlayed : view.detail

  // Spans rather than divs so the row can sit inside a button.
  const content = (
    <>
      <span
        className={`match-player match-player-home ${homeLeads ? 'is-leading' : ''}`}
        aria-hidden="true"
      >
        <SideNames players={homePlayers} teams={teams} />
        {homeScore && <span className="match-score">{homeScore}</span>}
      </span>

      <span className="match-centre" aria-hidden="true">
        <span
          className={
            view.status === STATUS.LIVE
              ? 'match-through'
              : `match-detail ${view.status === STATUS.NOT_STARTED ? 'match-not-started' : ''}`
          }
        >
          {centre}
        </span>
      </span>

      <span
        className={`match-player match-player-challengers ${challengersLead ? 'is-leading' : ''}`}
        aria-hidden="true"
      >
        {challengerScore && <span className="match-score">{challengerScore}</span>}
        <SideNames players={challengerPlayers} teams={teams} />
      </span>
    </>
  )

  const rowClass = `match-row status-${view.status.toLowerCase()} ${view.kind === 'TEAM_TOTAL' ? 'is-team-total' : ''}`

  // Only players in this match's group (and admins) get a clickable row.
  return (
    <li>
      {onOpen ? (
        <button
          type="button"
          className={`${rowClass} is-clickable`}
          aria-label={`${summary}. Open scorecard`}
          onClick={() => onOpen(match)}
        >
          {content}
        </button>
      ) : (
        <div className={rowClass} aria-label={summary} role="group">
          {content}
        </div>
      )}
    </li>
  )
}

export default function MatchBoard({ tournament, matches, playersById, canOpen, onOpen }) {
  const { teams } = tournament
  return (
    <div className="match-board">
      <div className="match-board-header">
        <span className="board-team board-team-home">{teams.HOME.name}</span>
        <span className="board-centre-label">Through</span>
        <span className="board-team board-team-challengers">{teams.CHALLENGERS.name}</span>
      </div>

      <ol className="match-list">
        {matches.map((match) => (
          <MatchRow
            key={match.id}
            tournament={tournament}
            match={match}
            playersById={playersById}
            onOpen={canOpen(match) ? onOpen : null}
          />
        ))}
      </ol>
    </div>
  )
}
