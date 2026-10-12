// DEMONSTRATION DATA ONLY.
// These teams, players and match states are sample values used to show the
// design. They are not connected to a live tournament and are not saved.
//
// Teams are identified by stable IDs (HOME / CHALLENGERS). The display names
// can change later without affecting scoring.
//
// Match states are a temporary snapshot. In Stage 3 they will be replaced by
// hole-by-hole results, and the match position will be calculated from those.

export const demoTournament = {
  name: 'WGM Golf Cup',
  isDemo: true,
  days: [1, 2, 3],
  targetPoints: 10,
  holesPerMatch: 18,

  teams: {
    HOME: { id: 'HOME', name: 'Home Team' },
    CHALLENGERS: { id: 'CHALLENGERS', name: 'Challengers' },
  },

  players: [
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
  ],

  // state.status: NOT_STARTED | LIVE | COMPLETE
  // state.leader / state.winner: HOME | CHALLENGERS | null (null = all square / halved)
  // state.margin: holes ahead
  matches: [
    // Day 1
    { id: 'm1', number: 1, day: 1, homePlayerId: 'h1', challengerPlayerId: 'c1',
      state: { status: 'LIVE', leader: 'HOME', margin: 1, holesPlayed: 14 } },
    { id: 'm2', number: 2, day: 1, homePlayerId: 'h2', challengerPlayerId: 'c2',
      state: { status: 'LIVE', leader: 'CHALLENGERS', margin: 2, holesPlayed: 12 } },
    { id: 'm3', number: 3, day: 1, homePlayerId: 'h3', challengerPlayerId: 'c3',
      state: { status: 'COMPLETE', winner: 'HOME', margin: 2, holesPlayed: 17 } },
    { id: 'm4', number: 4, day: 1, homePlayerId: 'h4', challengerPlayerId: 'c4',
      state: { status: 'LIVE', leader: null, margin: 0, holesPlayed: 8 } },
    { id: 'm5', number: 5, day: 1, homePlayerId: 'h5', challengerPlayerId: 'c5',
      state: { status: 'NOT_STARTED' } },
    { id: 'm6', number: 6, day: 1, homePlayerId: 'h6', challengerPlayerId: 'c6',
      state: { status: 'NOT_STARTED' } },

    // Day 2 (sample pairings, not yet played)
    { id: 'm7', number: 7, day: 2, homePlayerId: 'h1', challengerPlayerId: 'c2', state: { status: 'NOT_STARTED' } },
    { id: 'm8', number: 8, day: 2, homePlayerId: 'h2', challengerPlayerId: 'c3', state: { status: 'NOT_STARTED' } },
    { id: 'm9', number: 9, day: 2, homePlayerId: 'h3', challengerPlayerId: 'c4', state: { status: 'NOT_STARTED' } },
    { id: 'm10', number: 10, day: 2, homePlayerId: 'h4', challengerPlayerId: 'c5', state: { status: 'NOT_STARTED' } },
    { id: 'm11', number: 11, day: 2, homePlayerId: 'h5', challengerPlayerId: 'c6', state: { status: 'NOT_STARTED' } },
    { id: 'm12', number: 12, day: 2, homePlayerId: 'h6', challengerPlayerId: 'c1', state: { status: 'NOT_STARTED' } },

    // Day 3 (sample pairings, not yet played)
    { id: 'm13', number: 13, day: 3, homePlayerId: 'h1', challengerPlayerId: 'c3', state: { status: 'NOT_STARTED' } },
    { id: 'm14', number: 14, day: 3, homePlayerId: 'h2', challengerPlayerId: 'c4', state: { status: 'NOT_STARTED' } },
    { id: 'm15', number: 15, day: 3, homePlayerId: 'h3', challengerPlayerId: 'c5', state: { status: 'NOT_STARTED' } },
    { id: 'm16', number: 16, day: 3, homePlayerId: 'h4', challengerPlayerId: 'c6', state: { status: 'NOT_STARTED' } },
    { id: 'm17', number: 17, day: 3, homePlayerId: 'h5', challengerPlayerId: 'c1', state: { status: 'NOT_STARTED' } },
    { id: 'm18', number: 18, day: 3, homePlayerId: 'h6', challengerPlayerId: 'c2', state: { status: 'NOT_STARTED' } },
  ],
}
