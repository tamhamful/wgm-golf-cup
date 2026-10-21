// Competition formats. Each day of the tournament has one format, chosen by
// an admin (stored in tournament.dayFormats, e.g. { 1: 'FOURBALL' }).
//
//   MATCH formats  – a point per match, decided hole by hole (who won it).
//   TEAM_TOTAL     – gross scores entered per player; the better team total
//                    for the day wins the day's points (shared if tied).

export const FORMATS = {
  SINGLES: { label: 'Singles match play', short: 'Singles', kind: 'MATCH', perSide: 1 },
  FOURBALL: { label: 'Fourballs', short: 'Fourballs', kind: 'MATCH', perSide: 2 },
  FOURSOMES: { label: 'Foursomes', short: 'Foursomes', kind: 'MATCH', perSide: 2 },
  STABLEFORD: { label: 'Stableford', short: 'Stableford', kind: 'TEAM_TOTAL', perSide: 1 },
  STROKE: { label: 'Stroke play', short: 'Stroke play', kind: 'TEAM_TOTAL', perSide: 1 },
}

export const FORMAT_IDS = Object.keys(FORMATS)

export const PLAYERS_PER_TEAM = 6
export const GROUPS_PER_DAY = 3
// Points a team-total day (Stableford / Stroke play) is worth.
export const TEAM_TOTAL_DAY_POINTS = 6

export function formatForDay(t, day) {
  return t.dayFormats?.[day] ?? 'SINGLES'
}

export const formatOf = (t, match) => FORMATS[formatForDay(t, match.day)]

export const isPairsFormat = (format) => FORMATS[format].perSide === 2
export const isTeamTotalFormat = (format) => FORMATS[format].kind === 'TEAM_TOTAL'

// Matches in a day: 6 singles-style pairings, or 3 pairs matches.
export const matchesPerDay = (format) => PLAYERS_PER_TEAM / FORMATS[format].perSide

// Points available on a day.
export function dayPoints(t, day) {
  const format = formatForDay(t, day)
  if (isTeamTotalFormat(format)) return TEAM_TOTAL_DAY_POINTS
  return t.matches.filter((m) => m.day === day).length
}

export const totalPointsAvailable = (t) => t.days.reduce((sum, day) => sum + dayPoints(t, day), 0)

// All the players on one side of a match (one, or two in pairs formats).
export const sidePlayerIds = (match, side) =>
  side === 'HOME'
    ? [match.homePlayerId, match.homePartnerId].filter((id) => id !== undefined)
    : [match.challengerPlayerId, match.challengerPartnerId].filter((id) => id !== undefined)

// Every player slot a match needs filled for its format.
export function requiredSlots(t, match) {
  return isPairsFormat(formatForDay(t, match.day))
    ? ['homePlayerId', 'homePartnerId', 'challengerPlayerId', 'challengerPartnerId']
    : ['homePlayerId', 'challengerPlayerId']
}

export const matchIsReady = (t, match) => requiredSlots(t, match).every((slot) => match[slot])

// ---------- Course card ----------

// Placeholder par-72 card until an admin enters the real course.
export const DEFAULT_COURSE = {
  name: '',
  confirmed: false,
  holes: [
    [4, 7], [4, 15], [3, 13], [5, 3], [4, 9], [4, 1], [3, 17], [4, 11], [5, 5],
    [4, 8], [3, 16], [4, 2], [5, 10], [4, 4], [4, 12], [3, 18], [5, 6], [4, 14],
  ].map(([par, si]) => ({ par, si })),
}

export const courseOf = (t) => t.course ?? DEFAULT_COURSE
