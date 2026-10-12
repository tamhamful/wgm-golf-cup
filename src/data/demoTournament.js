// DEMONSTRATION DATA ONLY.
// These teams, players and match states are sample values used to show the
// design. They are not connected to a live tournament.
//
// Teams are identified by stable IDs (HOME / CHALLENGERS). The display names
// can change without affecting scoring.
//
// Each match stores only its hole-by-hole results. Positions such as "1 UP"
// and "2&1" are calculated from these by the scoring engine (lib/scoring.js).

const players = [
  { id: 'h1', name: 'Tom Hamilton', teamId: 'HOME' },
  { id: 'h2', name: 'Ian Ross', teamId: 'HOME' },
  { id: 'h3', name: 'David Kelly', teamId: 'HOME' },
  { id: 'h4', name: 'James Wilson', teamId: 'HOME' },
  { id: 'h5', name: 'David Campbell', teamId: 'HOME' },
  { id: 'h6', name: 'Mark Stewart', teamId: 'HOME' },
  { id: 'c1', name: 'Greig Dyer', teamId: 'CHALLENGERS' },
  { id: 'c2', name: 'Ian Mathieson', teamId: 'CHALLENGERS' },
  { id: 'c3', name: 'Bobby Brown', teamId: 'CHALLENGERS' },
  { id: 'c4', name: 'Steven Clark', teamId: 'CHALLENGERS' },
  { id: 'c5', name: 'Gordon Reid', teamId: 'CHALLENGERS' },
  { id: 'c6', name: 'Alan Murray', teamId: 'CHALLENGERS' },
]

// [day, home player, challengers player, hole results]
// Hole results shorthand: H = Home player won, C = Challenger won, = = halved
const NS = ''
const fixtures = [
  [1, 'h1', 'c1', 'HC=H==CH=HC==='],    // Home 1 UP through 14
  [1, 'h2', 'c2', 'C=HC=C=HC==='],      // Challengers 2 UP through 12
  [1, 'h3', 'c3', 'H=CH=H=C=H=C==H=='], // Home wins 2&1
  [1, 'h4', 'c4', 'HC==CH=='],          // All square through 8
  [1, 'h5', 'c5', NS],
  [1, 'h6', 'c6', NS],
  // Day 2 and Day 3: sample pairings, not yet played
  [2, 'h1', 'c2', NS], [2, 'h2', 'c3', NS], [2, 'h3', 'c4', NS],
  [2, 'h4', 'c5', NS], [2, 'h5', 'c6', NS], [2, 'h6', 'c1', NS],
  [3, 'h1', 'c3', NS], [3, 'h2', 'c4', NS], [3, 'h3', 'c5', NS],
  [3, 'h4', 'c6', NS], [3, 'h5', 'c1', NS], [3, 'h6', 'c2', NS],
]

const MATCHES_PER_DAY = 6
const MATCHES_PER_GROUP = 2

const HOLE_CODES = { H: 'HOME', C: 'CHALLENGERS', '=': 'HALVED' }

const matches = fixtures.map(([day, homePlayerId, challengerPlayerId, holeCodes], index) => {
  const numberInDay = (index % MATCHES_PER_DAY) + 1
  const groupNumber = Math.ceil(numberInDay / MATCHES_PER_GROUP)
  return {
    id: `m${index + 1}`,
    number: index + 1,
    day,
    groupId: `d${day}g${groupNumber}`,
    homePlayerId,
    challengerPlayerId,
    holes: [...holeCodes].map((code) => HOLE_CODES[code]),
  }
})

// Each group of four players (two matches) has one designated scorer.
// By default it's the Home player in the group's first match.
const groups = [1, 2, 3].flatMap((day) =>
  [1, 2, 3].map((number) => {
    const id = `d${day}g${number}`
    const firstMatch = matches.find((m) => m.groupId === id)
    return { id, day, number, scorerId: firstMatch.homePlayerId }
  }),
)

export function createDemoTournament() {
  return structuredClone({
    version: 2,
    name: 'WGM Golf Cup',
    isDemo: true,
    days: [1, 2, 3],
    targetPoints: 10,
    holesPerMatch: 18,
    teams: {
      HOME: { id: 'HOME', name: 'Home Team' },
      CHALLENGERS: { id: 'CHALLENGERS', name: 'Challengers' },
    },
    players,
    adminIds: ['h1'],
    groups,
    matches,
  })
}
