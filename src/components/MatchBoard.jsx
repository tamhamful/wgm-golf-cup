import { describeMatch, STATUS } from '../lib/tournament.js'

function MatchRow({ match, homePlayer, challengerPlayer, holesPerMatch }) {
  const view = describeMatch(match, holesPerMatch)
  const homeLeads = view.side === 'HOME'
  const challengersLead = view.side === 'CHALLENGERS'

  // Text alternative so the leader is not shown by colour alone.
  let summary = `${homePlayer.name} v ${challengerPlayer.name}: not started`
  if (view.status !== STATUS.NOT_STARTED) {
    const leaderName = homeLeads ? homePlayer.name : challengersLead ? challengerPlayer.name : null
    const verb = view.status === STATUS.COMPLETE ? 'won' : 'leads'
    summary = leaderName
      ? `${leaderName} ${verb} ${view.position}, ${view.detail.toLowerCase()}`
      : `${homePlayer.name} v ${challengerPlayer.name}: ${view.position.toLowerCase()}, ${view.detail.toLowerCase()}`
  }

  return (
    <li className={`match-row status-${view.status.toLowerCase()}`} aria-label={summary}>
      <div className={`match-player match-player-home ${homeLeads ? 'is-leading' : ''}`}>
        <span className="match-player-name">{homePlayer.name}</span>
      </div>

      <div className="match-centre" aria-hidden="true">
        {view.position ? (
          <>
            <strong className="match-position">
              {homeLeads && <span className="lead-arrow">◂</span>}
              {view.position}
              {challengersLead && <span className="lead-arrow">▸</span>}
            </strong>
            <span className={`match-detail ${view.status === STATUS.LIVE ? 'is-live' : ''}`}>
              {view.detail}
            </span>
          </>
        ) : (
          <span className="match-detail match-not-started">{view.detail}</span>
        )}
      </div>

      <div
        className={`match-player match-player-challengers ${challengersLead ? 'is-leading' : ''}`}
      >
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
        <span className="board-centre-label">Match</span>
        <span className="board-team board-team-challengers">{teams.CHALLENGERS.name}</span>
      </div>

      <ol className="match-list">
        {matches.map((match) => (
          <MatchRow
            key={match.id}
            match={match}
            homePlayer={playersById[match.homePlayerId]}
            challengerPlayer={playersById[match.challengerPlayerId]}
            holesPerMatch={holesPerMatch}
          />
        ))}
      </ol>
    </div>
  )
}
