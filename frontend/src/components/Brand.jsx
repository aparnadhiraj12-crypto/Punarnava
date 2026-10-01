// components/Brand.jsx - wordmark + leaf glyph. Wrap in a <Link to="/"> where it
// should double as a home link (App.jsx does this for you where needed).
export default function Brand({ compact = false }) {
  return (
    <div className="brand">
      <svg className="brand-mark" viewBox="0 0 40 40" aria-hidden="true">
        <path d="M20 33C10 33 6 27 7 20 8 13 14 8 22 8c7 0 11 5 11 11 0 7-6 11-12 9-4-1-6-5-4-8 2-3 6-3 8-1" />
        <path d="M20 12c2-5 6-7 10-7-1 5-4 8-9 9" />
      </svg>
      {!compact && (
        <div>
          <div className="brand-name">PUNARNAVA</div>
          <div className="brand-note">care that continues</div>
        </div>
      )}
    </div>
  );
}
