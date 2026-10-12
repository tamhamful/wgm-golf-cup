// Tests for team points and tournament status. Run with: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describeMatch, getProjectedPoints, getTeamPoints, getTournamentStatus } from './tournament.js'
import { createDemoTournament } from '../data/demoTournament.js'

const withHoles = (t, id, codes) => {
  t.matches.find((m) => m.id === id).holes = [...codes].map(
    (c) => ({ H: 'HOME', C: 'CHALLENGERS', '=': 'HALVED' })[c],
  )
  return t
}

test('demo data shows the expected positions', () => {
  const { matches } = createDemoTournament()
  const view = (id) => describeMatch(matches.find((m) => m.id === id))
  assert.equal(view('m1').position, '1 UP')
  assert.equal(view('m1').side, 'HOME')
  assert.equal(view('m1').holesPlayed, 14)
  assert.equal(view('m2').position, '2 UP')
  assert.equal(view('m2').side, 'CHALLENGERS')
  assert.equal(view('m3').position, '2&1')
  assert.equal(view('m3').detail, 'FINAL')
  assert.equal(view('m4').position, 'ALL SQUARE')
  assert.equal(view('m5').status, 'NOT_STARTED')
})

test('only completed matches award points', () => {
  const { matches } = createDemoTournament()
  assert.deepEqual(getTeamPoints(matches), { HOME: 1, CHALLENGERS: 0 })
})

test('halved match gives half a point each, and totals equal completed matches', () => {
  let t = createDemoTournament()
  t = withHoles(t, 'm4', 'HC================') // halved
  t = withHoles(t, 'm5', 'CCCCCCCCCC') // Challengers 10&8
  const points = getTeamPoints(t.matches)
  assert.deepEqual(points, { HOME: 1.5, CHALLENGERS: 1.5 })
  assert.equal(points.HOME + points.CHALLENGERS, 3) // 3 completed matches
})

test('projected points add live matches as they stand', () => {
  const { matches } = createDemoTournament()
  assert.deepEqual(getProjectedPoints(matches), { HOME: 2.5, CHALLENGERS: 1.5 })
})

test('tournament status', () => {
  const t = createDemoTournament()
  assert.equal(getTournamentStatus(t.matches, t.days, 18).label, 'Day 1 in progress')
  for (const m of t.matches) m.holes = []
  assert.equal(getTournamentStatus(t.matches, t.days, 18).label, 'Not started')
})
