// Managing the list of admin emails. The database only allows signed-in
// admins to see or change this list.

import { supabase } from '../lib/supabaseClient.js'

export async function listAdmins() {
  const { data, error } = await supabase.from('admins').select('email').order('email')
  if (error) throw error
  return data.map((row) => row.email)
}

export async function addAdmin(email) {
  const { error } = await supabase.rpc('add_admin', { p_email: email })
  return error ? error.message : null
}

export async function removeAdmin(email) {
  const { error } = await supabase.rpc('remove_admin', { p_email: email })
  return error ? error.message : null
}
