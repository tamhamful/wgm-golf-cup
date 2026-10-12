import { useState } from 'react'

const MAX_LENGTH = 140

// Admins post their own messages to the ticker, e.g. "Tee times delayed".
export default function AdminTicker({ notices, onPost, onDelete }) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState(null)
  const [posting, setPosting] = useState(false)

  const post = async (e) => {
    e.preventDefault()
    setPosting(true)
    const problem = await onPost(message)
    setPosting(false)
    setError(problem)
    if (!problem) setMessage('')
  }

  const remove = async (notice) => {
    if (!window.confirm(`Remove this notice from the ticker?\n\n"${notice.message}"`)) return
    setError(await onDelete(notice.id))
  }

  const newestFirst = [...notices].reverse()

  return (
    <div className="admin-ticker">
      <section className="settings-block">
        <h3>Post to the ticker</h3>
        <p className="settings-help">
          Shown to everyone straight away with a "Notice" label. Match news is added automatically.
        </p>
        {error && <p className="error-box">{error}</p>}
        <form className="add-player" onSubmit={post}>
          <input
            className="text-input"
            type="text"
            maxLength={MAX_LENGTH}
            placeholder="e.g. Tee times delayed 20 minutes"
            aria-label="Ticker message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button type="submit" className="button button-secondary" disabled={!message.trim() || posting}>
            {posting ? 'Posting…' : 'Post'}
          </button>
        </form>
        <p className="char-count">
          {message.length}/{MAX_LENGTH}
        </p>
      </section>

      <section className="settings-block settings-danger">
        <h3>Posted notices</h3>
        {newestFirst.length === 0 ? (
          <p className="settings-help">No notices yet.</p>
        ) : (
          <ul className="admin-email-list">
            {newestFirst.map((notice) => (
              <li key={notice.id}>
                <span>{notice.message}</span>
                <button
                  type="button"
                  className="button button-quiet button-danger-text"
                  onClick={() => remove(notice)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
