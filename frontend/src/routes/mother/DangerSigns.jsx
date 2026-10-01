// /m/help - the same fixed content for everyone. No symptom input, no woman id
// sent, no assessment (guide 7.4 / section 8). Voice/icon-first: large text,
// large tap targets, and the safety-banner treatment from the redesign.
import { useEffect, useState, useCallback } from "react";
import AppShell from "../../components/AppShell";
import PageTitle from "../../components/PageTitle";
import Badge from "../../components/Badge";
import PixelArt from "../../components/PixelArt";
import { Loading, Unreachable } from "../../components/Page";
import { getDangerSigns } from "../../lib/api";

export default function DangerSigns() {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    getDangerSigns("en").then(setData).catch(() => setFailed(true));
  }, []);
  useEffect(load, [load]);

  return (
    <AppShell role="mother">
      <PageTitle eyebrow="Fixed safety guidance" title="Know when to seek help." copy="This list does not predict symptoms or provide a diagnosis." />

      {failed && <Unreachable onRetry={load} />}
      {!failed && !data && <Loading />}
      {data && (
        <>
          {data.fallback && <p className="section-note">Shown in English.</p>}

          <div className="safety-banner">
            <PixelArt kind="safety" />
            <div>
              <strong className="card-title">{data.action?.message}</strong>
            </div>
          </div>

          <section className="safety-grid">
            {data.guidance?.map((g, i) => (
              <article className="safety-card" key={g.id}>
                <div className="safety-icon">{i + 1}</div>
                <div className="card-title">
                  {g.text}
                  {g.verified === false && <Badge tone="ink">Draft</Badge>}
                </div>
                <span className="citation">{g.source_citation}</span>
              </article>
            ))}
          </section>

          <div className="urgent-note">If it feels serious, do not wait.</div>
        </>
      )}
    </AppShell>
  );
}
