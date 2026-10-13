// Admin sign-in with an emailed link (Supabase Auth). Players don't sign in.
// The database decides who is an admin (the admins table); this just asks it.

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

export function useAdminSession() {
  const [email, setEmail] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const check = async (session) => {
      const signedInEmail = session?.user?.email ?? null
      setEmail(signedInEmail)
      if (!signedInEmail) {
        setIsAdmin(false)
        return
      }
      const { data, error } = await supabase.rpc('is_admin')
      setIsAdmin(!error && data === true)
    }

    supabase.auth.getSession().then(({ data }) => check(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      // Run outside the auth callback, as Supabase recommends.
      setTimeout(() => check(session), 0)
      // Tidy the sign-in code out of the address bar after following the link.
      if (session && window.location.search.includes('code=')) {
        window.history.replaceState(window.history.state, '', window.location.pathname)
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const sendSignInLink = useCallback(async (address) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: address.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    return error ? error.message : null
  }, [])

  const signOut = useCallback(() => supabase.auth.signOut(), [])

  return { email, isAdmin, sendSignInLink, signOut }
}
