import { useState } from 'react'

// Admins sign in by email link. Players never need this.
export default function AdminSignIn({ signedInEmail, isAdmin, onSend, onSignOut, onClose }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState({ status: 'idle', message: null })

  if (signedInEmail && !isAdmin) {
    return (
      <section className="admin-signin">
        <h2>Admin sign in</h2>
        <p className="error-box">
          You're signed in as {signedInEmail}, but that email isn't on the admin list.
        </p>
        <div className="admin-signin-actions">
          <button type="button" className="button button-secondary" onClick={onSignOut}>
            Sign out
          </button>
          <button type="button" className="link-button" onClick={onClose}>
            Back
          </button>
        </div>
      </section>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    setState({ status: 'sending', message: null })
    const error = await onSend(email)
    setState(error ? { status: 'idle', message: error } : { status: 'sent', message: null })
  }

  return (
    <section className="admin-signin">
      <h2>Admin sign in</h2>
      {state.status === 'sent' ? (
        <p className="info-box">
          Check your email at <strong>{email}</strong> and tap the sign-in link. Open it on this
          phone or computer, in this browser.
        </p>
      ) : (
        <form onSubmit={submit}>
          <p className="settings-help">
            We'll email you a link. No password needed. Only admin emails get admin access.
          </p>
          {state.message && <p className="error-box">{state.message}</p>}
          <div className="add-player">
            <input
              className="text-input"
              type="email"
              autoComplete="email"
              placeholder="Your email address"
              aria-label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              type="submit"
              className="button button-secondary"
              disabled={!email.trim() || state.status === 'sending'}
            >
              {state.status === 'sending' ? 'Sending…' : 'Email me a link'}
            </button>
          </div>
        </form>
      )}
      <button type="button" className="link-button admin-signin-back" onClick={onClose}>
        Back to the leaderboard
      </button>
    </section>
  )
}
