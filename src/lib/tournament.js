// Tournament calculations. Screens read from here rather than working out
// positions or points themselves, so there is one source of truth.
// Match positions come from the scoring engine (scoring.js), which works
// them out from the hole-by-hole results.

import { computeMatchState, getMatchStatus, STATUS } from './scoring.js'

export { STATUS }

// Shown in place of a player who hasn't been chosen for a match yet.
export const UNASSIGNED_PLAYER = { id: null, name: 'TBC' }

export const STATUS_LABEL = {
  NOT_STARTED: 'Not started',
  LIVE: 'Live',
  COMPLETE: 'Complete',
}

// Turns a match's state into what the screens display.
//   side: which team to highlight (HOME, CHALLENGERS or null)
//   position: e.g. "1 UP", "ALL SQUARE", "2&1", "HALVED" (null if not started)
//   detail: e.g. "14 HOLES", "FINAL", "NOT STARTED"
//   holesPlayed: number of holes completed
//   points: { HOME, CHALLENGERS } for completed matches, otherwise null
export function describeMatch(match, holesPerMatch = 18) {
  const state = computeMatchState(match.holes, holesPerMatch)

  if (state.status === STATUS.LIVE) {
    const holes = state.holesPlayed
    return {
      status: STATUS.LIVE,
      side: state.margin > 0 ? state.leader : null,
      position: state.margin > 0 ? `${state.margin} UP` : 'ALL SQUARE',
      detail: `${holes} ${holes === 1 ? 'HOLE' : 'HOLES'}`,
      holesPlayed: holes,
      points: null,
    }
  }

  if (state.status === STATUS.COMPLETE) {
    return {
      status: STATUS.COMPLETE,
      side: state.winner,
      position: state.result,
      detail: 'FINAL',
      holesPlayed: state.holesPlayed,
      points: {
        HOME: state.winner === 'HOME' ? 1 : state.winner ? 0 : 0.5,
        CHALLENGERS: state.winner === 'CHALLENGERS' ? 1 : state.winner ? 0 : 0.5,
      },
    }
  }

  return {
    status: STATUS.NOT_STARTED,
    side: null,
    position: null,
    detail: 'NOT STARTED',
    holesPlayed: 0,
    points: null,
  }
}

// Points only come from completed matches.
export function getTeamPoints(matches, holesPerMatch) {
  const totals = { HOME: 0, CHALLENGERS: 0 }
  for (const match of matches) {
    const { points } = describeMatch(match, holesPerMatch)
    if (points) {
      totals.HOME += points.HOME
      totals.CHALLENGERS += points.CHALLENGERS
    }
  }
  return totals
}

// Projected points: completed matches as they finished, plus live matches
// as they currently stand (leader gets 1, all square gets 0.5 each).
// Unstarted matches add nothing. This is an indication only, never awarded.
export function getProjectedPoints(matches, holesPerMatch) {
  const totals = getTeamPoints(matches, holesPerMatch)
  for (const match of matches) {
    const view = describeMatch(match, holesPerMatch)
    if (view.status !== STATUS.LIVE) continue
    if (view.side) {
      totals[view.side] += 1
    } else {
      totals.HOME += 0.5
      totals.CHALLENGERS += 0.5
    }
  }
  return totals
}

// Header label, based on the day the admin has set as the current day.
export function getTournamentStatus(matches, days, holesPerMatch, currentDay) {
  const dayStatus = (day) => {
    const statuses = matches.filter((m) => m.day === day).map((m) => getMatchStatus(m, holesPerMatch))
    if (statuses.every((s) => s === STATUS.COMPLETE)) return 'complete'
    if (statuses.every((s) => s === STATUS.NOT_STARTED)) return 'not-started'
    return 'in-progress'
  }

  if (days.every((day) => dayStatus(day) === 'complete')) return { label: 'Tournament complete' }

  const status = dayStatus(currentDay)
  if (status === 'complete') return { label: `Day ${currentDay} complete` }
  if (status === 'in-progress') return { label: `Day ${currentDay} in progress` }
  return { label: currentDay === days[0] ? 'Not started' : `Day ${currentDay} not started` }
}

export function formatPoints(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}
