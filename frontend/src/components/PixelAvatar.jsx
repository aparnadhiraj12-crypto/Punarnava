// components/PixelAvatar.jsx
const PALETTE = ["#C98262", "#B9CBAE", "#E7C86B", "#AFCBD0", "#A86950"];

function colorFor(name) {
  const i = name.charCodeAt(0) % PALETTE.length;
  return PALETTE[i];
}

export default function PixelAvatar({ name, size = 44 }) {
  const initial = name?.[0]?.toUpperCase() ?? "?";
  return (
    <div
      className="pixel-frame flex items-center justify-center font-display font-semibold text-cream border-2 border-ink shrink-0"
      style={{ width: size, height: size, background: colorFor(name || "?"), "--notch": "5px" }}
    >
      {initial}
    </div>
  );
}