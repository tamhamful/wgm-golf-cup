import { describeMatch, STATUS, UNASSIGNED_PLAYER } from '../lib/tournament.js'

function MatchRow({ match, homePlayer, challengerPlayer, holesPerMatch }) {
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

  return (
    <li className={`match-row status-${view.status.toLowerCase()}`} aria-label={summary}>
      <div
        className={`match-player match-player-home ${homeLeads ? 'is-leading' : ''}`}
        aria-hidden="true"
      >
        <span className="match-player-name">{homePlayer.name}</span>
        {homeScore && <span className="match-score">{homeScore}</span>}
      </div>

      <div className="match-centre" aria-hidden="true">
        <span
          className={
            view.status === STATUS.LIVE
              ? 'match-through'
              : `match-detail ${view.status === STATUS.NOT_STARTED ? 'match-not-started' : ''}`
          }
        >
          {centre}
        </span>
      </div>

      <div
        className={`match-player match-player-challengers ${challengersLead ? 'is-leading' : ''}`}
        aria-hidden="true"
      >
        {challengerScore && <span className="match-score">{challengerScore}</span>}
        <span className="match-player-name">{challengerPlayer.name}</span>
      </div>
    </li>
  )
}

export default function MatchBoard({ matches, teams, playersById, holesPerMatch }) {
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
          />
        ))}
      </ol>
    </div>
  )
}
