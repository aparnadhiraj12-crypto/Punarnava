// components/Avatar.jsx - round initial avatar, used on the ASHA queue and the
// mother header. Colour is decorative only; the name is always shown alongside.
const PALETTE = ["#c96d57", "#a8c5b5", "#d4b86a", "#245e4a", "#e6a18d"];

function colorFor(name) {
  const i = (name?.charCodeAt(0) ?? 0) % PALETTE.length;
  return PALETTE[i];
}

export default function Avatar({ name, size = 42 }) {
  const initial = name?.[0]?.toUpperCase() ?? "?";
  return (
    <div
      className="avatar"
      style={{ width: size, height: size, background: colorFor(name || "?"), color: "#fff9ed", flex: "0 0 auto" }}
    >
      {initial}
    </div>
  );
}
