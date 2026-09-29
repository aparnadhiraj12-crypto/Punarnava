// /m/wellness - diet, exercise, find a professional (guide 7.2).
// Matched by stage and region ONLY. No woman id, no condition-based "recommended for you".
// Clinical text and citations come straight from the backend.
import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import Page, { Loading, Unreachable } from "../../components/Page";
import { getWellnessContent, getProviders } from "../../lib/api";
import { getSession } from "../../lib/session";

const STAGES = [
  ["", "All stages"],
  ["postpartum_early", "Early postpartum"],
  ["postpartum_six_week", "Around six weeks"],
];
const CONTENT_REGIONS = [["", "All regions"], ["general", "General"], ["kerala", "Kerala"], ["punjab", "Punjab"]];
const PRO_TYPES = [["", "Any type"], ["yoga", "Yoga"], ["dietitian", "Dietitian"], ["psychiatrist", "Psychiatrist"], ["counsellor", "Counsellor"]];
const PRO_LANGS = [["", "Any language"], ["en", "English"], ["te", "Telugu"], ["ml", "Malayalam"], ["pa", "Punjabi"]];
const PRO_REGIONS = [["", "Any region"], ["general", "General"], ["andhra_pradesh", "Andhra Pradesh"], ["kerala", "Kerala"], ["punjab", "Punjab"]];

function Select({ label, value, onChange, options }) {
  return (
    <label className="block flex-1 min-w-[8rem]">
      <span className="text-xs text-earth">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
              className="mt-1 w-full border-2 border-ink/60 bg-paper px-2 py-2">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

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

export default function Wellness() {
  const { hash } = useLocation();
  const { role, linkedId } = getSession();
  const back = role === "mother" && linkedId ? `/m/${linkedId}` : "/m";

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

  const Cards = ({ list, empty }) =>
    list.length === 0 ? <p className="text-earth">{empty}</p> : (
      <ul className="space-y-3">
        {list.map((i) => (
          <li key={i.id} className="pixel-card">
            <h3 className="text-lg text-forest">{i.title}</h3>
            <p className="text-ink mt-1">{i.body}</p>
            <p className="text-xs text-earth mt-2">{i.source_citation}</p>
          </li>
        ))}
      </ul>
    );

  return (
    <Page title="Wellness" back={back} backLabel="Back to my timeline">
      <div className="pixel-card flex gap-3 flex-wrap">
        <Select label="Stage" value={stage} onChange={setStage} options={STAGES} />
        <Select label="Region" value={region} onChange={setRegion} options={CONTENT_REGIONS} />
      </div>

      {content.failed && <div className="mt-4"><Unreachable onRetry={content.retry} /></div>}
      {!content.failed && !content.data && <div className="mt-4"><Loading /></div>}
      {content.data && (
        <>
          <h2 className="text-xl text-forest mt-6 mb-2">Diet</h2>
          <Cards list={diet} empty="No diet tips for this choice yet. Try another stage or region." />
          <h2 className="text-xl text-forest mt-6 mb-2">Exercise</h2>
          <Cards list={exercise} empty="No exercise tips for this choice yet. Try another stage or region." />
        </>
      )}

      <h2 id="providers" className="text-xl text-forest mt-8 mb-1 scroll-mt-4">Find a professional</h2>
      <p className="text-sm text-earth mb-3">Sample directory. These are example entries, not real clinicians.</p>
      <div className="pixel-card flex gap-3 flex-wrap">
        <Select label="Type" value={pType} onChange={setPType} options={PRO_TYPES} />
        <Select label="Language" value={pLang} onChange={setPLang} options={PRO_LANGS} />
        <Select label="Region" value={pRegion} onChange={setPRegion} options={PRO_REGIONS} />
      </div>

      <div className="mt-3">
        {pros.failed && <Unreachable onRetry={pros.retry} />}
        {!pros.failed && !pros.data && <Loading />}
        {pros.data && (pros.data.providers?.length ? (
          <ul className="space-y-3">
            {pros.data.providers.map((p) => (
              <li key={p.id} className="pixel-card">
                <p className="text-lg text-ink">{p.name}</p>
                <p className="text-sm text-earth">{p.type} · {p.language} · {p.region}</p>
                <p className="text-sm text-ink mt-1">{p.contact}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-earth">No one matches these filters yet. Try widening the language or region.</p>
        ))}
      </div>
    </Page>
  );
}
