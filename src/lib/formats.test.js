// Tests for formats: pairs match play, Stableford, stroke play, handicaps
// and the course card. Run with: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createDemoTournament } from '../data/demoTournament.js'
import * as A from './admin.js'
import { canScoreMatch, recordHole } from './scoring.js'
import { DEFAULT_COURSE, totalPointsAvailable } from './formats.js'
import { computePairing, dayCupPoints, scoreRound, shotsOnHole, stablefordPoints } from './strokeplay.js'
import { getProjectedPoints, getTeamPoints, matchView } from './tournament.js'
import { getDayRankings, getPlayerRankings } from './rankings.js'
import { buildTickerEvents } from './ticker.js'

const ADMIN = { playerId: 'h1', isAdmin: true }
const player = (playerId) => ({ playerId, isAdmin: false })
const dayMatches = (t, day) => t.matches.filter((m) => m.day === day)

// A tournament with no scores, every player on handicap 0.
function fresh() {
  const t = createDemoTournament()
  for (const m of t.matches) {
    m.holes = []
    m.holeTimes = []
  }
  for (const p of t.players) p.handicap = 0
  return t
}

// ---------- Handicap shots and Stableford ----------

test('handicap shots by stroke index', () => {
  // 14 handicap: one shot on stroke index 1-14, none on 15-18
  assert.equal(shotsOnHole(14, 1), 1)
  assert.equal(shotsOnHole(14, 14), 1)
  assert.equal(shotsOnHole(14, 15), 0)
  // 20 handicap: two shots on SI 1-2, one on the rest
  assert.equal(shotsOnHole(20, 2), 2)
  assert.equal(shotsOnHole(20, 3), 1)
  // +2 (stored -2): gives a shot back on SI 17 and 18
  assert.equal(shotsOnHole(-2, 17), -1)
  assert.equal(shotsOnHole(-2, 16), 0)
})

test('Stableford points', () => {
  assert.equal(stablefordPoints(5, 4, 1), 2) // net par
  assert.equal(stablefordPoints(3, 4, 1), 4) // net eagle
  assert.equal(stablefordPoints(7, 4, 1), 0) // net double bogey or worse
  assert.equal(stablefordPoints('P', 4, 1), 0) // pick-up
})

test('stroke play counts at most net double bogey, including pick-ups', () => {
  const course = DEFAULT_COURSE // hole 1: par 4
  // 18 handicap gets 1 shot a hole: net double bogey = 4 + 2 + 1 = 7 gross
  assert.equal(scoreRound([9], 18, course).gross, 7)
  assert.equal(scoreRound(['P'], 18, course).gross, 7)
  assert.equal(scoreRound([5], 18, course).netToPar, 0) // 5 - 1 shot = net par
})

// ---------- Changing a day's format ----------

test('fourballs: 3 pairs matches, same players kept in order', () => {
  const t = A.setDayFormat(fresh(), 2, 'FOURBALL')
  const day2 = dayMatches(t, 2)
  assert.equal(day2.length, 3)
  // Day 2 singles were h1-c2, h2-c3, h3-c4, h4-c5, h5-c6, h6-c1
  assert.deepEqual([day2[0].homePlayerId, day2[0].homePartnerId], ['h1', 'h2'])
  assert.deepEqual([day2[0].challengerPlayerId, day2[0].challengerPartnerId], ['c2', 'c3'])
  // Each pairs match is its own group of four
  assert.deepEqual(day2.map((m) => m.groupId), ['d2g1', 'd2g2', 'd2g3'])
  // Matches renumbered 1..15 in day order
  assert.deepEqual(t.matches.map((m) => m.number), Array.from({ length: 15 }, (_, i) => i + 1))
  assert.equal(totalPointsAvailable(t), 15) // 6 + 3 + 6
})

test('a day with scores cannot change format', () => {
  const t = createDemoTournament() // Day 1 has scores
  assert.throws(() => A.setDayFormat(t, 1, 'FOURBALL'), /already has scores/)
})

test('switching back from pairs to singles keeps everyone', () => {
  let t = A.setDayFormat(fresh(), 3, 'FOURSOMES')
  t = A.setDayFormat(t, 3, 'SINGLES')
  const day3 = dayMatches(t, 3)
  assert.equal(day3.length, 6)
  assert.equal(new Set(day3.map((m) => m.homePlayerId)).size, 6)
  assert.equal(new Set(day3.map((m) => m.challengerPlayerId)).size, 6)
})

test('Stableford days stay 6 pairings and are worth 6 points', () => {
  const t = A.setDayFormat(fresh(), 3, 'STABLEFORD')
  assert.equal(dayMatches(t, 3).length, 6)
  assert.equal(totalPointsAvailable(t), 18)
})

test('points to win cannot exceed the points available', () => {
  let t = A.setDayFormat(fresh(), 1, 'FOURBALL')
  t = A.setDayFormat(t, 2, 'FOURSOMES') // 3 + 3 + 6 = 12
  assert.throws(() => A.setTargetPoints(t, 13), /between 0.5 and 12/)
  assert.equal(A.setTargetPoints(t, 6.5).targetPoints, 6.5)
})

// ---------- Pairs match play ----------

test('pairs: the four players can score, partners must be chosen', () => {
  let t = A.setDayFormat(fresh(), 2, 'FOURBALL')
  const m = dayMatches(t, 2)[0] // h1 & h2 v c2 & c3
  assert.equal(canScoreMatch(t, m, player('h2')), true) // a partner
  assert.equal(canScoreMatch(t, m, player('c3')), true)
  assert.equal(canScoreMatch(t, m, player('h3')), false) // another match
  t = A.setMatchPlayer(t, m.id, 'homePartnerId', null)
  assert.throws(() => recordHole(t, m.id, 1, 'HOME', ADMIN), /All the players/)
})

test('pairs: choosing a player already in the pair swaps them within it', () => {
  const t = A.setDayFormat(fresh(), 2, 'FOURBALL')
  const m = dayMatches(t, 2)[0] // h1 & h2
  const after = A.setMatchPlayer(t, m.id, 'homePlayerId', 'h2')
  const pair = after.matches.find((x) => x.id === m.id)
  assert.deepEqual([pair.homePlayerId, pair.homePartnerId], ['h2', 'h1'])
})

test('pairs: both partners are credited in the rankings', () => {
  let t = A.setDayFormat(fresh(), 2, 'FOURBALL')
  const m = dayMatches(t, 2)[0]
  for (let hole = 1; hole <= 10; hole++) t = recordHole(t, m.id, hole, 'HOME', ADMIN) // 10&8
  const r = getPlayerRankings(t)
  for (const name of ['Tom Hamilton', 'Ian Ross']) {
    const row = r.find((x) => x.player.name === name)
    assert.equal(row.holesWon, 10)
    assert.equal(row.points, 1)
  }
  assert.deepEqual(getTeamPoints(t), { HOME: 1, CHALLENGERS: 0 })
})

test('pairs: ticker names both partners', () => {
  let t = A.setDayFormat(fresh(), 2, 'FOURBALL')
  const m = dayMatches(t, 2)[0]
  for (let hole = 1; hole <= 10; hole++) t = recordHole(t, m.id, hole, 'HOME', ADMIN)
  const texts = buildTickerEvents(t).map((e) => e.text)
  assert.ok(texts.some((x) => x.startsWith('Tom Hamilton & Ian Ross wins 10&8')))
})

// ---------- Stableford / stroke play days ----------

// Plays every Day 3 pairing: Home player scores `home`, Challenger `chal` on every hole.
function playDay3(t, home, chal) {
  for (const m of dayMatches(t, 3)) {
    for (let hole = 1; hole <= 18; hole++) t = recordHole(t, m.id, hole, `${home}:${chal}`, ADMIN)
  }
  return t
}

test('gross score entries are checked', () => {
  const t = A.setDayFormat(fresh(), 3, 'STABLEFORD')
  const m = dayMatches(t, 3)[0]
  assert.doesNotThrow(() => recordHole(t, m.id, 1, '5:P', ADMIN))
  assert.throws(() => recordHole(t, m.id, 1, 'HOME', ADMIN), /score from 1 to 20/)
  assert.throws(() => recordHole(t, m.id, 1, '0:4', ADMIN), /score from 1 to 20/)
  assert.throws(() => recordHole(t, m.id, 1, '25:4', ADMIN), /score from 1 to 20/)
})

test('Stableford: points with handicap, pairing and leaderboard view', () => {
  let t = A.setDayFormat(fresh(), 3, 'STABLEFORD')
  t = A.setPlayerHandicap(t, 'h1', 18) // a shot on every hole
  const m = dayMatches(t, 3)[0] // Tom Hamilton (h1) v Bobby Brown (c3)
  t = recordHole(t, m.id, 1, '5:5', ADMIN) // par 4: Tom net par = 2 pts, Bobby bogey = 1 pt
  const p = computePairing(t, t.matches.find((x) => x.id === m.id))
  assert.equal(p.round.HOME.points, 2)
  assert.equal(p.round.CHALLENGERS.points, 1)
  assert.equal(p.better, 'HOME')
  const view = matchView(t, t.matches.find((x) => x.id === m.id))
  assert.deepEqual(view.scores, { HOME: '2 pts', CHALLENGERS: '1 pts' })
  assert.equal(view.detail, '1 HOLE')
  assert.equal(view.side, 'HOME')
})

test('Stableford day: the top 6 scores each earn a cup point, once every pairing finishes', () => {
  let t = A.setDayFormat(fresh(), 3, 'STABLEFORD')
  const first = dayMatches(t, 3)[0]
  for (let hole = 1; hole <= 18; hole++) t = recordHole(t, first.id, hole, '4:5', ADMIN)
  assert.deepEqual(getTeamPoints(t), { HOME: 0, CHALLENGERS: 0 }) // day not finished
  // As it stands only two players have scores, so both are in the top 6
  assert.deepEqual(getProjectedPoints(t), { HOME: 1, CHALLENGERS: 1 })
  t = playDay3(t, 4, 5) // everyone else: Home pars (36 pts), Challengers bogeys (18 pts)
  const day = dayCupPoints(t, 3)
  assert.equal(day.complete, true)
  assert.deepEqual(day.points, { HOME: 6, CHALLENGERS: 0 }) // all six Home players are the top 6
  assert.deepEqual(getTeamPoints(t), { HOME: 6, CHALLENGERS: 0 })
  const texts = buildTickerEvents(t).map((e) => e.text)
  assert.ok(texts.includes('Home Team take 6 of the 6 points on the Day 3 Stableford (6 – 0)'))
})

test('Stableford day: players tied on the cut-off share the last point', () => {
  let t = A.setDayFormat(fresh(), 3, 'STABLEFORD')
  // Day 3 pairings: h1-c3, h2-c4, h3-c5, h4-c6, h5-c1, h6-c2 (all handicap 0)
  // gross 3 every hole = 54 pts, gross 4 = 36 pts, gross 6 = 4 pts (par 5s only)
  const scores = ['3:6', '3:6', '3:6', '3:6', '3:4', '4:6']
  dayMatches(t, 3).forEach((m, i) => {
    for (let hole = 1; hole <= 18; hole++) t = recordHole(t, m.id, hole, scores[i], ADMIN)
  })
  // h1-h5 take places 1-5; h6 and c1 tie for 6th on 36 and share the last point
  const day = dayCupPoints(t, 3)
  assert.deepEqual(day.points, { HOME: 5.5, CHALLENGERS: 0.5 })
  assert.equal(day.byPlayer.get('h6'), 0.5)
  assert.equal(day.byPlayer.get('c1'), 0.5)
  assert.equal(day.byPlayer.get('c2') ?? 0, 0)
  const texts = buildTickerEvents(t).map((e) => e.text)
  assert.ok(texts.includes('Home Team take 5.5 of the 6 points on the Day 3 Stableford (5.5 – 0.5)'))
})

test('Stroke play day: top 6 lowest net scores earn the points; all level shares 3 – 3', () => {
  let t = A.setDayFormat(fresh(), 3, 'STROKE')
  t = playDay3(t, 5, 4) // Home bogeys, Challengers pars
  assert.deepEqual(getTeamPoints(t), { HOME: 0, CHALLENGERS: 6 })
  let tie = A.setDayFormat(fresh(), 3, 'STROKE')
  tie = playDay3(tie, 4, 4)
  assert.deepEqual(getTeamPoints(tie), { HOME: 3, CHALLENGERS: 3 })
})

test('day rankings: most Stableford points first', () => {
  let t = A.setDayFormat(fresh(), 3, 'STABLEFORD')
  t = A.setPlayerHandicap(t, 'c3', 36) // two shots a hole
  t = playDay3(t, 4, 6) // c3 nets par everywhere = 36 pts; other Challengers only score on par 5s
  const r = getDayRankings(t, 3)
  assert.equal(r[0].player.name, 'Bobby Brown')
  assert.equal(r[0].points, 36)
  assert.equal(r[1].points, 36) // the Home players, all level on 36...
  assert.equal(r[1].rank, 1) // ...share 1st with Bobby
  assert.equal(r.at(-1).points, 4) // a point on each of the four par 5s
  // Seven players level on 36 for 1st share the six points: 6/7 each
  assert.ok(Math.abs(r[0].cupPoints - 6 / 7) < 1e-9)
  assert.equal(r.at(-1).cupPoints, 0)
})

// ---------- Handicaps and course ----------

test('handicaps: whole numbers, plus handicaps, blank clears', () => {
  let t = A.setPlayerHandicap(fresh(), 'h1', '+2')
  assert.equal(t.players.find((p) => p.id === 'h1').handicap, -2)
  assert.equal(A.formatHandicap(-2), '+2')
  t = A.setPlayerHandicap(t, 'h1', '')
  assert.equal(t.players.find((p) => p.id === 'h1').handicap, null)
  assert.throws(() => A.setPlayerHandicap(t, 'h1', '60'), /whole number/)
  assert.throws(() => A.setPlayerHandicap(t, 'h1', '12.5'), /whole number/)
})

test('course card: par and stroke index checks', () => {
  const t = fresh()
  assert.deepEqual(A.courseProblems(t), [])
  const broken = A.setCourseHole(t, 1, { si: 2 }) // SI 2 now used twice, 7 missing
  assert.match(A.courseProblems(broken)[0], /Missing: 7/)
  assert.throws(() => A.confirmCourse(broken), /Missing: 7/)
  assert.throws(() => A.setCourseHole(t, 1, { par: 7 }), /Par must be/)
  assert.equal(A.confirmCourse(t).course.confirmed, true)
})
