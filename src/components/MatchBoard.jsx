import { describeMatch, STATUS, teamRoleOf, UNASSIGNED_PLAYER } from '../lib/tournament.js'

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

function MatchRow({ match, homePlayer, challengerPlayer, holesPerMatch, onOpen, teams }) {
  const view = describeMatch(match, holesPerMatch)
  const started = view.status !== STATUS.NOT_STARTED
  const homeLeads = view.side === 'HOME'
  const challengersLead = view.side === 'CHALLENGERS'
  const allSquare = started && !view.side

  // The score sits in the leader's box, on the edge next to the centre.
  // When all square (or halved), "AS" shows on both sides.
  const homeScore = homeLeads ? view.position : allSquare ? 'AS' : null
  const challengerScore = challengersLead ? view.position : allSquare ? 'AS' : null

  let centre = view.detail
  if (view.status === STATUS.LIVE) centre = view.holesPlayed

  // Text description for screen readers.
  let summary = `${homePlayer.name} v ${challengerPlayer.name}: not started`
  if (started) {
    const leaderName = homeLeads ? homePlayer.name : challengersLead ? challengerPlayer.name : null
    const verb = view.status === STATUS.COMPLETE ? 'won' : 'leads'
    summary = leaderName
      ? `${leaderName} ${verb} ${view.position}, ${view.detail.toLowerCase()}`
      : `${homePlayer.name} v ${challengerPlayer.name}: ${view.position.toLowerCase()}, ${view.detail.toLowerCase()}`
  }

  // Spans rather than divs so the row can sit inside a button.
  const content = (
    <>
      <span
        className={`match-player match-player-home ${homeLeads ? 'is-leading' : ''}`}
        aria-hidden="true"
      >
        <PlayerName player={homePlayer} teams={teams} />
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
        <PlayerName player={challengerPlayer} teams={teams} />
      </span>
    </>
  )

  const rowClass = `match-row status-${view.status.toLowerCase()}`

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

export default function MatchBoard({ matches, teams, playersById, holesPerMatch, canOpen, onOpen }) {
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
            match={match}
            homePlayer={playersById[match.homePlayerId] ?? UNASSIGNED_PLAYER}
            challengerPlayer={playersById[match.challengerPlayerId] ?? UNASSIGNED_PLAYER}
            holesPerMatch={holesPerMatch}
            teams={teams}
            onOpen={canOpen(match) ? onOpen : null}
          />
        ))}
      </ol>
    </div>
  )
}
