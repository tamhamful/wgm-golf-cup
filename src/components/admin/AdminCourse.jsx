import { confirmCourse, courseProblems, setCourseHole, setCourseName } from '../../lib/admin.js'
import { courseOf } from '../../lib/formats.js'
import EditableText from './EditableText.jsx'

// Course card: par and stroke index for each hole. Needed for Stableford
// and stroke play (where handicap shots fall, and net double bogey).
export default function AdminCourse({ tournament, run }) {
  const course = courseOf(tournament)
  const problems = courseProblems(tournament)
  const parTotal = (from, to) => course.holes.slice(from, to).reduce((sum, h) => sum + h.par, 0)
  const half = Math.ceil(course.holes.length / 2)

  return (
    <div className="admin-course">
      <section className="settings-block">
        <h3>Course card</h3>
        <p className="settings-help">
          Used on Stableford and stroke play days. Stroke index 1 is the hardest hole, where players
          get their first handicap shot.
        </p>
        {course.confirmed ? (
          <p className="info-box">Confirmed. Changes still save straight away.</p>
        ) : (
          <p className="warning-box">
            This is a placeholder par-72 card. Enter the real course, then press Confirm course card.
          </p>
        )}
        {problems.map((p) => (
          <p key={p} className="error-box">
            {p}
          </p>
        ))}

        <label className="field-label" htmlFor="course-name">
          Course name (optional)
        </label>
        <EditableText
          id="course-name"
          value={course.name ?? ''}
          placeholder="e.g. Kingsbarns"
          onSave={(name) => run(setCourseName, name)}
        />
      </section>

      <div className="course-table" role="table" aria-label="Par and stroke index by hole">
        <div className="course-row course-head" role="row">
          <span role="columnheader">Hole</span>
          <span role="columnheader">Par</span>
          <span role="columnheader">Stroke index</span>
        </div>
        {course.holes.map((hole, i) => (
          <div key={i} className={`course-row ${i === half ? 'is-back-nine' : ''}`} role="row">
            <span className="course-hole" role="cell">
              {i + 1}
            </span>
            <span role="cell">
              <select
                className="select-input"
                aria-label={`Hole ${i + 1} par`}
                value={hole.par}
                onChange={(e) => run(setCourseHole, i + 1, { par: Number(e.target.value) })}
              >
                {[3, 4, 5, 6].map((par) => (
                  <option key={par} value={par}>
                    {par}
                  </option>
                ))}
              </select>
            </span>
            <span role="cell">
              <select
                className={`select-input ${course.holes.filter((h) => h.si === hole.si).length > 1 ? 'is-duplicate' : ''}`}
                aria-label={`Hole ${i + 1} stroke index`}
                value={hole.si}
                onChange={(e) => run(setCourseHole, i + 1, { si: Number(e.target.value) })}
              >
                {course.holes.map((_, n) => (
                  <option key={n + 1} value={n + 1}>
                    {n + 1}
                  </option>
                ))}
              </select>
            </span>
          </div>
        ))}
        <p className="course-totals">
          Out {parTotal(0, half)} · In {parTotal(half)} · Par {parTotal(0)}
        </p>
      </div>

      {!course.confirmed && (
        <button type="button" className="button button-secondary" onClick={() => run(confirmCourse)}>
          Confirm course card
        </button>
      )}
    </div>
  )
}
