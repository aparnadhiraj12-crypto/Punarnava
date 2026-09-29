import { Link } from "react-router-dom";

export default function Stub({ title, note }) {
  return (
    <div className="min-h-screen bg-paper pixel-dither flex flex-col items-center justify-center px-6 text-center">
      <div className="pixel-card max-w-xs">
        <p className="text-sm text-earth">Not built yet</p>
        <h1 className="text-xl text-forest mt-1">{title}</h1>
        {note && <p className="text-sm text-ink/80 mt-2">{note}</p>}
        <Link to="/" className="pixel-btn-secondary mt-5">Back to start</Link>
      </div>
    </div>
  );
}
