// components/PixelIcon.jsx
// Custom pixel-art icon system: each icon is an 8x8 grid of on/off cells,
// rendered as crisp SVG rects (no external icon packs, no smooth vectors).
// Add new icons by adding an 8-row pattern of "#" (filled) / "." (empty).

const GRID = 8;

const PATTERNS = {
  check: [
    "........",
    "........",
    "......#.",
    ".....##.",
    "....##..",
    "##.##...",
    ".###....",
    "..#.....",
  ],
  clock: [
    "..####..",
    ".#....#.",
    "#..##..#",
    "#..#...#",
    "#..#...#",
    "#......#",
    ".#....#.",
    "..####..",
  ],
  overdue: [ // exclamation mark, "needs attention"
    "...##...",
    "...##...",
    "...##...",
    "...##...",
    "...##...",
    "........",
    "...##...",
    "...##...",
  ],
  upcoming: [ // arrow pointing up
    "...##...",
    "..####..",
    ".######.",
    "...##...",
    "...##...",
    "...##...",
    "...##...",
    "........",
  ],
  risk: [ // heart, used for risk flags
    "........",
    ".##..##.",
    "########",
    "########",
    ".######.",
    "..####..",
    "...##...",
    "........",
  ],
  home: [
    "...##...",
    "..####..",
    ".######.",
    "########",
    "##....##",
    "##.##.##",
    "##.##.##",
    "########",
  ],
  calendar: [
    "########",
    "#.#..#.#",
    "########",
    "#......#",
    "#.##.#.#",
    "#......#",
    "#.#..#.#",
    "########",
  ],
  mother: [ // simple seated figure with baby, for avatars/empty states
    "..####..",
    ".######.",
    "..####..",
    ".#####..",
    "#######.",
    "##.##.#.",
    "##.##...",
    "########",
  ],
};

export default function PixelIcon({ name, size = 18, className = "" }) {
  const pattern = PATTERNS[name];
  if (!pattern) return null;
  return (
    <svg
      className={`pixel-art ${className}`}
      width={size}
      height={size}
      viewBox={`0 0 ${GRID} ${GRID}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {pattern.map((row, y) =>
        row.split("").map((cell, x) =>
          cell === "#" ? (
            <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />
          ) : null
        )
      )}
    </svg>
  );
}