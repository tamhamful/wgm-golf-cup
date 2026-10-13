// Admin changes to the tournament.
// Each function takes the current tournament and returns an updated copy.
// If a change isn't allowed, it throws an Error with a plain-English message
// that the Admin screen shows to the user.

// A match has started once any hole has been recorded.
const isStarted = (match) => match.holes.length > 0
const playersInMatch = (m) => [m.homePlayerId, m.challengerPlayerId]

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
  const matches = t.matches.map((m) => ({
    ...m,
    homePlayerId: m.homePlayerId === playerId ? null : m.homePlayerId,
    challengerPlayerId: m.challengerPlayerId === playerId ? null : m.challengerPlayerId,
  }))
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

// Puts a player into one side of a match. If that player is already in another
// match on the same day, the two players swap places, so nobody can be in two
// matches on the same day.
export function setMatchPlayer(t, matchId, side, playerId) {
  const field = side === 'HOME' ? 'homePlayerId' : 'challengerPlayerId'
  const match = t.matches.find((m) => m.id === matchId)
  if (isStarted(match)) {
    throw new Error(`Match ${match.number} has started, so its players can't be changed.`)
  }

  const previous = match[field]
  let matches = t.matches

  if (playerId) {
    const player = findPlayer(t, playerId)
    if (player.teamId !== side) {
      throw new Error(`${player.name} is not on ${t.teams[side].name}.`)
    }
    const clash = t.matches.find(
      (m) => m.id !== matchId && m.day === match.day && m[field] === playerId,
    )
    if (clash) {
      if (isStarted(clash)) {
        throw new Error(
          `${player.name} is already playing in Match ${clash.number}, which has started.`,
        )
      }
      matches = matches.map((m) => (m.id === clash.id ? { ...m, [field]: previous } : m))
    }
  }

  matches = matches.map((m) => (m.id === matchId ? { ...m, [field]: playerId || null } : m))
  return { ...t, matches }
}

// ---------- Settings ----------

// The day everyone's leaderboard opens on.
export function setCurrentDay(t, day) {
  if (!t.days.includes(day)) throw new Error('That day is not part of the tournament.')
  return { ...t, currentDay: day }
}

export function setTargetPoints(t, value) {
  const target = Number(value)
  const maxPoints = t.matches.length
  if (!Number.isFinite(target) || target <= 0 || target > maxPoints || target * 2 !== Math.round(target * 2)) {
    throw new Error(`Points to win must be between 0.5 and ${maxPoints}, in steps of 0.5.`)
  }
  return { ...t, targetPoints: target }
}
