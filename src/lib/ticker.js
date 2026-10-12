// Ticker events, worked out from the hole results and the time each hole
// was recorded. Nothing is stored except the scores, so the ticker can't be
// faked and corrects itself if a hole is changed.
//
// Each event: { id, time, kind, team, text }
//   team: HOME / CHALLENGERS (for the colour accent) or null
// Returned newest first.

import { computeMatchState, STATUS } from './scoring.js'
import { formatPoints, getProjectedPoints, getTeamPoints } from './tournament.js'

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
  const home = playerName(match.homePlayerId)
  const challenger = playerName(match.challengerPlayerId)
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
            text: `${nameFor(state.winner)} wins ${state.result}: point to ${teams[state.winner].name} (${label})`,
          }
        : {
            id: `halved-${match.id}`,
            kind: 'match-halved',
            team: null,
            text: `${label} halved: ${home} and ${challenger} take half a point each`,
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
    const at = { time: step.time }
    const score = (p) =>
      `${teams.HOME.name} ${formatPoints(p.HOME)} – ${formatPoints(p.CHALLENGERS)} ${teams.CHALLENGERS.name}`

    // A match has just finished
    if (before.status !== STATUS.COMPLETE && after.status === STATUS.COMPLETE) {
      if (after.winner && after.winner === streakTeam) streak += 1
      else if (after.winner) {
        streakTeam = after.winner
        streak = 1
      } else {
        streakTeam = null
        streak = 0
      }
      if (streak >= MATCH_STREAK) {
        events.push({
          ...at,
          id: `match-streak-${step.matchId}`,
          kind: 'match-streak',
          team: streakTeam,
          text: `${teams[streakTeam].name} have won ${streak} matches in a row`,
        })
      }

      const newPoints = getTeamPoints(current, holesPerMatch)
      const newLeader = leaderOf(newPoints)
      if (newLeader !== leader) {
        events.push({
          ...at,
          id: `overall-${step.matchId}`,
          kind: 'overall-lead',
          team: newLeader,
          text: newLeader
            ? `${teams[newLeader].name} take the overall lead: ${score(newPoints)}`
            : `All level overall: ${score(newPoints)}`,
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
            text: `${teams[team].name} win the WGM Golf Cup! ${score(newPoints)}`,
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
        events.push({
          ...at,
          id: `day-${match.day}`,
          kind: 'day-complete',
          team: newLeader,
          text: `Day ${match.day} complete. Overall: ${score(newPoints)}`,
        })
      }

      leader = newLeader
    }

    // Projection swings: only when a team moves at least a point clear in the
    // projection (small flips back and forth aren't news).
    const projected = getProjectedPoints(current, holesPerMatch)
    const projectedText = `${formatPoints(projected.HOME)} – ${formatPoints(projected.CHALLENGERS)}`
    const projectedTop = leaderOf(projected)
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
    ...t.matches.flatMap((m) => matchEvents(t, m, playerName)),
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
