// Ticker events, worked out from the hole results and the time each hole
// was recorded. Nothing is stored except the scores, so the ticker can't be
// faked and corrects itself if a hole is changed.
//
// Each event: { id, time, kind, team, text }
//   team: HOME / CHALLENGERS (for the colour accent) or null
// Returned newest first.

import { computeMatchState, STATUS } from './scoring.js'
import { formatPoints, getProjectedPoints, getTeamPoints } from './tournament.js'
import { FORMATS, formatForDay, formatOf, isTeamTotalFormat, sidePlayerIds, TEAM_TOTAL_DAY_POINTS } from './formats.js'
import { dayCupPoints } from './strokeplay.js'

const HOLE_STREAK = 3 // holes in a row before it's news
const MATCH_STREAK = 3 // matches in a row before it's news
const NEED_POINTS_WITHIN = 2 // "X need 1.5 more points" once this close
const PROJECTION_GAP = 1 // a team must be projected this far ahead to be news

const ordinal = (n) => {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0])
}

const leaderOf = (points) =>
  points.HOME > points.CHALLENGERS ? 'HOME' : points.CHALLENGERS > points.HOME ? 'CHALLENGERS' : null

const timeValue = (time) => (time ? new Date(time).getTime() : 0)

// Events inside one match: lead changes, squares, streaks, dormie, result.
// At most one event per hole (the most important one).
function matchEvents(t, match, playerName) {
  const { holesPerMatch, teams } = t
  const times = match.holeTimes ?? []
  // One name, or both names of a pair ("Tom Hamilton & Iain Ross").
  const home = sidePlayerIds(match, 'HOME').map(playerName).join(' & ')
  const challenger = sidePlayerIds(match, 'CHALLENGERS').map(playerName).join(' & ')
  const nameFor = (side) => (side === 'HOME' ? home : challenger)
  const label = `Match ${match.number}`
  const played = computeMatchState(match.holes, holesPerMatch).holesPlayed

  const events = []
  let previous = computeMatchState([], holesPerMatch)
  let streakSide = null
  let streak = 0

  for (let hole = 1; hole <= played; hole++) {
    const result = match.holes[hole - 1]
    const state = computeMatchState(match.holes.slice(0, hole), holesPerMatch)
    const base = { time: times[hole - 1] ?? null, matchId: match.id }

    if (result === 'HALVED') {
      streakSide = null
      streak = 0
    } else if (result === streakSide) {
      streak += 1
    } else {
      streakSide = result
      streak = 1
    }

    let event = null
    if (state.status === STATUS.COMPLETE) {
      event = state.winner
        ? {
            id: `won-${match.id}`,
            kind: 'match-won',
            team: state.winner,
            text: `${nameFor(state.winner)} wins ${state.result} for ${teams[state.winner].name} (${label})`,
          }
        : {
            id: `halved-${match.id}`,
            kind: 'match-halved',
            team: null,
            text: `${home} v ${challenger} halved (${label})`,
          }
    } else if (state.dormie && !previous.dormie) {
      event = {
        id: `dormie-${match.id}-${hole}`,
        kind: 'dormie',
        team: state.leader,
        text: `Dormie: ${nameFor(state.leader)} ${state.margin} UP with ${state.holesRemaining} to play (${label})`,
      }
    } else if (streak >= HOLE_STREAK && streakSide) {
      event = {
        id: `hole-streak-${match.id}-${hole}`,
        kind: 'hole-streak',
        team: streakSide,
        text: `${nameFor(streakSide)} has won ${streak} holes in a row (${label})`,
      }
    } else if (previous.leader && !state.leader) {
      event = {
        id: `square-${match.id}-${hole}`,
        kind: 'squared',
        team: result,
        text: `${nameFor(result)} squares ${label} on the ${ordinal(hole)}`,
      }
    } else if (!previous.leader && state.leader && hole > 1) {
      event = {
        id: `lead-${match.id}-${hole}`,
        kind: 'takes-lead',
        team: state.leader,
        text: `${nameFor(state.leader)} takes the lead in ${label} on the ${ordinal(hole)}`,
      }
    } else if (hole === holesPerMatch - 1 && !state.leader) {
      event = {
        id: `to-last-${match.id}`,
        kind: 'all-square-last',
        team: null,
        text: `${label} goes down the ${ordinal(holesPerMatch)} all square`,
      }
    }

    if (event) events.push({ ...base, ...event })
    previous = state
  }
  return events
}

// Events across the whole competition, found by replaying every hole in the
// order it was recorded: team streaks, overall lead, points needed, the Cup,
// projection swings and day results.
function teamEvents(t) {
  const { matches, teams, holesPerMatch, targetPoints, days } = t
  const events = []

  const steps = matches
    .flatMap((m) => {
      const played = computeMatchState(m.holes, holesPerMatch).holesPlayed
      return Array.from({ length: played }, (_, i) => ({
        matchId: m.id,
        hole: i + 1,
        time: m.holeTimes?.[i] ?? null,
      }))
    })
    .sort((a, b) => timeValue(a.time) - timeValue(b.time) || a.hole - b.hole)

  const count = Object.fromEntries(matches.map((m) => [m.id, 0]))
  const snapshot = () => matches.map((m) => ({ ...m, holes: m.holes.slice(0, count[m.id]) }))
  const statusOf = (m) => computeMatchState(m.holes.slice(0, count[m.id]), holesPerMatch)

  let leader = null
  let projectedLeader = null
  let projectedWinner = null
  let streakTeam = null
  let streak = 0
  const need = { HOME: null, CHALLENGERS: null }
  let cupWon = false
  const daysDone = new Set()

  steps.forEach((step) => {
    const before = statusOf(matches.find((m) => m.id === step.matchId))
    count[step.matchId] = step.hole
    const after = statusOf(matches.find((m) => m.id === step.matchId))
    const current = snapshot()
    const cur = { ...t, matches: current }
    const stepMatch = matches.find((m) => m.id === step.matchId)
    const at = { time: step.time }
    // Short score with the named team's points first, e.g. "5 – 4".
    const score = (p, first = 'HOME') => {
      const second = first === 'HOME' ? 'CHALLENGERS' : 'HOME'
      return `${formatPoints(p[first])} – ${formatPoints(p[second])}`
    }

    // A match has just finished
    if (before.status !== STATUS.COMPLETE && after.status === STATUS.COMPLETE) {
      // Match streaks only count head-to-head match results; Stableford /
      // stroke play pairings don't win or lose on their own.
      if (formatOf(t, stepMatch).kind !== 'MATCH') {
        // no streak change
      } else if (after.winner && after.winner === streakTeam) streak += 1
      else if (after.winner) {
        streakTeam = after.winner
        streak = 1
      } else {
        streakTeam = null
        streak = 0
      }
      if (formatOf(t, stepMatch).kind === 'MATCH' && streak >= MATCH_STREAK) {
        events.push({
          ...at,
          id: `match-streak-${step.matchId}`,
          kind: 'match-streak',
          team: streakTeam,
          text: `${teams[streakTeam].name} have won ${streak} matches in a row`,
        })
      }

      const newPoints = getTeamPoints(cur)
      const newLeader = leaderOf(newPoints)
      if (newLeader !== leader) {
        events.push({
          ...at,
          id: `overall-${step.matchId}`,
          kind: 'overall-lead',
          team: newLeader,
          text: newLeader
            ? `${teams[newLeader].name} take the overall lead, ${score(newPoints, newLeader)}`
            : `All level overall at ${score(newPoints)}`,
        })
      }

      for (const team of ['HOME', 'CHALLENGERS']) {
        const stillNeeded = targetPoints - newPoints[team]
        if (!cupWon && stillNeeded <= 0) {
          cupWon = true
          events.push({
            ...at,
            id: 'cup-won',
            kind: 'cup-won',
            team,
            text: `${teams[team].name} win the WGM Golf Cup! ${score(newPoints, team)}`,
          })
        } else if (!cupWon && stillNeeded > 0 && stillNeeded <= NEED_POINTS_WITHIN && stillNeeded !== need[team]) {
          events.push({
            ...at,
            id: `need-${team}-${stillNeeded}`,
            kind: 'points-needed',
            team,
            text: `${teams[team].name} need ${formatPoints(stillNeeded)} more point${stillNeeded === 1 ? '' : 's'} to win the Cup`,
          })
        }
        need[team] = stillNeeded
      }

      const match = matches.find((m) => m.id === step.matchId)
      const dayMatches = current.filter((m) => m.day === match.day)
      const dayComplete = dayMatches.every(
        (m) => computeMatchState(m.holes, holesPerMatch).status === STATUS.COMPLETE,
      )
      if (dayComplete && !daysDone.has(match.day) && days.includes(match.day)) {
        daysDone.add(match.day)
        // Stableford / stroke play day: how the top-6 cup points split.
        const format = formatForDay(t, match.day)
        if (isTeamTotalFormat(format)) {
          const day = dayCupPoints(cur, match.day)
          const label = `Day ${match.day} ${FORMATS[format].short}`
          const top = leaderOf(day.points)
          events.push({
            ...at,
            id: `day-result-${match.day}`,
            kind: 'day-result',
            team: top,
            text: top
              ? `${teams[top].name} take ${formatPoints(day.points[top])} of the ${TEAM_TOTAL_DAY_POINTS} points on the ${label} (${score(day.points, top)})`
              : `${label} points shared ${score(day.points)}`,
          })
        }
        events.push({
          ...at,
          id: `day-${match.day}`,
          kind: 'day-complete',
          team: newLeader,
          text: newLeader
            ? `Day ${match.day} complete: ${teams[newLeader].name} lead ${score(newPoints, newLeader)}`
            : `Day ${match.day} complete: all square at ${score(newPoints)}`,
        })
      }

      leader = newLeader
    }

    // Projection swings: only when a team moves at least a point clear in the
    // projection (small flips back and forth aren't news).
    const projected = getProjectedPoints(cur)
    const projectedTop = leaderOf(projected)
    const projectedText = score(projected, projectedTop ?? 'HOME')
    const projectedGap = Math.abs(projected.HOME - projected.CHALLENGERS)
    if (projectedTop && projectedGap >= PROJECTION_GAP && projectedTop !== projectedLeader) {
      projectedLeader = projectedTop
      events.push({
        ...at,
        id: `projection-${step.matchId}-${step.hole}`,
        kind: 'projection',
        team: projectedTop,
        text: `Projected score swings to ${teams[projectedTop].name}: ${projectedText}`,
      })
    }
    // First time a team is projected to reach the winning total
    if (!cupWon && projectedTop && projected[projectedTop] >= targetPoints && projectedWinner !== projectedTop) {
      projectedWinner = projectedTop
      events.push({
        ...at,
        id: `projected-win-${step.matchId}-${step.hole}`,
        kind: 'projected-win',
        team: projectedTop,
        text: `${teams[projectedTop].name} now projected to win the Cup: ${projectedText}`,
      })
    }
  })

  return events
}

export function buildTickerEvents(t, notices = []) {
  const names = Object.fromEntries(t.players.map((p) => [p.id, p.name]))
  const playerName = (id) => names[id] ?? 'TBC'

  const events = [
    // Hole-by-hole match news only applies to match formats.
    ...t.matches.filter((m) => formatOf(t, m).kind === 'MATCH').flatMap((m) => matchEvents(t, m, playerName)),
    ...teamEvents(t),
    ...notices.map((n) => ({
      id: `notice-${n.id}`,
      time: n.created_at,
      kind: 'notice',
      team: null,
      text: n.message,
    })),
  ]

  return events.sort((a, b) => timeValue(b.time) - timeValue(a.time))
}
