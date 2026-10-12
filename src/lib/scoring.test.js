// Tests for the match-play scoring engine. Run with: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeMatchState, recordHole, undoLastHole, resetMatch, canScoreMatch } from './scoring.js'
import { createDemoTournament } from '../data/demoTournament.js'

// Shorthand: H = Home won, C = Challenger won, = = halved
const holes = (codes) => [...codes].map((c) => ({ H: 'HOME', C: 'CHALLENGERS', '=': 'HALVED' })[c])
const state = (codes) => computeMatchState(holes(codes))

test('no holes played: not started, not all square', () => {
  const s = state('')
  assert.equal(s.status, 'NOT_STARTED')
  assert.equal(s.holesPlayed, 0)
  assert.equal(s.result, null)
})

test('the example from the brief: 1 UP, back to all square, 1 UP, halve stays 1 UP', () => {
  assert.equal(state('H').leader, 'HOME')
  assert.equal(state('H').margin, 1)
  assert.equal(state('HC').leader, null)
  assert.equal(state('HC').margin, 0)
  assert.equal(state('HCH').margin, 1)
  const s = state('HCH=')
  assert.equal(s.leader, 'HOME')
  assert.equal(s.margin, 1)
  assert.equal(s.holesPlayed, 4)
  assert.equal(s.holesHalved, 1)
  assert.deepEqual(s.holesWon, { HOME: 2, CHALLENGERS: 1 })
  assert.equal(s.status, 'LIVE')
})

test('finishes early: 2&1 when 2 up with 1 to play', () => {
  const s = state('H=CH=H=C=H=C==H==') // 17 holes, Home 2 up
  assert.equal(s.status, 'COMPLETE')
  assert.equal(s.result, '2&1')
  assert.equal(s.winner, 'HOME')
  assert.equal(s.holesPlayed, 17)
})

test('finishes early: 5&4 when 5 up with 4 to play', () => {
  const s = state('CCCCC=========') // 14 holes
  assert.equal(s.result, '5&4')
  assert.equal(s.winner, 'CHALLENGERS')
})

test('biggest possible win: 10&8', () => {
  assert.equal(state('HHHHHHHHHH').result, '10&8')
})

test('2 up with 2 to play is dormie, not finished', () => {
  const s = state('HH==============') // 16 holes
  assert.equal(s.status, 'LIVE')
  assert.equal(s.dormie, true)
  assert.equal(s.result, null)
})

test('1 UP after all 18 holes', () => {
  const s = state('H=================')
  assert.equal(s.status, 'COMPLETE')
  assert.equal(s.result, '1 UP')
  assert.equal(s.winner, 'HOME')
})

test('2 UP after 18 (came from 1 up on 17th)', () => {
  const s = state('H================H')
  assert.equal(s.result, '2 UP')
})

test('all square after 18 holes is halved', () => {
  const s = state('HC================')
  assert.equal(s.status, 'COMPLETE')
  assert.equal(s.result, 'HALVED')
  assert.equal(s.winner, null)
})

test('holes recorded after the match ended are ignored', () => {
  const s = state('HHHHHHHHHHC') // decided 10&8 before the 11th
  assert.equal(s.holesPlayed, 10)
  assert.equal(s.result, '10&8')
})

// ---------- Recording scores ----------

const demo = () => createDemoTournament()
const matchOf = (t, id) => t.matches.find((m) => m.id === id)

test('group member can record the next hole', () => {
  // m5 is David Campbell (h5) v Gordon Reid (c5), group d1g3 with m6
  const t = recordHole(demo(), 'm5', 1, 'HOME', 'c6') // Alan Murray is in the same group
  assert.deepEqual(matchOf(t, 'm5').holes, ['HOME'])
})

test('player from another group cannot score', () => {
  assert.throws(() => recordHole(demo(), 'm5', 1, 'HOME', 'h2'), /Only the players in this group/)
  assert.equal(canScoreMatch(demo(), matchOf(demo(), 'm5'), 'h2'), false)
})

test('admin can score any match', () => {
  assert.equal(canScoreMatch(demo(), matchOf(demo(), 'm5'), 'h1'), true)
})

test('cannot skip a hole', () => {
  assert.throws(() => recordHole(demo(), 'm5', 2, 'HOME', 'h5'), /Enter hole 1 first/)
})

test('a finished match will not accept another hole', () => {
  assert.throws(() => recordHole(demo(), 'm3', 18, 'HOME', 'h1'), /finished/)
})

test('only an admin can correct a finished match', () => {
  // m3 David Kelly (h3) won 2&1; Bobby Brown (c3) is in that group but not an admin
  assert.throws(() => recordHole(demo(), 'm3', 1, 'CHALLENGERS', 'c3'), /Only an admin/)
  const t = recordHole(demo(), 'm3', 1, 'CHALLENGERS', 'h1')
  const s = computeMatchState(matchOf(t, 'm3').holes)
  assert.equal(s.status, 'LIVE') // now all square after 17, so hole 18 is needed
  assert.equal(s.margin, 0)
})

test('correcting an earlier hole recalculates the position', () => {
  // m1: Tom Hamilton 1 UP through 14. Change hole 2 (a Challengers win) to Home.
  const t = recordHole(demo(), 'm1', 2, 'HOME', 'c1')
  const s = computeMatchState(matchOf(t, 'm1').holes)
  assert.equal(s.leader, 'HOME')
  assert.equal(s.margin, 3)
  assert.equal(s.holesPlayed, 14)
})

test('a correction that ends the match sooner drops later holes', () => {
  let t = demo()
  for (let hole = 1; hole <= 9; hole++) t = recordHole(t, 'm5', hole, 'HOME', 'h1')
  t = recordHole(t, 'm5', 10, 'CHALLENGERS', 'h1') // 8 up after 10, still live
  t = recordHole(t, 'm5', 10, 'HOME', 'h1') // correction: now 10 up after 10 -> 10&8
  const m = matchOf(t, 'm5')
  assert.equal(m.holes.length, 10)
  assert.equal(computeMatchState(m.holes).result, '10&8')
})

test('undo removes the last hole', () => {
  const t = undoLastHole(demo(), 'm4', 'h4')
  assert.equal(matchOf(t, 'm4').holes.length, 7)
})

test('only an admin can reset a match', () => {
  assert.throws(() => resetMatch(demo(), 'm1', 'c1'), /Only an admin/)
  assert.deepEqual(matchOf(resetMatch(demo(), 'm1', 'h1'), 'm1').holes, [])
})

test('cannot score a match with a player missing', () => {
  const t = demo()
  t.matches.find((m) => m.id === 'm5').homePlayerId = null
  assert.throws(() => recordHole(t, 'm5', 1, 'HOME', 'h1'), /Both players/)
})
