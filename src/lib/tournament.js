// Tournament calculations. Screens read from here rather than working out
// positions or points themselves, so there is one source of truth.

export const STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  LIVE: 'LIVE',
  COMPLETE: 'COMPLETE',
}

export const STATUS_LABEL = {
  NOT_STARTED: 'Not started',
  LIVE: 'Live',
  COMPLETE: 'Complete',
}

// Turns a match's state into what the screens display.
//   side: which team to highlight (HOME, CHALLENGERS or null)
//   position: e.g. "1 UP", "ALL SQUARE", "2&1", "HALVED" (null if not started)
//   detail: e.g. "14 HOLES", "FINAL", "NOT STARTED"
//   points: { HOME, CHALLENGERS } for completed matches, otherwise null
export function describeMatch(match, holesPerMatch = 18) {
  const { state } = match

  if (state.status === STATUS.LIVE) {
    const holes = state.holesPlayed
    return {
      status: STATUS.LIVE,
      side: state.margin > 0 ? state.leader : null,
      position: state.margin > 0 ? `${state.margin} UP` : 'ALL SQUARE',
      detail: `${holes} ${holes === 1 ? 'HOLE' : 'HOLES'}`,
      points: null,
    }
  }

  if (state.status === STATUS.COMPLETE) {
    const remaining = holesPerMatch - state.holesPlayed
    let position = 'HALVED'
    if (state.winner) {
      position = remaining > 0 ? `${state.margin}&${remaining}` : `${state.margin} UP`
    }
    return {
      status: STATUS.COMPLETE,
      side: state.winner ?? null,
      position,
      detail: 'FINAL',
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

export function getTournamentStatus(matches, days) {
  const dayStatus = (day) => {
    const dayMatches = matches.filter((m) => m.day === day)
    if (dayMatches.every((m) => m.state.status === STATUS.COMPLETE)) return 'complete'
    if (dayMatches.every((m) => m.state.status === STATUS.NOT_STARTED)) return 'not-started'
    return 'in-progress'
  }

  const statuses = days.map(dayStatus)
  if (statuses.every((s) => s === 'complete')) {
    return { label: 'Tournament complete', currentDay: days[days.length - 1] }
  }

  const inProgress = days.find((_, i) => statuses[i] === 'in-progress')
  if (inProgress) return { label: `Day ${inProgress} in progress`, currentDay: inProgress }

  const nextDay = days.find((_, i) => statuses[i] === 'not-started')
  const lastComplete = [...days].reverse().find((_, i) => statuses[days.length - 1 - i] === 'complete')
  if (lastComplete) return { label: `Day ${lastComplete} complete`, currentDay: nextDay }
  return { label: 'Not started', currentDay: days[0] }
}

export function formatPoints(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}
