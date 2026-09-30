// components/PageTitle.jsx - the eyebrow + display heading + optional copy/action
// pattern used at the top of every screen in the redesign.
export default function PageTitle({ eyebrow, title, copy, action }) {
  return (
    <header className="page-title">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <div className="display display-md">{title}</div>
        {copy && <p>{copy}</p>}
      </div>
      {action}
    </header>
  );
}
