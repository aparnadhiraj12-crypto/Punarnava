// components/Badge.jsx - status pairs an icon or colour with a text label, never
// colour alone (NFR-13). tone: sage | terra | mustard | ink.
export default function Badge({ children, tone = "sage" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
