import AppShell from "../../../components/AppShell";
import PageTitle from "../../../components/PageTitle";

export default function Mind() {
  return (
    <AppShell role="mother">
      <PageTitle
        eyebrow="Mind"
        title="A little space for you."
        copy="Private reflection and places to find human support when you want it."
      />

      <div className="simple-list">
        <a className="paper-card" href="/m/journal">
          <div className="card-title">Private journal</div>
          <p>
            Write what you are feeling, thinking, or noticing. Your journal is
            private by default.
          </p>
        </a>

        <a className="paper-card" href="/m/mind/support">
          <div className="card-title">Find support</div>
          <p>
            Browse available counsellors and support contacts. A human is
            always available when you need one.
          </p>
        </a>
      </div>

      <div className="section-block">
        <h2 className="section-heading">Need help right now?</h2>
        <p className="muted">
          If you feel unsafe or need urgent support, contact your local
          emergency service or a trusted person.
        </p>
      </div>
    </AppShell>
  );
}
