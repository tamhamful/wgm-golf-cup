export default function Header({ statusLabel }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand" aria-label="WGM Golf Cup">
          <span className="brand-mark">WGM</span>
          <span className="brand-title">Golf Cup</span>
        </div>
        <span className="tournament-status">{statusLabel}</span>
      </div>
    </header>
  )
}
