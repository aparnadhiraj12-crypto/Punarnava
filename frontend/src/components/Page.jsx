// components/Page.jsx - shared loading / offline / error states, styled with the
// redesign's .mini-state / .skeleton / .center-state classes so every screen that
// waits on the backend looks the same (guide section 8: never show a blank page).
import Icon from "./Icon";
import PixelArt from "./PixelArt";
import Button from "./Button";

export function Loading() {
  return (
    <div className="center-state" role="status">
      <div className="mini-state">
        <div className="skeleton wide" />
        <div className="skeleton" />
        <div className="skeleton short" />
        <strong>Loading…</strong>
      </div>
    </div>
  );
}

export function Unreachable({ onRetry }) {
  return (
    <div className="center-state" role="alert">
      <div className="mini-state error-state">
        <Icon name="shield" size={28} />
        <strong>We couldn't load this page.</strong>
        <small>Check that the backend is running, then try again.</small>
        {onRetry && (
          <div className="unreachable-actions">
            <Button tone="secondary" onClick={onRetry}>Try again</Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ title, note }) {
  return (
    <div className="mini-state">
      <PixelArt kind="empty" />
      <strong>{title}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}
