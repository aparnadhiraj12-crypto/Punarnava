// components/PixelScene.jsx
// A hand-coded pixel-art backdrop (hills, sun, clouds, a house, a tree) built
// entirely from SVG rects on the app palette. Drops into any hero banner as
// a placeholder/base layer until real hand-painted illustrations are ready —
// see the setup guide for how to swap in actual artwork later.

export default function PixelScene({ className = "" }) {
  return (
    <svg
      className={`pixel-art w-full h-full ${className}`}
      viewBox="0 0 160 90"
      preserveAspectRatio="xMidYMax slice"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {/* sky */}
      <rect width="160" height="90" fill="#AFCBD0" />
      <rect width="160" height="90" y="0" fill="#B9CBAE" opacity="0.15" />

      {/* sun */}
      <rect x="128" y="10" width="14" height="14" fill="#E7C86B" />
      <rect x="124" y="14" width="4" height="4" fill="#E7C86B" />
      <rect x="142" y="14" width="4" height="4" fill="#E7C86B" />

      {/* clouds */}
      <g fill="#FFF9E9">
        <rect x="14" y="14" width="20" height="5" />
        <rect x="10" y="10" width="14" height="5" />
        <rect x="80" y="8" width="16" height="4" />
        <rect x="84" y="4" width="10" height="4" />
      </g>

      {/* far hills */}
      <path d="M0 58 L20 48 L40 58 L60 50 L80 58 L100 46 L120 58 L140 50 L160 58 L160 90 L0 90 Z" fill="#B9CBAE" />
      {/* near hills */}
      <path d="M0 70 L30 58 L55 68 L85 56 L115 68 L140 60 L160 68 L160 90 L0 90 Z" fill="#789878" />

      {/* ground */}
      <rect x="0" y="78" width="160" height="12" fill="#80644E" />

      {/* house */}
      <g>
        <rect x="18" y="60" width="28" height="18" fill="#FFF9E9" />
        <rect x="15" y="52" width="34" height="8" fill="#A86950" />
        <rect x="15" y="60" width="34" height="2" fill="#26352E" opacity="0.3" />
        <rect x="27" y="68" width="8" height="10" fill="#80644E" />
        <rect x="22" y="64" width="5" height="5" fill="#AFCBD0" />
        <rect x="38" y="64" width="5" height="5" fill="#AFCBD0" />
      </g>

      {/* tree */}
      <g>
        <rect x="118" y="66" width="4" height="12" fill="#80644E" />
        <rect x="108" y="52" width="24" height="16" fill="#789878" />
        <rect x="112" y="48" width="16" height="6" fill="#789878" />
      </g>

      {/* small plants */}
      <g fill="#789878">
        <rect x="60" y="74" width="3" height="4" />
        <rect x="66" y="76" width="3" height="3" />
        <rect x="72" y="73" width="3" height="5" />
      </g>
    </svg>
  );
}