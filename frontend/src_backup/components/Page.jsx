// components/Page.jsx - shared shell so every screen has the same frame,
// a way back, and consistent loading / unreachable states.
import { Link } from "react-router-dom";

export default function Page({ title, back = "/", backLabel = "Back", children }) {
  return (
    <div className="min-h-screen bg-paper pixel-dither">
      <main className="mx-auto max-w-xl px-4 pt-5 pb-12">
        <Link to={back} className="text-sm text-earth underline">{backLabel}</Link>
        <h1 className="text-2xl text-forest mt-2 mb-4">{title}</h1>
        {children}
      </main>
    </div>
  );
}

export function Loading({ label = "Loading..." }) {
  return <p className="pixel-card text-earth" role="status">{label}</p>;
}

export function Unreachable({ onRetry }) {
  return (
    <div className="pixel-card-overdue" role="alert">
      <p className="text-ink">Can't reach the server. Check that the backend is running, then try again.</p>
      {onRetry && <button className="pixel-btn-secondary mt-3" onClick={onRetry}>Try again</button>}
    </div>
  );
}
