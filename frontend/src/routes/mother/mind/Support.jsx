import { useEffect, useState } from "react";
import AppShell from "../../../components/AppShell";
import PageTitle from "../../../components/PageTitle";
import Badge from "../../../components/Badge";
import { Loading, Unreachable, EmptyState } from "../../../components/Page";
import { getProviders } from "../../../lib/api";

export default function Support() {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  const load = () => {
    setData(null);
    setFailed(false);

    getProviders({ type: "counsellor" })
      .then(setData)
      .catch(() => setFailed(true));
  };

  useEffect(() => {
    load();
  }, []);

  const providers = data?.providers ?? [];

  return (
    <AppShell role="mother">
      <PageTitle
        eyebrow="Support"
        title="You don't have to carry it alone."
        copy="Find human support from the available directory."
      />

      <div className="paper-card">
        <div className="card-title">Always-visible support</div>
        <p>
          If you need immediate help, contact your local emergency service or
          a trusted person near you.
        </p>
      </div>

      <h2 className="section-title">Counsellors</h2>

      {failed && <Unreachable onRetry={load} />}
      {!failed && !data && <Loading />}

      {data && providers.length === 0 && (
        <EmptyState
          title="No counsellors are listed yet."
          note="The verified support directory will appear here when available."
        />
      )}

      {providers.length > 0 && (
        <ul className="provider-list">
          {providers.map((provider) => (
            <li key={provider.id} className="provider-card">
              <div className="card-title">{provider.name}</div>

              <ul className="tag-row">
                {provider.language && <li><Badge>{provider.language}</Badge></li>}
                {provider.region && <li><Badge>{provider.region}</Badge></li>}
              </ul>

              {provider.contact && <p>{provider.contact}</p>}
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
