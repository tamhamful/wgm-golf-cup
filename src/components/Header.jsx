export default function Header({ statusLabel, currentPlayer, onChangePlayer }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand" aria-label="WGM Golf Cup">
          <span className="brand-mark">WGM</span>
          <span className="brand-title">Golf Cup</span>
        </div>
        {statusLabel && <span className="tournament-status">{statusLabel}</span>}
      </div>
      {currentPlayer && (
        <div className="userbar">
          <span>
            Viewing as <strong>{currentPlayer.name}</strong>
          </span>
          <button type="button" className="link-button" onClick={onChangePlayer}>
            Not you?
          </button>
        </div>
      )}
    </header>
  )
}
