// components/PixelArt.jsx - the flat-shape "pixel" illustrations from the redesign,
// ported verbatim from App.tsx's inline PixelArt so every screen keeps the same look.
const ART = {
  mother: <><path className="art-sage" d="M18 77h64v7H18zM27 70h47v7H27z" /><path className="art-terra" d="M41 34h19v8H41zM35 42h31v28H35z" /><path className="art-skin" d="M43 23h17v17H43z" /><path className="art-ink" d="M40 20h22v7H40zM36 25h8v16h-8z" /><path className="art-paper" d="M51 47h13v12H51z" /><path className="art-skin" d="M54 43h12v12H54z" /><path className="art-green" d="M23 53h8v22h-8zM18 58h5v5h-5zM69 49h7v26h-7zM76 54h5v6h-5z" /></>,
  worker: <><path className="art-sage" d="M20 76h60v8H20z" /><path className="art-green" d="M34 42h33v34H34z" /><path className="art-skin" d="M42 21h18v20H42z" /><path className="art-ink" d="M38 19h26v8H38zM37 24h7v15h-7z" /><path className="art-paper" d="M54 49h19v24H54z" /><path className="art-terra" d="M58 54h11v3H58zM58 61h11v3H58z" /></>,
  clinic: <><path className="art-sage" d="M13 75h74v9H13z" /><path className="art-paper" d="M23 31h55v44H23z" /><path className="art-terra" d="M19 25h63v8H19z" /><path className="art-green" d="M43 44h15v31H43zM31 42h8v10h-8zM62 42h8v10h-8z" /><path className="art-ink" d="M47 10h8v20h-8zM41 16h20v8H41z" /></>,
  journal: <><path className="art-sage" d="M20 73h62v9H20z" /><path className="art-terra" d="M26 18h47v58H26z" /><path className="art-paper" d="M34 18h39v58H34z" /><path className="art-ink" d="M30 18h7v58h-7zM43 31h21v4H43zM43 41h17v4H43z" /></>,
  wellness: <><path className="art-green" d="M47 68h8v16h-8zM27 62h20v8H27zM55 52h22v8H55zM35 43h12v19H35zM55 32h13v20H55z" /><path className="art-sage" d="M18 78h65v7H18z" /><path className="art-terra" d="M38 69h27v9H38z" /></>,
  safety: <><path className="art-terra" d="M50 12 79 24v23c0 19-11 31-29 39-18-8-29-20-29-39V24z" /><path className="art-paper" d="M45 31h10v35H45zM33 43h34v10H33z" /></>,
  success: <><path className="art-sage" d="M15 74h70v9H15z" /><path className="art-green" d="M24 24h53v53H24z" /><path className="art-paper" d="m34 50 9 10 24-26 6 7-30 31-16-16z" /></>,
  offline: <><path className="art-sage" d="M17 73h66v9H17z" /><path className="art-ink" d="M20 39h60v9H20zM29 51h42v9H29zM41 63h18v9H41z" /><path className="art-terra" d="m22 18 6-5 52 62-6 5z" /></>,
  empty: <><path className="art-sage" d="M15 75h70v8H15z" /><path className="art-paper" d="M26 31h48v44H26z" /><path className="art-green" d="M36 25h28v12H36z" /><path className="art-terra" d="M45 45h10v19H45zM40 50h20v9H40z" /></>,
};

export default function PixelArt({ kind = "mother", className = "" }) {
  const art = ART[kind] ?? ART.mother;
  return (
    <svg className={`pixel-art ${className}`} viewBox="0 0 100 100" aria-hidden="true" shapeRendering="crispEdges">
      {art}
    </svg>
  );
}
