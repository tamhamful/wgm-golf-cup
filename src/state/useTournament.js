// Loads the tournament from the online database, keeps it up to date live,
// and sends changes back.
//
// How changes work:
//   1. The same rules as before (lib/admin.js, lib/scoring.js) check the
//      change on this device and give an instant, friendly error if needed.
//   2. The screen updates straight away.
//   3. The change is sent to the database, which checks the rules again.
//      If it's refused (e.g. someone else changed it first), the latest data
//      is reloaded and the message is shown.

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { clearAllScores, recordHole, resetMatch, undoLastHole } from '../lib/scoring.js'

// scoresById: { [matchId]: { holes, holeTimes } }
const combine = (setup, scoresById) => ({
  ...setup,
  matches: setup.matches.map((m) => ({
    ...m,
    holes: scoresById[m.id]?.holes ?? [],
    holeTimes: scoresById[m.id]?.holeTimes ?? [],
  })),
})

const scoresOf = (t) =>
  Object.fromEntries(t.matches.map((m) => [m.id, { holes: m.holes, holeTimes: m.holeTimes }]))

const scoresFromRow = (row) => ({ holes: row.holes ?? [], holeTimes: row.hole_times ?? [] })

// The setup document stored in the database has no scores in it.
const setupOf = (t) => ({
  ...t,
  matches: t.matches.map((m) => {
    const copy = { ...m }
    delete copy.holes
    delete copy.holeTimes
    return copy
  }),
})

// After a score change on this device, give any new holes the current time
// (the database sets the real time, which arrives a moment later).
const withHoleTimes = (before, after) => ({
  ...after,
  matches: after.matches.map((m) => {
    const old = before.matches.find((x) => x.id === m.id)?.holeTimes ?? []
    const now = new Date().toISOString()
    return { ...m, holeTimes: m.holes.map((_, i) => old[i] ?? now) }
  }),
})

export function useTournament() {
  const [tournament, setTournament] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [syncError, setSyncError] = useState(null)
  const [notices, setNotices] = useState([])
  const version = useRef(null)
  const saveQueue = useRef(Promise.resolve())

  const load = useCallback(async () => {
    const [setupResult, scoresResult, noticesResult] = await Promise.all([
      supabase.from('tournament').select('setup, version').eq('id', 1).maybeSingle(),
      supabase.from('match_scores').select('match_id, holes, hole_times'),
      supabase.from('ticker_notices').select('id, created_at, message').order('created_at'),
    ])
    const error = setupResult.error || scoresResult.error || noticesResult.error
    if (error || !setupResult.data) {
      setLoadError(error?.message ?? 'The tournament has not been set up in the database yet.')
      return
    }
    const scoresById = Object.fromEntries(scoresResult.data.map((r) => [r.match_id, scoresFromRow(r)]))
    version.current = setupResult.data.version
    setTournament(combine(setupResult.data.setup, scoresById))
    setNotices(noticesResult.data)
    setLoadError(null)
  }, [])

  // Live updates: whenever anything changes in the database, every open
  // copy of the app updates itself.
  useEffect(() => {
    const channel = supabase
      .channel('tournament-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament' }, ({ new: row }) => {
        if (!row?.setup) return
        version.current = row.version
        setTournament((t) => (t ? combine(row.setup, scoresOf(t)) : t))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_scores' }, ({ new: row }) => {
        if (!row?.match_id) return
        setTournament((t) =>
          t && {
            ...t,
            matches: t.matches.map((m) => (m.id === row.match_id ? { ...m, ...scoresFromRow(row) } : m)),
          },
        )
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticker_notices' }, ({ new: row }) => {
        setNotices((list) => (list.some((n) => n.id === row.id) ? list : [...list, row]))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'ticker_notices' }, ({ old: row }) => {
        setNotices((list) => list.filter((n) => n.id !== row.id))
      })
      // Reload everything when the live connection (re)starts, in case
      // anything was missed while a phone was asleep or offline.
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') load()
      })

    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      supabase.removeChannel(channel)
    }
  }, [load])

  const failed = useCallback(
    (error) => {
      setSyncError(error.message)
      load()
    },
    [load],
  )

  // ---------- Setup changes (admins) ----------

  // Runs one of the functions from lib/admin.js. Returns an error message if
  // the change isn't allowed, otherwise null.
  const apply = useCallback(
    (change, ...args) => {
      let next
      try {
        next = change(tournament, ...args)
      } catch (error) {
        return error.message
      }
      if (next === tournament) return null
      setTournament(next)

      // Changes go one at a time so each uses the latest version number.
      saveQueue.current = saveQueue.current.then(async () => {
        const { data, error } = await supabase.rpc('save_setup', {
          p_setup: setupOf(next),
          p_expected_version: version.current,
        })
        if (error) failed(error)
        else version.current = data
      })
      return null
    },
    [tournament, failed],
  )

  // ---------- Scores ----------

  const scoreChange = (localChange, rpcName, rpcArgs, onSaved) => {
    let next
    try {
      next = localChange()
    } catch (error) {
      return error.message
    }
    setTournament(withHoleTimes(tournament, next))
    // One at a time, in order, so quick taps can't arrive out of sequence.
    saveQueue.current = saveQueue.current.then(async () => {
      const { data, error } = await supabase.rpc(rpcName, rpcArgs)
      if (error) failed(error)
      else onSaved?.(data)
    })
    return null
  }

  const holesCount = (matchId) => tournament.matches.find((m) => m.id === matchId).holes.length

  const scoring = {
    recordHole: (matchId, hole, result, actor) =>
      scoreChange(() => recordHole(tournament, matchId, hole, result, actor), 'record_hole', {
        p_match_id: matchId,
        p_hole: hole,
        p_result: result,
        p_player_id: actor.playerId,
        p_expected_holes: holesCount(matchId),
      }),
    undoLastHole: (matchId, actor) =>
      scoreChange(() => undoLastHole(tournament, matchId, actor), 'undo_last_hole', {
        p_match_id: matchId,
        p_player_id: actor.playerId,
        p_expected_holes: holesCount(matchId),
      }),
    resetMatch: (matchId, actor) =>
      scoreChange(() => resetMatch(tournament, matchId, actor), 'reset_match', {
        p_match_id: matchId,
      }),
    // Also changes the setup (removes the demo label), so keep the version in step.
    clearAllScores: (actor) =>
      scoreChange(() => clearAllScores(tournament, actor), 'clear_all_scores', {}, (newVersion) => {
        version.current = newVersion
        setNotices([])
      }),
  }

  // ---------- Ticker notices (admins) ----------

  const postNotice = async (message) => {
    const { error } = await supabase.rpc('post_notice', { p_message: message })
    if (error) return error.message
    load()
    return null
  }

  const deleteNotice = async (id) => {
    const { error } = await supabase.rpc('delete_notice', { p_id: id })
    if (error) return error.message
    setNotices((list) => list.filter((n) => n.id !== id))
    return null
  }

  return {
    tournament,
    notices,
    postNotice,
    deleteNotice,
    loadError,
    syncError,
    dismissSyncError: () => setSyncError(null),
    reload: load,
    apply,
    scoring,
  }
}
