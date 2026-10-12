import { useState } from 'react'
import { computeMatchState, HOLE_RESULT, STATUS } from '../lib/scoring.js'

const initials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .join('')
    .slice(0, 3)

function StatusLine({ state, home, challenger }) {
  const leaderName = state.leader === 'HOME' ? home.name : challenger.name
  const sideClass = state.leader ? `is-${state.leader.toLowerCase()}` : ''

  if (state.status === STATUS.NOT_STARTED) {
    return (
      <div className="scorecard-status">
        <strong>Not started</strong>
        <span>Enter hole 1 to start the match</span>
      </div>
    )
  }

  if (state.status === STATUS.COMPLETE) {
    return (
      <div className={`scorecard-status is-final ${sideClass}`}>
        <strong>{state.winner ? `${leaderName} wins ${state.result}` : 'Match halved'}</strong>
        <span>Final</span>
      </div>
    )
  }

  return (
    <div className={`scorecard-status ${sideClass}`}>
      <strong>{state.leader ? `${leaderName} ${state.margin} UP` : 'All square'}</strong>
      <span>
        Through {state.holesPlayed}
        {state.dormie ? ' · Dormie' : ''}
      </span>
    </div>
  )
}

// scoring: the score-changing actions from useTournament
// actor: who is scoring, { playerId, isAdmin }
export default function Scorecard({ tournament, match, home, challenger, actor, scoring, onBack }) {
  const { holesPerMatch, teams } = tournament
  const state = computeMatchState(match.holes, holesPerMatch)
  const { isAdmin } = actor
  const isComplete = state.status === STATUS.COMPLETE
  const canEdit = !isComplete || isAdmin

  const [selectedHole, setSelectedHole] = useState(null) // null = next hole
  const [message, setMessage] = useState(null)

  const nextHole = isComplete ? null : state.holesPlayed + 1
  const activeHole = selectedHole ?? nextHole
  const isCorrection = selectedHole !== null

  const record = (result) => {
    // Warn if a correction would end the match earlier and remove later holes.
    let note = null
    if (isCorrection) {
      const preview = [...match.holes.slice(0, state.holesPlayed)]
      preview[activeHole - 1] = result
      const after = computeMatchState(preview, holesPerMatch)
      if (after.holesPlayed < state.holesPlayed) {
        note = `Hole ${activeHole} changed. The match now finishes ${after.result} after hole ${after.holesPlayed}, so later holes were removed.`
      } else {
        note = `Hole ${activeHole} changed.`
      }
    }
    const error = scoring.recordHole(match.id, activeHole, result, actor)
    setMessage(error ? { type: 'error', text: error } : note && { type: 'info', text: note })
    if (!error) setSelectedHole(null)
  }

  const undo = () => {
    const error = scoring.undoLastHole(match.id, actor)
    setMessage(error ? { type: 'error', text: error } : null)
  }

  const reset = () => {
    if (!window.confirm(`Clear every hole in Match ${match.number}? This cannot be undone.`)) return
    const error = scoring.resetMatch(match.id, actor)
    setMessage(error ? { type: 'error', text: error } : { type: 'info', text: 'Match reset.' })
    setSelectedHole(null)
  }

  const onHoleTap = (hole) => {
    setMessage(null)
    if (hole > state.holesPlayed || !canEdit) return
    setSelectedHole(hole === selectedHole ? null : hole)
  }

  const holeCell = (hole) => {
    const result = hole <= state.holesPlayed ? match.holes[hole - 1] : null
    let mark = ''
    let cls = ''
    if (result === HOLE_RESULT.HOME) {
      mark = initials(home.name)
      cls = 'is-home'
    } else if (result === HOLE_RESULT.CHALLENGERS) {
      mark = initials(challenger.name)
      cls = 'is-challengers'
    } else if (result === HOLE_RESULT.HALVED) {
      mark = '½'
      cls = 'is-halved'
    }
    const label = result
      ? `Hole ${hole}: ${result === 'HALVED' ? 'halved' : `won by ${result === 'HOME' ? home.name : challenger.name}`}`
      : `Hole ${hole}: not played`

    return (
      <button
        key={hole}
        type="button"
        className={`hole-cell ${cls} ${hole === activeHole ? 'is-active' : ''}`}
        onClick={() => onHoleTap(hole)}
        disabled={!result || !canEdit}
        aria-label={label}
        aria-pressed={hole === selectedHole}
      >
        <span className="hole-number">{hole}</span>
        <span className="hole-mark">{mark}</span>
      </button>
    )
  }

  const holeNumbers = Array.from({ length: holesPerMatch }, (_, i) => i + 1)
  const half = Math.ceil(holesPerMatch / 2)

  return (
    <div className="scorecard">
      <button type="button" className="link-button back-link" onClick={onBack}>
        ← Back to leaderboard
      </button>

      <p className="scorecard-meta">
        Match {match.number} · Day {match.day}
      </p>

      <div className="scorecard-players">
        <span className="scorecard-player is-home">
          <span className="scorecard-team">{teams.HOME.name}</span>
          {home.name}
        </span>
        <span className="scorecard-v">v</span>
        <span className="scorecard-player is-challengers">
          <span className="scorecard-team">{teams.CHALLENGERS.name}</span>
          {challenger.name}
        </span>
      </div>

      <StatusLine state={state} home={home} challenger={challenger} />

      {message && (
        <p className={message.type === 'error' ? 'error-box' : 'info-box'} role="status">
          {message.text}
        </p>
      )}

      {activeHole && canEdit && (
        <section className="hole-entry" aria-label={`Enter result for hole ${activeHole}`}>
          <h2 className="hole-entry-title">
            {isCorrection ? `Change hole ${activeHole}` : `Hole ${activeHole}`}
            <span>Who won the hole?</span>
          </h2>
          <div className="hole-entry-buttons">
            <button type="button" className="result-button is-home" onClick={() => record(HOLE_RESULT.HOME)}>
              {home.name}
            </button>
            <button type="button" className="result-button is-halved" onClick={() => record(HOLE_RESULT.HALVED)}>
              Halved
            </button>
            <button
              type="button"
              className="result-button is-challengers"
              onClick={() => record(HOLE_RESULT.CHALLENGERS)}
            >
              {challenger.name}
            </button>
          </div>
          <div className="hole-entry-actions">
            {isCorrection ? (
              <button type="button" className="button button-quiet" onClick={() => setSelectedHole(null)}>
                Cancel change
              </button>
            ) : (
              state.holesPlayed > 0 && (
                <button type="button" className="button button-quiet" onClick={undo}>
                  Undo hole {state.holesPlayed}
                </button>
              )
            )}
          </div>
        </section>
      )}

      {isComplete && !isAdmin && (
        <p className="settings-help">This match is finished. If a hole is wrong, ask an admin to correct it.</p>
      )}

      <section className="hole-grid-section" aria-label="Hole by hole">
        <div className="hole-grid-heading">
          <span>Hole by hole</span>
          {canEdit && state.holesPlayed > 0 && <span>Tap a hole to change it</span>}
        </div>
        <div className="hole-grid">{holeNumbers.slice(0, half).map(holeCell)}</div>
        <div className="hole-grid">{holeNumbers.slice(half).map(holeCell)}</div>
        <div className="hole-totals">
          <span className="is-home">
            {home.name}: {state.holesWon.HOME} won
          </span>
          <span>{state.holesHalved} halved</span>
          <span className="is-challengers">
            {challenger.name}: {state.holesWon.CHALLENGERS} won
          </span>
        </div>
      </section>

      {isAdmin && state.holesPlayed > 0 && (
        <section className="settings-block settings-danger">
          <h3>Reset match</h3>
          <p className="settings-help">Clears every hole in this match. Admins only.</p>
          <button type="button" className="button button-danger" onClick={reset}>
            Reset match
          </button>
        </section>
      )}
    </div>
  )
}
