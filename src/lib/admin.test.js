// Tests for admin changes (teams, players, pairings, settings). Run with: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as A from './admin.js'
import { createDemoTournament } from '../data/demoTournament.js'
import { teamRoleOf } from './tournament.js'

const matchOf = (t, id) => t.matches.find((m) => m.id === id)
const playerOf = (t, id) => t.players.find((p) => p.id === id)

test('demo has 18 matches in 9 groups', () => {
  const t = createDemoTournament()
  assert.equal(t.matches.length, 18)
  assert.equal(t.groups.length, 9)
})

test('team names: trimmed, blank refused', () => {
  const t = A.renameTeam(createDemoTournament(), 'HOME', '  Team   Scotland ')
  assert.equal(t.teams.HOME.name, 'Team Scotland')
  assert.throws(() => A.renameTeam(t, 'HOME', '  '), /blank/)
})

test('choosing a player already playing that day swaps them', () => {
  // Day 2: m7 has h1, m8 has h2
  const t = A.setMatchPlayer(createDemoTournament(), 'm7', 'HOME', 'h2')
  assert.equal(matchOf(t, 'm7').homePlayerId, 'h2')
  assert.equal(matchOf(t, 'm8').homePlayerId, 'h1')
  const day2 = t.matches.filter((m) => m.day === 2).map((m) => m.homePlayerId)
  assert.equal(new Set(day2).size, 6)
})

test('pairings are locked once a match has started', () => {
  const t = createDemoTournament()
  assert.throws(() => A.setMatchPlayer(t, 'm1', 'HOME', 'h2'), /has started/)
  assert.throws(() => A.setMatchPlayer(t, 'm5', 'HOME', 'h1'), /has started/) // h1 is in live m1
})

test('a player can only be paired for their own team', () => {
  assert.throws(() => A.setMatchPlayer(createDemoTournament(), 'm7', 'HOME', 'c1'), /not on/)
})

test('removing players', () => {
  const t = createDemoTournament()
  assert.throws(() => A.removePlayer(t, 'h2'), /already started/) // in live match
  const after = A.removePlayer(t, 'h6') // only in unstarted matches
  assert.equal(matchOf(after, 'm6').homePlayerId, null)
  assert.ok(!after.players.some((p) => p.id === 'h6'))
})

test('adding players: starts unassigned, no duplicate names', () => {
  let t = A.addPlayer(createDemoTournament(), 'Fresh Face')
  const id = t.players.at(-1).id
  assert.equal(playerOf(t, id).teamId, null)
  assert.throws(() => A.addPlayer(t, 'fresh face'), /already a player/)
  assert.throws(() => A.setMatchPlayer(t, 'm7', 'HOME', id), /not on/)
  t = A.movePlayer(t, id, 'HOME')
  t = A.setMatchPlayer(t, 'm6', 'HOME', id) // replaces Mark Stewart (h6)
  assert.equal(matchOf(t, 'm6').homePlayerId, id)
})

test('moving a player to unassigned clears their unstarted pairings', () => {
  const t = A.movePlayer(createDemoTournament(), 'h5', null)
  assert.equal(playerOf(t, 'h5').teamId, null)
  assert.ok(!t.matches.some((m) => m.homePlayerId === 'h5'))
})

test('captain and vice-captain', () => {
  let t = createDemoTournament()
  t = A.setTeamRole(t, 'HOME', 'captainId', 'h1')
  t = A.setTeamRole(t, 'HOME', 'viceCaptainId', 'h2')
  assert.equal(t.teams.HOME.captainId, 'h1')
  assert.equal(t.teams.HOME.viceCaptainId, 'h2')
  assert.equal(teamRoleOf(t.teams, playerOf(t, 'h1')), 'C')
  assert.equal(teamRoleOf(t.teams, playerOf(t, 'h2')), 'VC')
  assert.equal(teamRoleOf(t.teams, playerOf(t, 'h3')), null)
  // Can't be both, and must be on that team
  assert.throws(() => A.setTeamRole(t, 'HOME', 'viceCaptainId', 'h1'), /already the captain/)
  assert.throws(() => A.setTeamRole(t, 'HOME', 'captainId', 'c1'), /not on/)
  // Clearing a role
  assert.equal(A.setTeamRole(t, 'HOME', 'viceCaptainId', null).teams.HOME.viceCaptainId, null)
})

test('moving or removing a captain clears the role', () => {
  let t = createDemoTournament()
  t = A.setTeamRole(t, 'CHALLENGERS', 'captainId', 'c6') // Alan Murray, only in unstarted matches
  t = A.setTeamRole(t, 'HOME', 'viceCaptainId', 'h6') // Mark Stewart, likewise
  assert.equal(A.movePlayer(t, 'c6', 'HOME').teams.CHALLENGERS.captainId, null)
  assert.equal(A.removePlayer(t, 'h6').teams.HOME.viceCaptainId, null)
})

test('admin sets the current day', () => {
  const t = A.setCurrentDay(createDemoTournament(), 2)
  assert.equal(t.currentDay, 2)
  assert.throws(() => A.setCurrentDay(t, 4), /not part/)
})

test('points to win must be sensible', () => {
  const t = createDemoTournament()
  assert.throws(() => A.setTargetPoints(t, 0))
  assert.throws(() => A.setTargetPoints(t, 9.3))
  assert.equal(A.setTargetPoints(t, '9.5').targetPoints, 9.5)
})
