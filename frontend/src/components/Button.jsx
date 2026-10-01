// components/Button.jsx - the four button tones from the redesign.
export default function Button({ children, tone = "primary", className = "", ...rest }) {
  return (
    <button className={`button button-${tone} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}
