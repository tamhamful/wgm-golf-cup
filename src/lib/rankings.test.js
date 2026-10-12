// Tests for player rankings. Run with: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getPlayerRankings } from './rankings.js'
import { createDemoTournament } from '../data/demoTournament.js'

const CODES = { H: 'HOME', C: 'CHALLENGERS', '=': 'HALVED' }
const holes = (codes) => [...codes].map((c) => CODES[c])
const rowFor = (rankings, name) => rankings.find((r) => r.player.name === name)

test('counts holes won, lost, halved and played from the demo data', () => {
  const r = getPlayerRankings(createDemoTournament())
  // Match 3: David Kelly 5 won, Bobby Brown 3 won, 9 halved, 17 played, Kelly won the point
  const kelly = rowFor(r, 'David Kelly')
  assert.deepEqual(
    [kelly.holesWon, kelly.holesLost, kelly.holesHalved, kelly.holesPlayed, kelly.points],
    [5, 3, 9, 17, 1],
  )
  const brown = rowFor(r, 'Bobby Brown')
  assert.deepEqual([brown.holesWon, brown.holesLost, brown.points], [3, 5, 0])
})

test('ordered by holes won', () => {
  const r = getPlayerRankings(createDemoTournament())
  assert.equal(r[0].player.name, 'David Kelly') // 5 holes won, the most
  for (let i = 1; i < r.length; i++) assert.ok(r[i - 1].holesWon >= r[i].holesWon)
})

test('holes are added up across several matches', () => {
  const t = createDemoTournament()
  for (const m of t.matches) m.holes = []
  t.matches.find((m) => m.id === 'm1').holes = holes('HHH') // Tom Hamilton, day 1
  t.matches.find((m) => m.id === 'm7').holes = holes('HH') // Tom Hamilton, day 2
  const tom = rowFor(getPlayerRankings(t), 'Tom Hamilton')
  assert.equal(tom.holesWon, 5)
  assert.equal(tom.matchesPlayed, 2)
})

test('ties broken by points, then fewer holes lost, otherwise shared rank', () => {
  const t = createDemoTournament()
  for (const m of t.matches) m.holes = []
  t.matches.find((m) => m.id === 'm1').holes = holes('HHHHHHHHHH') // Tom: 10 won, 1 point
  t.matches.find((m) => m.id === 'm2').holes = holes('HHHHHHHHHC') // Ian Ross: 9 won, live
  t.matches.find((m) => m.id === 'm4').holes = holes('HHHHHHHHH') // James Wilson: 9 won, 0 lost, live
  t.matches.find((m) => m.id === 'm5').holes = holes('HHHHHHHHH') // David Campbell: same as Wilson
  const r = getPlayerRankings(t)
  assert.equal(r[0].player.name, 'Tom Hamilton')
  // Wilson and Campbell (9 won, 0 lost) beat Ross (9 won, 1 lost) and share 2nd
  assert.equal(rowFor(r, 'James Wilson').rank, 2)
  assert.equal(rowFor(r, 'David Campbell').rank, 2)
  assert.equal(rowFor(r, 'James Wilson').tied, true)
  assert.equal(rowFor(r, 'Ian Ross').rank, 4)
  assert.equal(rowFor(r, 'Ian Ross').tied, false)
})

test('players not yet on a team are left out', () => {
  const t = createDemoTournament()
  t.players.push({ id: 'x1', name: 'Not Picked', teamId: null })
  assert.ok(!rowFor(getPlayerRankings(t), 'Not Picked'))
  assert.equal(getPlayerRankings(t).length, 12)
})
