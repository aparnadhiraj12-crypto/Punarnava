// /m/wellness - diet, exercise, find a professional (guide 7.2). Matched by stage
// and region ONLY - no woman id, no "recommended for your condition". Clinical
// text and citations come straight from the backend.
import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import AppShell from "../../components/AppShell";
import PageTitle from "../../components/PageTitle";
import Badge from "../../components/Badge";
import { SelectField } from "../../components/Field";
import PixelArt from "../../components/PixelArt";
import { Loading, Unreachable, EmptyState } from "../../components/Page";
import { getWellnessContent, getProviders } from "../../lib/api";

const STAGES = [["", "All stages"], ["postpartum_early", "Early postpartum"], ["postpartum_six_week", "Around six weeks"]];
const CONTENT_REGIONS = [["", "All regions"], ["general", "General"], ["kerala", "Kerala"], ["punjab", "Punjab"]];
const PRO_TYPES = [["", "Any type"], ["yoga", "Yoga"], ["dietitian", "Dietitian"], ["psychiatrist", "Psychiatrist"], ["counsellor", "Counsellor"]];
const PRO_LANGS = [["", "Any language"], ["en", "English"], ["te", "Telugu"], ["ml", "Malayalam"], ["pa", "Punjabi"]];
const PRO_REGIONS = [["", "Any region"], ["general", "General"], ["andhra_pradesh", "Andhra Pradesh"], ["kerala", "Kerala"], ["punjab", "Punjab"]];

function useFetch(fn, deps) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const run = useCallback(() => {
    setFailed(false);
    setData(null);
    fn().then(setData).catch(() => setFailed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(run, [run]);
  return { data, failed, retry: run };
}

function ContentCards({ list, empty }) {
  if (list.length === 0) return <EmptyState title={empty} />;
  return (
    <ul className="entry-list">
      {list.map((i) => (
        <li key={i.id} className="paper-card">
          <div className="card-title">{i.title}</div>
          <p>{i.body}</p>
          <span className="citation">{i.source_citation}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Wellness() {
  const { hash } = useLocation();
  const [stage, setStage] = useState("");
  const [region, setRegion] = useState("");
  const [pType, setPType] = useState("");
  const [pLang, setPLang] = useState("");
  const [pRegion, setPRegion] = useState("");

  const content = useFetch(() => getWellnessContent({ stage, region }), [stage, region]);
  const pros = useFetch(() => getProviders({ type: pType, language: pLang, region: pRegion }), [pType, pLang, pRegion]);

  // Deep link from the journal: /m/wellness#providers
  useEffect(() => {
    if (hash === "#providers") document.getElementById("providers")?.scrollIntoView();
  }, [hash, pros.data]);

  const items = content.data?.content ?? [];
  const diet = items.filter((i) => i.type === "diet");
  const exercise = items.filter((i) => i.type === "exercise");

  return (
    <AppShell role="mother">
      <PageTitle eyebrow="Wellness library" title="Care for yourself, too." copy="Gentle, reliable information for this stage of your journey." />

      <div className="filter-row">
        <SelectField label="Stage" value={stage} onChange={(e) => setStage(e.target.value)} options={STAGES} />
        <SelectField label="Region" value={region} onChange={(e) => setRegion(e.target.value)} options={CONTENT_REGIONS} />
      </div>

      {content.failed && <Unreachable onRetry={content.retry} />}
      {!content.failed && !content.data && <Loading />}
      {content.data && (
        <>
          <h2 className="section-title">Diet</h2>
          <ContentCards list={diet} empty="No diet tips for this choice yet. Try another stage or region." />
          <h2 className="section-title">Exercise</h2>
          <ContentCards list={exercise} empty="No exercise tips for this choice yet. Try another stage or region." />
        </>
      )}

      <h2 id="providers" className="section-title">Find a professional</h2>
      <p className="section-note">Sample directory — these are example entries, not real clinicians.</p>
      <div className="filter-row">
        <SelectField label="Type" value={pType} onChange={(e) => setPType(e.target.value)} options={PRO_TYPES} />
        <SelectField label="Language" value={pLang} onChange={(e) => setPLang(e.target.value)} options={PRO_LANGS} />
        <SelectField label="Region" value={pRegion} onChange={(e) => setPRegion(e.target.value)} options={PRO_REGIONS} />
      </div>

      {pros.failed && <Unreachable onRetry={pros.retry} />}
      {!pros.failed && !pros.data && <Loading />}
      {pros.data && (pros.data.providers?.length ? (
        <ul className="provider-list">
          {pros.data.providers.map((p) => (
            <li key={p.id} className="provider-card">
              <div className="card-title">{p.name}</div>
              <ul className="tag-row">
                <li><Badge>{p.type}</Badge></li>
                <li><Badge tone="mustard">{p.language}</Badge></li>
                <li><Badge>{p.region}</Badge></li>
              </ul>
              <p>{p.contact}</p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No one matches these filters yet." note="Try widening the language or region." />
      ))}
    </AppShell>
  );
}
