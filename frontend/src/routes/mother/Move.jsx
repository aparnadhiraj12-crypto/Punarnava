import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import PageTitle from "../../components/PageTitle";
import Badge from "../../components/Badge";
import { Loading, Unreachable, EmptyState } from "../../components/Page";
import { getProviders, getWellnessContent } from "../../lib/api";

const STAGES = [
  { id: "trimester_1", label: "Trimester 1" },
  { id: "trimester_2", label: "Trimester 2" },
  { id: "trimester_3", label: "Trimester 3" },
  { id: "postpartum", label: "Postpartum" },
];

export default function Move() {
  const [stage, setStage] = useState("trimester_1");
  const [content, setContent] = useState(null);
  const [providers, setProviders] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setContent(null);
    setProviders(null);
    setFailed(false);

    Promise.all([
      getWellnessContent({ stage }),
      getProviders({ type: "movement" }),
    ])
      .then(([contentData, providerData]) => {
        setContent(contentData);
        setProviders(providerData);
      })
      .catch(() => setFailed(true));
  }, [stage]);

  const movementContent =
    content?.items?.filter(
      (item) =>
        item.type === "move" ||
        item.type === "movement" ||
        item.category === "move"
    ) ?? [];

  const providerList = providers?.providers ?? [];

  return (
    <AppShell role="mother">
      <PageTitle
        eyebrow="Move"
        title="Gentle movement, at your stage."
        copy="Explore movement guidance and available classes or providers."
      />

      <div className="tab-row" role="tablist" aria-label="Pregnancy stage">
        {STAGES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`tab-button ${stage === item.id ? "active" : ""}`}
            onClick={() => setStage(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="section-block">
        <h2 className="section-title">Movement guidance</h2>

        {failed && <Unreachable onRetry={() => setStage(stage)} />}
        {!failed && !content && <Loading />}

        {content && movementContent.length === 0 && (
          <EmptyState
            title="No movement guidance is available yet."
            note="Approved movement content will appear here when available."
          />
        )}

        {movementContent.length > 0 && (
          <div className="simple-list">
            {movementContent.map((item) => (
              <article key={item.id} className="paper-card">
                <div className="card-title">
                  {item.title || item.name || "Movement guidance"}
                </div>

                {item.description && <p>{item.description}</p>}

                {item.source && (
                  <p className="muted">
                    Source: {item.source}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="section-block">
        <h2 className="section-title">Classes & providers</h2>

        {!providers && !failed && <Loading />}

        {providers && providerList.length === 0 && (
          <EmptyState
            title="No movement providers are listed yet."
            note="Available classes and providers will appear here when they are added."
          />
        )}

        {providerList.length > 0 && (
          <ul className="provider-list">
            {providerList.map((provider) => (
              <li key={provider.id} className="provider-card">
                <div className="card-title">{provider.name}</div>

                <ul className="tag-row">
                  {provider.language && (
                    <li>
                      <Badge>{provider.language}</Badge>
                    </li>
                  )}
                  {provider.region && (
                    <li>
                      <Badge>{provider.region}</Badge>
                    </li>
                  )}
                </ul>

                {provider.contact && <p>{provider.contact}</p>}

                <p className="muted">
                  Check with your healthcare professional about what is
                  appropriate for you before starting a new activity.
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
