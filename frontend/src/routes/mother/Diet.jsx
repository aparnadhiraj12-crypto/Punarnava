import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/AppShell";
import PageTitle from "../../components/PageTitle";
import Badge from "../../components/Badge";
import { Loading, Unreachable, EmptyState } from "../../components/Page";
import { getWellnessContent } from "../../lib/api";

const STAGES = [
  ["trimester_1", "Trimester 1"],
  ["trimester_2", "Trimester 2"],
  ["trimester_3", "Trimester 3"],
  ["postpartum", "Postpartum"],
];

const TABS = [
  ["can_have", "Can have"],
  ["limit", "Limit"],
  ["avoid", "Avoid"],
];

export default function Diet() {
  const [stage, setStage] = useState("postpartum");
  const [tab, setTab] = useState("can_have");
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setData(null);
    setFailed(false);

    getWellnessContent({ stage })
      .then(setData)
      .catch(() => setFailed(true));
  }, [stage]);

  const dietItems = useMemo(() => {
    const items = data?.content ?? [];
    return items.filter((item) => item.type === "diet");
  }, [data]);

  const grouped = useMemo(() => {
    const result = {
      can_have: [],
      limit: [],
      avoid: [],
    };

    dietItems.forEach((item) => {
      const category = item.category || item.diet_category;

      if (category === "can_have") result.can_have.push(item);
      if (category === "limit") result.limit.push(item);
      if (category === "avoid") result.avoid.push(item);
    });

    return result;
  }, [dietItems]);

  const visibleItems = grouped[tab] ?? [];

  return (
    <AppShell role="mother">
      <PageTitle
        eyebrow="Nutrition"
        title="Food for your stage."
        copy="Simple guidance from the approved wellness library. Your choices stay yours."
      />

      <div className="filter-row">
        {STAGES.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={stage === value ? "button-primary" : "button-secondary"}
            onClick={() => setStage(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="filter-row">
        {TABS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={tab === value ? "button-primary" : "button-secondary"}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {failed && <Unreachable onRetry={() => setStage(stage)} />}

      {!failed && !data && <Loading />}

      {data && visibleItems.length === 0 && (
        <EmptyState
          title="Nothing here yet."
          note="This category does not have approved content for this stage yet."
        />
      )}

      {data && visibleItems.length > 0 && (
        <ul className="entry-list">
          {visibleItems.map((item) => (
            <li key={item.id} className="paper-card">
              <div className="card-title">{item.title}</div>

              {item.category && (
                <Badge>{item.category.replaceAll("_", " ")}</Badge>
              )}

              <p>{item.body}</p>

              {item.source_citation && (
                <span className="citation">{item.source_citation}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
