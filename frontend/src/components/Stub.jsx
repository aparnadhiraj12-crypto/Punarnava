import { Link } from "react-router-dom";

export default function Stub({ title, note }) {
  return (
    <div className="min-h-screen bg-clay-50 flex flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-wide text-clay-500">Not built yet</p>
      <h1 className="text-xl font-semibold text-plum-700 mt-1">{title}</h1>
      {note && <p className="text-sm text-clay-700 mt-2 max-w-xs">{note}</p>}
      <Link to="/" className="text-sm text-plum-500 underline mt-6">Back to start</Link>
    </div>
  );
}
