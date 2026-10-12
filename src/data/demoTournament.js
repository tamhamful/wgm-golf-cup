// DEMONSTRATION DATA ONLY.
// These teams, players and match states are sample values used to show the
// design. They are not connected to a live tournament.
//
// Teams are identified by stable IDs (HOME / CHALLENGERS). The display names
// can change without affecting scoring.
//
// Match states are a temporary snapshot. In Stage 3 they will be replaced by
// hole-by-hole results, and the match position will be calculated from those.

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

// [day, home player, challengers player, state]
// state.status: NOT_STARTED | LIVE | COMPLETE
// state.leader / state.winner: HOME | CHALLENGERS | null (null = all square / halved)
const NS = { status: 'NOT_STARTED' }
const fixtures = [
  [1, 'h1', 'c1', { status: 'LIVE', leader: 'HOME', margin: 1, holesPlayed: 14 }],
  [1, 'h2', 'c2', { status: 'LIVE', leader: 'CHALLENGERS', margin: 2, holesPlayed: 12 }],
  [1, 'h3', 'c3', { status: 'COMPLETE', winner: 'HOME', margin: 2, holesPlayed: 17 }],
  [1, 'h4', 'c4', { status: 'LIVE', leader: null, margin: 0, holesPlayed: 8 }],
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

const matches = fixtures.map(([day, homePlayerId, challengerPlayerId, state], index) => {
  const numberInDay = (index % MATCHES_PER_DAY) + 1
  const groupNumber = Math.ceil(numberInDay / MATCHES_PER_GROUP)
  return {
    id: `m${index + 1}`,
    number: index + 1,
    day,
    groupId: `d${day}g${groupNumber}`,
    homePlayerId,
    challengerPlayerId,
    state: { ...state },
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
    version: 1,
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
