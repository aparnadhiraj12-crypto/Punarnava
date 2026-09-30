// components/AppShell.jsx - the sidebar + bottom-nav frame from the redesign,
// wired to real routes instead of the design file's in-memory screen switcher.
import { Link, useLocation } from "react-router-dom";
import Icon from "./Icon";
import Brand from "./Brand";
import { getSession, clearSession } from "../lib/session";

const motherNav = (linkedId) => [
  { to: linkedId ? `/m/${linkedId}` : "/m", label: "Journey", icon: "journey", match: (p) => p === "/m" || (p.startsWith("/m/") && !["/m/wellness", "/m/journal", "/m/help", "/m/enrol"].some((x) => p.startsWith(x))) },
  { to: "/m/wellness", label: "Wellness", icon: "heart", match: (p) => p.startsWith("/m/wellness") },
  { to: "/m/journal", label: "Journal", icon: "journal", match: (p) => p.startsWith("/m/journal") },
  { to: "/m/help", label: "Safety", icon: "shield", match: (p) => p.startsWith("/m/help") },
];
const ashaNav = [
  { to: "/a", label: "Queue", icon: "people", match: (p) => p === "/a" },
  { to: "/m/enrol", label: "Mothers", icon: "plus", match: (p) => p.startsWith("/m/enrol") },
];

export default function AppShell({ role, children }) {
  const { pathname } = useLocation();
  const { name } = getSession();
  const nav = role === "asha" ? ashaNav : motherNav(getSession().linkedId);
  const roleLabel = role === "asha" ? "ASHA space" : "Mother space";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/" className="brand-link"><Brand /></Link>
        <div className="role-label">{roleLabel}</div>
        <nav>
          {nav.map((item) => (
            <Link key={item.to} to={item.to} className={item.match(pathname) ? "active" : ""}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link to="/"><Icon name="home" /><span>Home</span></Link>
          <button onClick={() => { clearSession(); window.location.href = "/"; }}>
            <Icon name="user" /><span>{name ? `Log out (${name})` : "Log out"}</span>
          </button>
        </div>
      </aside>
      <div className="main-column">
        <header className="mobile-header">
          <Link to="/" className="brand-link"><Brand compact /></Link>
          <Link to="/" className="avatar">{name?.[0]?.toUpperCase() ?? "•"}</Link>
        </header>
        <main className="content">{children}</main>
        <nav className="bottom-nav">
          {nav.map((item) => (
            <Link key={item.to} to={item.to} className={item.match(pathname) ? "active" : ""}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
