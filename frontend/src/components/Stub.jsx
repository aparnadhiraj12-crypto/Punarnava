// components/Stub.jsx - placeholder for screens intentionally left unbuilt
// (guide section 9: /m/family, /m/consent, /c/recall).
import { Link } from "react-router-dom";
import PixelArt from "./PixelArt";
import Button from "./Button";

export default function Stub({ title, note }) {
  return (
    <div className="center-state" style={{ minHeight: "100vh" }}>
      <div className="mini-state" style={{ maxWidth: 360 }}>
        <PixelArt kind="empty" />
        <small>Not built yet</small>
        <strong className="card-title">{title}</strong>
        {note && <small>{note}</small>}
        <Link to="/" style={{ marginTop: "1rem" }}>
          <Button tone="secondary">Back to start</Button>
        </Link>
      </div>
    </div>
  );
}
