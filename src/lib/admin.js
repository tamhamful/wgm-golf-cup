// Admin changes to the tournament.
// Each function takes the current tournament and returns an updated copy.
// If a change isn't allowed, it throws an Error with a plain-English message
// that the Admin screen shows to the user.

import {
  courseOf,
  FORMATS,
  formatForDay,
  GROUPS_PER_DAY,
  isPairsFormat,
  matchesPerDay,
  totalPointsAvailable,
} from './formats.js'

// A match has started once any hole has been recorded.
const isStarted = (match) => match.holes.length > 0

// The player slots in a match. Partners are only used in pairs formats.
const SLOTS = ['homePlayerId', 'homePartnerId', 'challengerPlayerId', 'challengerPartnerId']
const slotSide = (slot) => (slot.startsWith('home') ? 'HOME' : 'CHALLENGERS')
const playersInMatch = (m) => SLOTS.map((slot) => m[slot]).filter(Boolean)

function findPlayer(t, playerId) {
  const player = t.players.find((p) => p.id === playerId)
  if (!player) throw new Error('That player no longer exists.')
  return player
}

// Takes a player out of every match that hasn't started. Refuses if they are
// in a match that has started, so live scores are never disturbed.
function unassignPlayer(t, playerId, actionText) {
  const player = findPlayer(t, playerId)
  const started = t.matches.find((m) => isStarted(m) && playersInMatch(m).includes(playerId))
  if (started) {
    throw new Error(
      `Can't ${actionText} ${player.name}: they are in Match ${started.number}, which has already started.`,
    )
  }
  const matches = t.matches.map((m) => {
    const copy = { ...m }
    for (const slot of SLOTS) if (copy[slot] === playerId) copy[slot] = null
    return copy
  })
  return clearTeamRoles({ ...t, matches }, playerId)
}

// A player leaving a team also stops being its captain or vice-captain.
function clearTeamRoles(t, playerId) {
  const teams = Object.fromEntries(
    Object.entries(t.teams).map(([id, team]) => [
      id,
      {
        ...team,
        captainId: team.captainId === playerId ? null : (team.captainId ?? null),
        viceCaptainId: team.viceCaptainId === playerId ? null : (team.viceCaptainId ?? null),
      },
    ]),
  )
  return { ...t, teams }
}

function cleanName(name) {
  const trimmed = name.trim().replace(/\s+/g, ' ')
  if (!trimmed) throw new Error('Name cannot be blank.')
  return trimmed
}

// ---------- Teams ----------

export function renameTeam(t, teamId, name) {
  return { ...t, teams: { ...t.teams, [teamId]: { ...t.teams[teamId], name: cleanName(name) } } }
}

export const TEAM_ROLES = {
  captainId: { label: 'Captain', short: 'C' },
  viceCaptainId: { label: 'Vice-captain', short: 'VC' },
}

// Sets a team's captain or vice-captain (role: 'captainId' or 'viceCaptainId').
// playerId null clears the role.
export function setTeamRole(t, teamId, role, playerId) {
  if (!TEAM_ROLES[role]) throw new Error('Unknown team role.')
  const team = t.teams[teamId]
  const otherRole = role === 'captainId' ? 'viceCaptainId' : 'captainId'

  if (playerId) {
    const player = findPlayer(t, playerId)
    if (player.teamId !== teamId) throw new Error(`${player.name} is not on ${team.name}.`)
    if (team[otherRole] === playerId) {
      throw new Error(
        `${player.name} is already the ${TEAM_ROLES[otherRole].label.toLowerCase()}. Choose someone else, or change that first.`,
      )
    }
  }
  return { ...t, teams: { ...t.teams, [teamId]: { ...team, [role]: playerId || null } } }
}

// ---------- Players ----------

// teamId can be null: the player exists but hasn't been picked for a team yet.
export function addPlayer(t, name, teamId = null) {
  const clean = cleanName(name)
  if (t.players.some((p) => p.name.toLowerCase() === clean.toLowerCase())) {
    throw new Error(`There is already a player called ${clean}.`)
  }
  const id = `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  return { ...t, players: [...t.players, { id, name: clean, teamId }] }
}

export function renamePlayer(t, playerId, name) {
  const clean = cleanName(name)
  findPlayer(t, playerId)
  if (t.players.some((p) => p.id !== playerId && p.name.toLowerCase() === clean.toLowerCase())) {
    throw new Error(`There is already a player called ${clean}.`)
  }
  return { ...t, players: t.players.map((p) => (p.id === playerId ? { ...p, name: clean } : p)) }
}

// Moves a player to a team, or to Unassigned when teamId is null.
// They are taken out of any pairings that haven't started.
export function movePlayer(t, playerId, teamId) {
  const player = findPlayer(t, playerId)
  if (player.teamId === teamId) return t
  const next = unassignPlayer(t, playerId, 'move')
  return {
    ...next,
    players: next.players.map((p) => (p.id === playerId ? { ...p, teamId } : p)),
  }
}

export function removePlayer(t, playerId) {
  const next = unassignPlayer(t, playerId, 'remove')
  return { ...next, players: next.players.filter((p) => p.id !== playerId) }
}

// ---------- Pairings ----------

// Puts a player into a slot of a match: 'homePlayerId', 'homePartnerId',
// 'challengerPlayerId' or 'challengerPartnerId' ('HOME' / 'CHALLENGERS' mean
// the main slot). If the player is already somewhere else that day (another
// match, or the other slot of this pair), the two players swap places, so
// nobody can play twice on the same day.
export function setMatchPlayer(t, matchId, slotOrSide, playerId) {
  const slot =
    slotOrSide === 'HOME' ? 'homePlayerId' : slotOrSide === 'CHALLENGERS' ? 'challengerPlayerId' : slotOrSide
  if (!SLOTS.includes(slot)) throw new Error('Unknown player slot.')
  const side = slotSide(slot)
  const match = t.matches.find((m) => m.id === matchId)
  if (isStarted(match)) {
    throw new Error(`Match ${match.number} has started, so its players can't be changed.`)
  }

  const previous = match[slot] ?? null
  let matches = t.matches

  if (playerId) {
    const player = findPlayer(t, playerId)
    if (player.teamId !== side) {
      throw new Error(`${player.name} is not on ${t.teams[side].name}.`)
    }
    const sameSideSlots = SLOTS.filter((s) => slotSide(s) === side)
    let clash = null
    for (const m of t.matches.filter((x) => x.day === match.day)) {
      for (const s of sameSideSlots) {
        if (m[s] === playerId && !(m.id === matchId && s === slot)) clash = { match: m, slot: s }
      }
    }
    if (clash) {
      if (clash.match.id !== matchId && isStarted(clash.match)) {
        throw new Error(
          `${player.name} is already playing in Match ${clash.match.number}, which has started.`,
        )
      }
      matches = matches.map((m) => (m.id === clash.match.id ? { ...m, [clash.slot]: previous } : m))
    }
  }

  matches = matches.map((m) => (m.id === matchId ? { ...m, [slot]: playerId || null } : m))
  return { ...t, matches }
}

// ---------- Formats ----------

// Changes a day's format. Only allowed before any scores are entered that
// day. The day's matches are rebuilt for the new format (6 one-against-one
// pairings, or 3 pairs matches), keeping the same players in the same order
// where possible, and the groups of four are rebuilt to match.
export function setDayFormat(t, day, format) {
  if (!FORMATS[format]) throw new Error('Unknown format.')
  if (!t.days.includes(day)) throw new Error('That day is not part of the tournament.')
  if (formatForDay(t, day) === format) return t

  const dayMatches = t.matches.filter((m) => m.day === day).sort((a, b) => a.number - b.number)
  if (dayMatches.some(isStarted)) {
    throw new Error(
      `Day ${day} already has scores, so its format can't be changed. Reset those matches first.`,
    )
  }

  const homes = dayMatches.flatMap((m) => [m.homePlayerId, m.homePartnerId]).filter(Boolean)
  const challengers = dayMatches.flatMap((m) => [m.challengerPlayerId, m.challengerPartnerId]).filter(Boolean)
  const count = matchesPerDay(format)
  const pairs = isPairsFormat(format)
  const perGroup = count / GROUPS_PER_DAY

  const newMatches = Array.from({ length: count }, (_, i) => {
    const pick = (list, n) => list[n] ?? null
    const match = {
      id: `d${day}m${i + 1}${pairs ? 'p' : ''}`,
      day,
      groupId: `d${day}g${Math.floor(i / perGroup) + 1}`,
      homePlayerId: pick(homes, pairs ? i * 2 : i),
      challengerPlayerId: pick(challengers, pairs ? i * 2 : i),
      holes: [],
      holeTimes: [],
    }
    if (pairs) {
      match.homePartnerId = pick(homes, i * 2 + 1)
      match.challengerPartnerId = pick(challengers, i * 2 + 1)
    }
    return match
  })

  // Renumber every match in day order, so numbers stay 1, 2, 3...
  const matches = [...t.matches.filter((m) => m.day !== day), ...newMatches]
    .sort((a, b) => a.day - b.day || (a.number ?? 99) - (b.number ?? 99) || a.id.localeCompare(b.id))
    .map((m, i) => ({ ...m, number: i + 1 }))

  return { ...t, dayFormats: { ...t.dayFormats, [day]: format }, matches }
}

// ---------- Handicaps and course ----------

// Handicap as a whole number. A plus handicap is entered as "+2" (stored -2).
export function setPlayerHandicap(t, playerId, value) {
  findPlayer(t, playerId)
  const text = String(value ?? '').trim()
  let handicap = null
  if (text !== '') {
    const number = Number(text.replace(/^\+/, '-'))
    if (!Number.isInteger(number) || number < -10 || number > 54) {
      throw new Error('Handicap must be a whole number from +10 to 54 (e.g. 14, or +2 for a plus handicap).')
    }
    handicap = number
  }
  return { ...t, players: t.players.map((p) => (p.id === playerId ? { ...p, handicap } : p)) }
}

// Shows a handicap the way golfers write it: 14, or +2.
export const formatHandicap = (h) => (h === null || h === undefined ? '' : h < 0 ? `+${-h}` : String(h))

// Sets par and/or stroke index for one hole (1-18).
export function setCourseHole(t, holeNumber, changes) {
  const course = courseOf(t)
  const hole = course.holes[holeNumber - 1]
  if (!hole) throw new Error('That hole number is not valid.')
  const next = { ...hole, ...changes }
  if (![3, 4, 5, 6].includes(Number(next.par))) throw new Error('Par must be 3, 4, 5 or 6.')
  const si = Number(next.si)
  if (!Number.isInteger(si) || si < 1 || si > course.holes.length) {
    throw new Error(`Stroke index must be a whole number from 1 to ${course.holes.length}.`)
  }
  const holes = course.holes.map((h, i) => (i === holeNumber - 1 ? { par: Number(next.par), si } : h))
  return { ...t, course: { ...course, holes } }
}

export function setCourseName(t, name) {
  return { ...t, course: { ...courseOf(t), name: String(name ?? '').trim() } }
}

// Problems with the course card (each stroke index 1-18 used exactly once).
export function courseProblems(t) {
  const holes = courseOf(t).holes
  const seen = holes.map((h) => h.si)
  const missing = holes.map((_, i) => i + 1).filter((n) => !seen.includes(n))
  return missing.length
    ? [`Each stroke index from 1 to ${holes.length} must be used once. Missing: ${missing.join(', ')}.`]
    : []
}

export function confirmCourse(t) {
  const problems = courseProblems(t)
  if (problems.length) throw new Error(problems[0])
  return { ...t, course: { ...courseOf(t), confirmed: true } }
}

// ---------- Settings ----------

// The day everyone's leaderboard opens on.
export function setCurrentDay(t, day) {
  if (!t.days.includes(day)) throw new Error('That day is not part of the tournament.')
  return { ...t, currentDay: day }
}

export function setTargetPoints(t, value) {
  const target = Number(value)
  const maxPoints = totalPointsAvailable(t)
  if (!Number.isFinite(target) || target <= 0 || target > maxPoints || target * 2 !== Math.round(target * 2)) {
    throw new Error(`Points to win must be between 0.5 and ${maxPoints}, in steps of 0.5.`)
  }
  return { ...t, targetPoints: target }
}
