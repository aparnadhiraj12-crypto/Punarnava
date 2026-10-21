import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/AppShell";
import PageTitle from "../../components/PageTitle";
import Badge from "../../components/Badge";
import { Loading, Unreachable, EmptyState } from "../../components/Page";
import { getWellnessContent, getPersonalizedDietContent, getDietProfile, saveDietProfile } from "../../lib/api";
import { getSession } from "../../lib/session";

const STAGES = [
  ["pregnancy_t1", "Trimester 1"],
  ["pregnancy_t2", "Trimester 2"],
  ["pregnancy_t3", "Trimester 3"],
  ["postpartum_early", "Early postpartum"],
];

const CONDITION_BADGE_MAP = {
  gdm: { label: "GDM-Safe", color: "#4CAF50" },
  nausea: { label: "Nausea-Friendly", color: "#FF9800" },
  low_weight: { label: "High-Calorie", color: "#2196F3" },
  sickness: { label: "Easy on Stomach", color: "#9C27B0" },
};

function ConditionBadge({ tag }) {
  const info = CONDITION_BADGE_MAP[tag];
  if (!info) return null;
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 700,
      background: info.color + "22",
      color: info.color,
      border: `1px solid ${info.color}44`,
      marginRight: 4,
      marginBottom: 4,
    }}>
      {info.label}
    </span>
  );
}

function DietCard({ item }) {
  return (
    <li className="paper-card" style={{ marginBottom: 12 }}>
      <div className="card-title">{item.title}</div>
      {(item.condition_tags || []).map((tag) => (
        <ConditionBadge key={tag} tag={tag} />
      ))}
      <p style={{ marginTop: 8 }}>{item.body}</p>
      {item.avoid_notes && (
        <p style={{ marginTop: 6, fontSize: 13, color: "#c0392b", borderLeft: "3px solid #c0392b", paddingLeft: 8 }}>
          ⚠ {item.avoid_notes}
        </p>
      )}
      {item.nutrients && Object.values(item.nutrients).some(Boolean) && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8, fontSize: 12, color: "#666" }}>
          {item.nutrients.calories && <span>🔥 {item.nutrients.calories} kcal</span>}
          {item.nutrients.protein_g && <span>💪 {item.nutrients.protein_g}g protein</span>}
          {item.nutrients.iron_mg && <span>🩸 {item.nutrients.iron_mg}mg iron</span>}
          {item.nutrients.calcium_mg && <span>🦴 {item.nutrients.calcium_mg}mg calcium</span>}
        </div>
      )}
      {item.source_citation && (
        <span className="citation">{item.source_citation}</span>
      )}
    </li>
  );
}

function ProfileForm({ profile, onSave, onCancel }) {
  const [form, setForm] = useState({
    weight_kg: profile?.weight_kg ?? "",
    nausea_level: profile?.nausea_level ?? "none",
    current_sickness: profile?.current_sickness ?? "none",
    has_gdm: profile?.has_gdm ?? false,
    is_vegetarian: profile?.is_vegetarian ?? false,
    is_vegan: profile?.is_vegan ?? false,
    food_dislikes: (profile?.food_dislikes ?? []).join(", "),
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        ...form,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        food_dislikes: form.food_dislikes ? form.food_dislikes.split(",").map((s) => s.trim()).filter(Boolean) : [],
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="paper-card" style={{ marginBottom: 16 }}>
      <div className="card-title" style={{ marginBottom: 12 }}>Your diet profile</div>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
        Tell us about yourself so we can show you the most relevant guidance.
        This stays on your device and is never shared with anyone.
      </p>

      <label style={{ display: "block", marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Your current weight (kg)</span>
        <input
          type="number"
          min="30" max="150"
          value={form.weight_kg}
          onChange={(e) => set("weight_kg", e.target.value)}
          placeholder="e.g. 52"
          style={{ display: "block", width: "100%", marginTop: 4, padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 15, boxSizing: "border-box" }}
        />
      </label>

      <label style={{ display: "block", marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Nausea level right now</span>
        <select
          value={form.nausea_level}
          onChange={(e) => set("nausea_level", e.target.value)}
          style={{ display: "block", width: "100%", marginTop: 4, padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 15 }}
        >
          <option value="none">None</option>
          <option value="mild">Mild — comes and goes</option>
          <option value="severe">Severe — hard to eat</option>
        </select>
      </label>

      <label style={{ display: "block", marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Are you unwell right now?</span>
        <select
          value={form.current_sickness}
          onChange={(e) => set("current_sickness", e.target.value)}
          style={{ display: "block", width: "100%", marginTop: 4, padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 15 }}
        >
          <option value="none">No, I'm fine</option>
          <option value="cold">Cold / cough</option>
          <option value="fever">Fever</option>
          <option value="vomiting">Vomiting</option>
        </select>
      </label>

      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Food preferences</span>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 14 }}>
          <input type="checkbox" checked={form.is_vegetarian} onChange={(e) => set("is_vegetarian", e.target.checked)} />
          Vegetarian
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 14 }}>
          <input type="checkbox" checked={form.is_vegan} onChange={(e) => set("is_vegan", e.target.checked)} />
          Vegan
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 14 }}>
          <input type="checkbox" checked={form.has_gdm} onChange={(e) => set("has_gdm", e.target.checked)} />
          I have gestational diabetes (GDM)
        </label>
      </div>

      <label style={{ display: "block", marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Foods you dislike or avoid (optional)</span>
        <input
          type="text"
          value={form.food_dislikes}
          onChange={(e) => set("food_dislikes", e.target.value)}
          placeholder="e.g. fish, eggs, bitter gourd"
          style={{ display: "block", width: "100%", marginTop: 4, padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 15, boxSizing: "border-box" }}
        />
      </label>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          className="button button-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ flex: 1 }}
        >
          {saving ? "Saving…" : "Save my profile"}
        </button>
        <button type="button" className="button button-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function Diet() {
  const { linkedId } = getSession();
  const [stage, setStage] = useState("pregnancy_t1");
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);

  // Load diet profile on mount
  useEffect(() => {
    if (!linkedId) {
      setProfileLoaded(true);
      return;
    }
    getDietProfile(linkedId)
      .then((res) => {
        setProfile(res.profile);
        setProfileLoaded(true);
      })
      .catch(() => setProfileLoaded(true));
  }, [linkedId]);

  // Load diet content when stage or profile changes
  useEffect(() => {
    if (!profileLoaded) return;
    setData(null);
    setFailed(false);
    if (linkedId) {
      getPersonalizedDietContent({ womanId: linkedId, stage })
        .then(setData)
        .catch(() => {
          // Fall back to non-personalized
          getWellnessContent({ stage })
            .then((res) => setData({ content: res.content, for_you: [], active_conditions: [], profile: null }))
            .catch(() => setFailed(true));
        });
    } else {
      getWellnessContent({ stage })
        .then((res) => setData({ content: res.content, for_you: [], active_conditions: [], profile: null }))
        .catch(() => setFailed(true));
    }
  }, [stage, profileLoaded, linkedId]);

  async function handleSaveProfile(formData) {
    await saveDietProfile(linkedId, { woman_id: linkedId, ...formData });
    const res = await getDietProfile(linkedId);
    setProfile(res.profile);
    setShowProfileForm(false);
    // Reload content with new profile
    setData(null);
    getPersonalizedDietContent({ womanId: linkedId, stage })
      .then(setData)
      .catch(() => setFailed(true));
  }

  const dietItems = useMemo(() => {
    const items = data?.content ?? [];
    return items.filter((item) => item.type === "diet");
  }, [data]);

  const forYouItems = useMemo(() => {
    return (data?.for_you ?? []).filter((item) => item.type === "diet");
  }, [data]);

  const activeConditions = data?.active_conditions ?? [];

  const hasProfile = Boolean(
    profile?.weight_kg ||
    profile?.has_gdm ||
    (profile?.nausea_level && profile.nausea_level !== "none") ||
    (profile?.current_sickness && profile.current_sickness !== "none")
  );

  return (
    <AppShell role="mother">
      <PageTitle
        eyebrow="Nutrition"
        title="Food for your stage."
        copy="Guidance from the wellness library, filtered to what matters for you."
      />

      {/* Personalize card */}
      {!showProfileForm && (
        <div style={{
          background: hasProfile ? "#f0f7ff" : "#fff8e1",
          border: `1px solid ${hasProfile ? "#bbdefb" : "#ffe082"}`,
          borderRadius: 12,
          padding: "12px 16px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {hasProfile ? "✅ Your diet profile is set" : "✨ Personalise your diet plan"}
            </div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
              {hasProfile
                ? `Showing: ${activeConditions.map((c) => CONDITION_BADGE_MAP[c]?.label || c).join(", ") || "general guidance"}`
                : "Tell us about your weight, nausea, and preferences to see a tailored plan."}
            </div>
          </div>
          <button
            type="button"
            className="button button-secondary"
            style={{ flexShrink: 0, fontSize: 13 }}
            onClick={() => setShowProfileForm(true)}
          >
            {hasProfile ? "Edit" : "Set up"}
          </button>
        </div>
      )}

      {showProfileForm && (
        <ProfileForm
          profile={profile}
          onSave={handleSaveProfile}
          onCancel={() => setShowProfileForm(false)}
        />
      )}

      {/* Stage tabs */}
      <div className="filter-row">
        {STAGES.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`button ${stage === value ? "button-primary" : "button-secondary"}`}
            onClick={() => setStage(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {failed && <Unreachable onRetry={() => setStage(stage)} />}
      {!failed && !data && <Loading />}

      {/* For You section */}
      {data && forYouItems.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: "#1565c0" }}>
            ✨ For you
          </div>
          <ul className="entry-list" style={{ marginBottom: 16 }}>
            {forYouItems.map((item) => <DietCard key={item.id} item={item} />)}
          </ul>
        </div>
      )}

      {/* General content */}
      {data && (
        <div>
          {forYouItems.length > 0 && (
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: "#333" }}>
              General guidance
            </div>
          )}
          {dietItems.length === 0 ? (
            <EmptyState
              title="Nothing here yet."
              note="This category does not have approved content for this stage yet."
            />
          ) : (
            <ul className="entry-list">
              {dietItems.map((item) => <DietCard key={item.id} item={item} />)}
            </ul>
          )}
        </div>
      )}
    </AppShell>
  );
}
