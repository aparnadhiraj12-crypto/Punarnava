// /m/help - the same fixed content for everyone. No symptom input, no woman id
// sent, no assessment (guide 7.4 / section 8).
import { useEffect, useState, useCallback } from "react";
import Page, { Loading, Unreachable } from "../../components/Page";
import { getDangerSigns } from "../../lib/api";
import { getSession } from "../../lib/session";

export default function DangerSigns() {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const { role, linkedId } = getSession();
  const back = role === "mother" && linkedId ? `/m/${linkedId}` : "/m";

  const load = useCallback(() => {
    setFailed(false);
    getDangerSigns("en").then(setData).catch(() => setFailed(true));
  }, []);
  useEffect(load, [load]);

  return (
    <Page title="Not feeling well?" back={back} backLabel="Back to my timeline">
      {failed && <Unreachable onRetry={load} />}
      {!failed && !data && <Loading />}
      {data && (
        <div className="space-y-4">
          {data.fallback && <p className="text-sm text-earth">Shown in English.</p>}

          <div className="pixel-card-overdue">
            <p className="text-2xl leading-snug text-ink font-display">{data.action?.message}</p>
          </div>

          <ul className="space-y-3">
            {data.guidance?.map((g) => (
              <li key={g.id} className="pixel-card">
                <p className="text-lg text-ink">
                  {g.text}
                  {g.verified === false && (
                    <span className="ml-2 align-middle text-xs border-2 border-earth text-earth px-1.5 py-0.5">Draft</span>
                  )}
                </p>
                <p className="text-xs text-earth mt-1">{g.source_citation}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Page>
  );
}
