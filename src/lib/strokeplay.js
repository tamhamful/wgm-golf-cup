// Stableford and stroke play scoring (gross scores, full handicap).
//
// Each hole of a pairing is stored as "HOME:CHALLENGERS" gross scores,
// e.g. "5:4". "P" means the player picked up (no score):
//   Stableford  – 0 points on that hole.
//   Stroke play – counts as net double bogey (the most a hole can count).
// Scores above net double bogey are also capped at it in stroke play.

import { STATUS } from './scoring.js'
import { courseOf, formatForDay } from './formats.js'

export const PICK_UP = 'P'

export const encodeHole = (homeGross, challengerGross) => `${homeGross}:${challengerGross}`

export function decodeHole(entry) {
  const [home, challenger] = String(entry).split(':')
  const read = (v) => (v === PICK_UP ? PICK_UP : Number(v))
  return { HOME: read(home), CHALLENGERS: read(challenger) }
}

export const isValidGross = (v) => v === PICK_UP || (Number.isInteger(v) && v >= 1 && v <= 20)

// Shots a player receives on a hole with this stroke index (1 = hardest).
// A plus handicap (stored as a negative number) gives shots back on the
// easiest holes.
export function shotsOnHole(handicap, strokeIndex, holes = 18) {
  const h = Math.round(handicap ?? 0)
  if (h >= 0) return Math.floor(h / holes) + (strokeIndex <= h % holes ? 1 : 0)
  return strokeIndex > holes + h ? -1 : 0
}

export function stablefordPoints(gross, par, shots) {
  if (gross === PICK_UP) return 0
  return Math.max(0, 2 + par + shots - gross)
}

// The most a hole can count in stroke play: net double bogey.
export const netDoubleBogey = (par, shots) => par + 2 + shots

// One player's round so far.
export function scoreRound(grossByHole, handicap, course) {
  let points = 0
  let netToPar = 0
  let gross = 0
  grossByHole.forEach((g, i) => {
    const { par, si } = course.holes[i]
    const shots = shotsOnHole(handicap, si, course.holes.length)
    points += stablefordPoints(g, par, shots)
    const counted = g === PICK_UP ? netDoubleBogey(par, shots) : Math.min(g, netDoubleBogey(par, shots))
    gross += counted
    netToPar += counted - shots - par
  })
  return { holesPlayed: grossByHole.length, points, netToPar, gross }
}

// A Stableford / stroke play pairing: both players' rounds and who is
// doing better (more points, or fewer strokes to par).
export function computePairing(t, match) {
  const format = formatForDay(t, match.day)
  const course = courseOf(t)
  const holes = match.holes.slice(0, course.holes.length).map(decodeHole)
  const handicapOf = (id) => t.players.find((p) => p.id === id)?.handicap ?? 0

  const round = {
    HOME: scoreRound(holes.map((h) => h.HOME), handicapOf(match.homePlayerId), course),
    CHALLENGERS: scoreRound(holes.map((h) => h.CHALLENGERS), handicapOf(match.challengerPlayerId), course),
  }

  const played = holes.length
  let status = STATUS.LIVE
  if (played === 0) status = STATUS.NOT_STARTED
  else if (played >= course.holes.length) status = STATUS.COMPLETE

  // Positive = Home doing better.
  const edge =
    format === 'STABLEFORD'
      ? round.HOME.points - round.CHALLENGERS.points
      : round.CHALLENGERS.netToPar - round.HOME.netToPar
  const better = played === 0 || edge === 0 ? null : edge > 0 ? 'HOME' : 'CHALLENGERS'

  return { format, status, holesPlayed: played, round, better }
}

// How a player's score reads: "18 pts", or net to par "+3" / "E" / "−2".
export function formatRoundScore(format, round) {
  if (format === 'STABLEFORD') return `${round.points} pts`
  if (round.netToPar === 0) return 'E'
  return round.netToPar > 0 ? `+${round.netToPar}` : `−${Math.abs(round.netToPar)}`
}

export const formatTeamTotal = (format, value) =>
  format === 'STABLEFORD'
    ? `${value} pts`
    : value === 0
      ? 'E'
      : value > 0
        ? `+${value}`
        : `−${Math.abs(value)}`

// Team totals for a Stableford / stroke play day.
//   totals: Stableford points (higher is better) or net to par (lower).
//   leader: team doing better, or null if level / not started.
//   complete: every pairing has finished.
export function dayTeamTotals(t, day) {
  const format = formatForDay(t, day)
  const pairings = t.matches.filter((m) => m.day === day).map((m) => computePairing(t, m))
  const totals = { HOME: 0, CHALLENGERS: 0 }
  for (const p of pairings) {
    for (const side of ['HOME', 'CHALLENGERS']) {
      totals[side] += format === 'STABLEFORD' ? p.round[side].points : p.round[side].netToPar
    }
  }
  const started = pairings.some((p) => p.status !== STATUS.NOT_STARTED)
  const complete = pairings.length > 0 && pairings.every((p) => p.status === STATUS.COMPLETE)
  const edge = format === 'STABLEFORD' ? totals.HOME - totals.CHALLENGERS : totals.CHALLENGERS - totals.HOME
  const leader = !started || edge === 0 ? null : edge > 0 ? 'HOME' : 'CHALLENGERS'
  return { format, totals, leader, started, complete, pairings }
}
