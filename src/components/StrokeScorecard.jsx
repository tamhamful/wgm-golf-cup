import { useState } from 'react'
import { STATUS } from '../lib/scoring.js'
import { courseOf, FORMATS, formatForDay } from '../lib/formats.js'
import {
  computePairing,
  decodeHole,
  encodeHole,
  formatRoundScore,
  PICK_UP,
  shotsOnHole,
  stablefordPoints,
} from '../lib/strokeplay.js'
import { formatHandicap } from '../lib/admin.js'

const SIDES = ['HOME', 'CHALLENGERS']
const firstName = (player) => player.name.split(' ')[0]

// - 5 + and a pick-up button for one player's score on the hole.
function ScoreInput({ player, side, value, par, shots, format, onChange }) {
  const pickedUp = value === PICK_UP
  const shotText = shots === 0 ? 'no shots' : shots === 1 ? '1 shot' : shots === -1 ? 'gives 1 shot' : `${shots} shots`
  const step = (delta) => onChange(Math.min(20, Math.max(1, (pickedUp ? par : value) + delta)))
  const points = format === 'STABLEFORD' ? stablefordPoints(value, par, shots) : null

  return (
    <div className={`score-input is-${side.toLowerCase()}`}>
      <div className="score-input-name">
        <strong>{player.name}</strong>
        <span>
          {shotText}
          {points !== null && ` · ${points} pt${points === 1 ? '' : 's'}`}
        </span>
      </div>
      <div className="score-input-controls">
        <button type="button" className="stepper" aria-label={`${player.name}: one fewer`} onClick={() => step(-1)}>
          −
        </button>
        <span className="score-input-value" aria-live="polite">
          {pickedUp ? 'P' : value}
        </span>
        <button type="button" className="stepper" aria-label={`${player.name}: one more`} onClick={() => step(1)}>
          +
        </button>
        <button
          type="button"
          className={`pickup ${pickedUp ? 'is-on' : ''}`}
          aria-pressed={pickedUp}
          onClick={() => onChange(pickedUp ? par : PICK_UP)}
        >
          Pick up
        </button>
      </div>
    </div>
  )
}

// Entry panel for one hole. Starts at par (or the saved scores when
// correcting a hole).
function HoleEntry({ hole, course, players, handicaps, saved, format, isCorrection, onSave, onCancel, onUndo, canUndo, undoHole }) {
  const { par, si } = course.holes[hole - 1]
  const [values, setValues] = useState(() => (saved ? decodeHole(saved) : { HOME: par, CHALLENGERS: par }))

  return (
    <section className="hole-entry" aria-label={`Enter scores for hole ${hole}`}>
      <h2 className="hole-entry-title">
        {isCorrection ? `Change hole ${hole}` : `Hole ${hole}`}
        <span>
          Par {par} · Stroke index {si}
        </span>
      </h2>
      {SIDES.map((side) => (
        <ScoreInput
          key={side}
          side={side}
          player={players[side]}
          value={values[side]}
          par={par}
          shots={shotsOnHole(handicaps[side], si, course.holes.length)}
          format={format}
          onChange={(v) => setValues((current) => ({ ...current, [side]: v }))}
        />
      ))}
      <button type="button" className="button save-hole" onClick={() => onSave(encodeHole(values.HOME, values.CHALLENGERS))}>
        Save hole {hole}
      </button>
      <div className="hole-entry-actions">
        {isCorrection ? (
          <button type="button" className="button button-quiet" onClick={onCancel}>
            Cancel change
          </button>
        ) : (
          canUndo && (
            <button type="button" className="button button-quiet" onClick={onUndo}>
              Undo hole {undoHole}
            </button>
          )
        )}
      </div>
    </section>
  )
}

export default function StrokeScorecard({ tournament, match, home, challenger, actor, scoring, onBack }) {
  const { teams } = tournament
  const format = formatForDay(tournament, match.day)
  const course = courseOf(tournament)
  const pairing = computePairing(tournament, match)
  const isComplete = pairing.status === STATUS.COMPLETE
  const players = { HOME: home, CHALLENGERS: challenger }
  const handicaps = { HOME: home.handicap ?? 0, CHALLENGERS: challenger.handicap ?? 0 }

  const [selectedHole, setSelectedHole] = useState(null) // null = next hole
  const [message, setMessage] = useState(null)

  const nextHole = isComplete ? null : pairing.holesPlayed + 1
  const activeHole = selectedHole ?? nextHole
  const isCorrection = selectedHole !== null

  const confirmFinished = (what) =>
    !isComplete || window.confirm(`This round is finished. ${what} may change the day's top 6. Continue?`)

  const save = (entry) => {
    if (isCorrection && !confirmFinished(`Changing hole ${activeHole}`)) return
    const error = scoring.recordHole(match.id, activeHole, entry, actor)
    setMessage(error ? { type: 'error', text: error } : isCorrection ? { type: 'info', text: `Hole ${activeHole} changed.` } : null)
    if (!error) setSelectedHole(null)
  }

  const undo = () => {
    const error = scoring.undoLastHole(match.id, actor)
    setMessage(error ? { type: 'error', text: error } : null)
  }

  const reset = () => {
    if (!window.confirm(`Clear every hole for this pairing? This cannot be undone.`)) return
    const error = scoring.resetMatch(match.id, actor)
    setMessage(error ? { type: 'error', text: error } : { type: 'info', text: 'Pairing reset.' })
    setSelectedHole(null)
  }

  const holes = match.holes.slice(0, pairing.holesPlayed).map(decodeHole)
  const holeNumbers = Array.from({ length: course.holes.length }, (_, i) => i + 1)
  const half = Math.ceil(course.holes.length / 2)

  const holeCell = (hole) => {
    const entry = holes[hole - 1]
    const show = (v) => (v === undefined ? '' : v === PICK_UP ? 'P' : v)
    return (
      <button
        key={hole}
        type="button"
        className={`hole-cell stroke-cell ${hole === activeHole ? 'is-active' : ''} ${entry ? 'is-played' : ''}`}
        disabled={!entry}
        aria-pressed={hole === selectedHole}
        aria-label={
          entry
            ? `Hole ${hole}: ${home.name} ${show(entry.HOME)}, ${challenger.name} ${show(entry.CHALLENGERS)}`
            : `Hole ${hole}: not played`
        }
        onClick={() => {
          setMessage(null)
          setSelectedHole(hole === selectedHole ? null : hole)
        }}
      >
        <span className="hole-number">{hole}</span>
        <span className="stroke-home">{show(entry?.HOME)}</span>
        <span className="stroke-challengers">{show(entry?.CHALLENGERS)}</span>
      </button>
    )
  }

  const summary = (side) => {
    const r = pairing.round[side]
    return format === 'STABLEFORD'
      ? `${r.points} pts · ${r.gross} gross`
      : `${formatRoundScore(format, r)} net · ${r.gross} gross`
  }

  return (
    <div className="scorecard">
      <button type="button" className="link-button back-link" onClick={onBack}>
        ← Back to leaderboard
      </button>

      <p className="scorecard-meta">
        Pairing {match.number} · Day {match.day} · {FORMATS[format].label}
      </p>

      <div className="scorecard-players">
        {SIDES.map((side, i) => [
          i === 1 && (
            <span key="v" className="scorecard-v">
              v
            </span>
          ),
          <span key={side} className={`scorecard-player is-${side.toLowerCase()}`}>
            <span className="scorecard-team">
              {teams[side].name} · hcp {formatHandicap(handicaps[side]) || '0'}
            </span>
            {players[side].name}
          </span>,
        ])}
      </div>

      <div className={`scorecard-status ${pairing.better ? `is-${pairing.better.toLowerCase()}` : ''}`}>
        <strong>
          {pairing.status === STATUS.NOT_STARTED
            ? 'Not started'
            : `${firstName(home)} ${formatRoundScore(format, pairing.round.HOME)} · ${firstName(challenger)} ${formatRoundScore(format, pairing.round.CHALLENGERS)}`}
        </strong>
        <span>
          {pairing.status === STATUS.NOT_STARTED
            ? 'Enter hole 1 to start'
            : isComplete
              ? 'Final · top 6 scores earn a cup point'
              : `Through ${pairing.holesPlayed}`}
        </span>
      </div>

      {message && (
        <p className={message.type === 'error' ? 'error-box' : 'info-box'} role="status">
          {message.text}
        </p>
      )}

      {!course.confirmed && (
        <p className="warning-box">
          The course card hasn't been confirmed by an admin yet, so par and stroke index may be placeholders.
        </p>
      )}

      {activeHole && (
        <HoleEntry
          key={`${activeHole}-${match.holes[activeHole - 1] ?? 'new'}`}
          hole={activeHole}
          course={course}
          players={players}
          handicaps={handicaps}
          saved={isCorrection ? match.holes[activeHole - 1] : null}
          format={format}
          isCorrection={isCorrection}
          onSave={save}
          onCancel={() => setSelectedHole(null)}
          onUndo={undo}
          canUndo={pairing.holesPlayed > 0}
          undoHole={pairing.holesPlayed}
        />
      )}

      {isComplete && !isCorrection && (
        <p className="settings-help">This round is finished. If a score is wrong, tap the hole below to correct it.</p>
      )}

      <section className="hole-grid-section" aria-label="Hole by hole">
        <div className="hole-grid-heading">
          <span>
            Hole by hole · <span className="stroke-home">{firstName(home)}</span> /{' '}
            <span className="stroke-challengers">{firstName(challenger)}</span>
          </span>
          {pairing.holesPlayed > 0 && <span>Tap a hole to change it</span>}
        </div>
        <div className="hole-grid">{holeNumbers.slice(0, half).map(holeCell)}</div>
        <div className="hole-grid">{holeNumbers.slice(half).map(holeCell)}</div>
        <div className="hole-totals">
          <span className="is-home">
            {firstName(home)}: {summary('HOME')}
          </span>
          <span className="is-challengers">
            {firstName(challenger)}: {summary('CHALLENGERS')}
          </span>
        </div>
      </section>

      {actor.isAdmin && pairing.holesPlayed > 0 && (
        <section className="settings-block settings-danger">
          <h3>Reset pairing</h3>
          <p className="settings-help">Clears every hole for this pairing. Admins only.</p>
          <button type="button" className="button button-danger" onClick={reset}>
            Reset pairing
          </button>
        </section>
      )}
    </div>
  )
}
