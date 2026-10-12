// Tests for the ticker events. Run with: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildTickerEvents } from './ticker.js'
import { createDemoTournament } from '../data/demoTournament.js'

const CODES = { H: 'HOME', C: 'CHALLENGERS', '=': 'HALVED' }
const START = Date.parse('2026-10-12T09:00:00Z')

// Sets a match's holes, one minute apart starting at `startMinute`.
function play(t, matchId, codes, startMinute = 0) {
  const m = t.matches.find((x) => x.id === matchId)
  m.holes = [...codes].map((c) => CODES[c])
  m.holeTimes = m.holes.map((_, i) => new Date(START + (startMinute + i) * 60000).toISOString())
  return t
}

function blank() {
  const t = createDemoTournament()
  for (const m of t.matches) {
    m.holes = []
    m.holeTimes = []
  }
  return t
}

const texts = (t, notices) => buildTickerEvents(t, notices).map((e) => e.text)

test('3 holes in a row says holes, and names the match', () => {
  const t = play(blank(), 'm2', 'CCC') // Ian Mathieson wins 3 holes
  assert.ok(texts(t).includes('Ian Mathieson has won 3 holes in a row (Match 2)'))
})

test('a halved hole breaks a hole streak', () => {
  const t = play(blank(), 'm2', 'CC=C')
  assert.ok(!texts(t).some((x) => x.includes('in a row')))
})

test('squaring a match and taking the lead', () => {
  const t = play(blank(), 'm1', 'HCC') // Tom 1 up, Greig squares on 2nd, Greig leads on 3rd
  const all = texts(t)
  assert.ok(all.includes('Greig Dyer squares Match 1 on the 2nd'))
  assert.ok(all.includes('Greig Dyer takes the lead in Match 1 on the 3rd'))
})

test('dormie', () => {
  const t = play(blank(), 'm1', 'HH==============') // 2 up with 2 to play
  assert.ok(texts(t).includes('Dormie: Tom Hamilton 2 UP with 2 to play (Match 1)'))
})

test('match result names the winner, score and team', () => {
  const t = play(blank(), 'm3', 'H=CH=H=C=H=C==H==')
  assert.ok(texts(t).includes('David Kelly wins 2&1: point to Home Team (Match 3)'))
})

test('halved match', () => {
  const t = play(blank(), 'm4', 'HC================')
  assert.ok(texts(t).includes('Match 4 halved: James Wilson and Steven Clark take half a point each'))
})

test('3 matches in a row says matches, for the team', () => {
  let t = blank()
  t = play(t, 'm1', 'CCCCCCCCCC', 0)
  t = play(t, 'm2', 'CCCCCCCCCC', 20)
  t = play(t, 'm3', 'CCCCCCCCCC', 40)
  assert.ok(texts(t).includes('Challengers have won 3 matches in a row'))
})

test('overall lead, points needed and winning the Cup', () => {
  let t = blank()
  // Home win 10 matches, one after another
  t.matches.slice(0, 10).forEach((m, i) => play(t, m.id, 'HHHHHHHHHH', i * 20))
  const all = texts(t)
  assert.ok(all.includes('Home Team take the overall lead: Home Team 1 – 0 Challengers'))
  assert.ok(all.includes('Home Team need 2 more points to win the Cup'))
  assert.ok(all.includes('Home Team need 1 more point to win the Cup'))
  assert.ok(all.includes('Home Team win the WGM Golf Cup! Home Team 10 – 0 Challengers'))
  assert.ok(all.includes('Day 1 complete. Overall: Home Team 6 – 0 Challengers'))
})

test('projection swing needs a team at least a point clear', () => {
  let t = blank()
  t = play(t, 'm1', 'H', 0) // Home 1 – 0 projected: a point clear
  t = play(t, 'm2', 'C', 1) // 1 – 1 level: not news
  t = play(t, 'm3', 'C', 2) // Challengers 1 – 2
  t = play(t, 'm4', '=', 3) // 1.5 – 2.5, still Challengers: not news again
  const all = texts(t)
  assert.ok(all.includes('Projected score swings to Home Team: 1 – 0'))
  assert.ok(all.includes('Projected score swings to Challengers: 1 – 2'))
  assert.ok(!all.some((x) => x.includes('level')))
  assert.equal(all.filter((x) => x.startsWith('Projected')).length, 2)
})

test('projected to win the Cup', () => {
  let t = blank()
  t.matches.slice(0, 10).forEach((m, i) => play(t, m.id, 'H', i)) // 10 live matches, Home 1 up
  assert.ok(texts(t).includes('Home Team now projected to win the Cup: 10 – 0'))
})

test('newest first, and admin notices are included', () => {
  const t = play(blank(), 'm2', 'CCC')
  const later = new Date(START + 60 * 60000).toISOString()
  const events = buildTickerEvents(t, [{ id: 1, created_at: later, message: 'Tee times delayed 20 minutes' }])
  assert.equal(events[0].text, 'Tee times delayed 20 minutes')
  assert.equal(events[0].kind, 'notice')
})

test('a correction changes the events', () => {
  let t = play(blank(), 'm2', 'CCC')
  assert.ok(texts(t).some((x) => x.includes('3 holes in a row')))
  t = play(t, 'm2', 'CC=') // hole 3 corrected to halved
  assert.ok(!texts(t).some((x) => x.includes('3 holes in a row')))
})
