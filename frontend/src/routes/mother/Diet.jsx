import DailyDietCheckIn from "./DailyDietCheckIn";

import { useEffect, useRef, useState } from "react";
import AppShell from "../../components/AppShell";
import PageTitle from "../../components/PageTitle";
import { getSession } from "../../lib/session";
import {
  getDietProfile,
  saveDietProfile,
  getAllergyProfile,
  putAllergyProfile,
  getBudgetProfile,
  putBudgetProfile,
  getFoodSuggestions,
  postFoodFeedback,
  getFoodFeedback,
  deleteFoodFeedback,
} from "../../lib/api";

const STAGES = [
  ["pregnancy_t1", "Trimester 1"],
  ["pregnancy_t2", "Trimester 2"],
  ["pregnancy_t3", "Trimester 3"],
  ["postpartum_early", "First 6 weeks postpartum"],
  ["postpartum_six_week", "6 weeks to 6 months"],
  ["postpartum_long", "After 6 months"],
];

const FEEDBACK = [
  ["nauseous", "Makes me nauseous"],
  ["expensive", "Too expensive"],
  ["unavailable", "Unavailable"],
  ["disliked", "Don't like it"],
  ["worked", "Worked for me"],
];

const inputStyle = {
  display: "block",
  width: "100%",
  padding: "10px",
  marginTop: "6px",
  boxSizing: "border-box",
};

function splitList(value) {
  return [...new Set(
    value.split(",").map((item) => item.trim()).filter(Boolean)
  )];
}

function metadataText(value) {
  if (value == null) return "Not provided";
  if (Array.isArray(value)) return value.map(metadataText).join(", ");
  if (typeof value === "object") return Object.entries(value)
    .map(([key, entry]) => `${key.replaceAll("_", " ")}: ${metadataText(entry)}`).join("; ");
  return String(value);
}

function Guidance({ guidance }) {
  return (
    <section aria-label="Personalized diet guidance" className="paper-card">
      <h2>Personalized diet guidance</h2>
      {guidance?.disclaimer && <p>{guidance.disclaimer}</p>}
      {(guidance?.context_notes || []).map((note) => <p key={note}>{note}</p>)}
      {guidance?.ruleset_version && <p>Ruleset: {guidance.ruleset_version}</p>}
      {!(guidance?.cards || []).length && <p>No verified guidance is available for this context. Ask your clinician about your individual needs.</p>}
      {(guidance?.cards || []).map((card) => (
        <article key={card.rule_id}>
          <h3>{card.layer} guidance</h3>
          <p>Rule: {card.rule_id}</p>
          {[["eat", "Eat"], ["limit", "Limit"], ["tip", "Tip"], ["note", "Note"], ["limit_notes", "Limitations"]].map(([field, label]) =>
            card[field] && <div key={field}><strong>{label}: </strong><p>{metadataText(card[field])}</p></div>
          )}
          {card.citation && <p className="citation">{card.citation}</p>}
        </article>
      ))}
    </section>
  );
}

function ProfileForm({ profile, onSave, onCancel }) {
  const [form, setForm] = useState({
    ...profile,
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
        Your profile is saved to your account on the server.
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
  const [revision, setRevision] = useState({ id: 0, feedback: true });
  const [profile, setProfile] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [allergens, setAllergens] = useState("");
  const [budget, setBudget] = useState("medium");
  const [ingredients, setIngredients] = useState("");
  const [dirty, setDirty] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [swapFor, setSwapFor] = useState(null);
  const initialized = useRef(false);
  const [savedPreferences, setSavedPreferences] = useState(null);
  const [feedback, setFeedback] = useState([]);

  useEffect(() => {
    let active = true;
    setSwapFor(null);
    setLoading(true);
    setError("");
    setResult(null);

    if (!linkedId) {
      setLoading(false);
      return () => { active = false; };
    }

    async function load() {
      try {
        // Hydrate editable answers once; background refreshes never replace drafts.
        if (!initialized.current) {
          const [profileData, allergyData, budgetData] = await Promise.all([
            getDietProfile(linkedId), getAllergyProfile(linkedId), getBudgetProfile(linkedId),
          ]);
          if (!active) return;
          const saved = {
            allergens: (allergyData.allergens || []).join(", "),
            budget: budgetData.budget || "medium",
            ingredients: (budgetData.available_ingredients || []).join(", "),
          };
          setProfile(profileData.profile);
          setAllergens(saved.allergens);
          setBudget(saved.budget);
          setIngredients(saved.ingredients);
          setSavedPreferences(saved);
          initialized.current = true;
        }
        const [foodData, feedbackData] = await Promise.all([
          getFoodSuggestions(linkedId, { stage }),
          revision.feedback ? getFoodFeedback(linkedId) : Promise.resolve(null),
        ]);
        if (!active) return;
        setResult(foodData);
        // Latest submitted event wins; undo is neutral and preserves history.
        if (feedbackData) setFeedback([...new Map((feedbackData.feedback || []).map((entry) => [entry.food_id, entry])).values()].filter((entry) => entry.issue !== "undone"));
      } catch (err) {
        if (active) setError(err.message || "Could not load your diet data.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [linkedId, stage, revision]);

  async function runAction(action, message) {
    setBusy(true);
    setError("");
    setNotice("");
    setResult(null);

    try {
      await action();
      setNotice(message);
      setRevision((value) => ({ id: value.id + 1, feedback: true }));
    } catch (err) {
      setError(
        (err.message || "Could not save.") +
        " Your unsaved answers have been kept. Retry the save or refresh suggestions."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveProfile(formData) {
    await runAction(async () => {
      await saveDietProfile(linkedId, {
        ...formData,
        woman_id: linkedId,
      });
      setProfile(formData);
      setShowProfile(false);
    }, "Diet profile saved.");
  }

  async function savePreferences(event) {
    event.preventDefault();
    await runAction(async () => {
      await putAllergyProfile(linkedId, {
        woman_id: linkedId,
        allergens: splitList(allergens),
      });
      await putBudgetProfile(linkedId, {
        woman_id: linkedId,
        budget,
        available_ingredients: splitList(ingredients),
      });
      setSavedPreferences({ allergens, budget, ingredients });
      setDirty(false);
    }, "Preferences saved.");
  }

  async function recordFeedback(foodId, issue) {
    await runAction(
      () => postFoodFeedback(linkedId, {
        woman_id: linkedId,
        food_id: foodId,
        issue,
        date: new Date().toISOString(),
      }),
      issue === "worked"
        ? "Saved: this food worked for you."
        : "Feedback saved."
    );
  }


  function alternativesFor(food, suggestions = result?.suggestions || []) {
    return suggestions.filter((candidate) =>
      candidate.id !== food.id &&
      candidate.stage === food.stage &&
      (candidate.meal_types || []).some((meal) =>
        (food.meal_types || []).includes(meal)
      )
    );
  }

  async function swapFood(originalFood, replacementFood) {
    await runAction(async () => {
      // Recheck current server-filtered options before saving.
      const fresh = await getFoodSuggestions(linkedId, { stage });
      const current = (fresh.suggestions || []).find(
        (food) => food.id === originalFood.id
      );

      if (!current) {
        throw new Error("The original food is no longer available.");
      }

      const replacement = alternativesFor(
        current,
        fresh.suggestions || []
      ).find((food) => food.id === replacementFood.id);

      if (!replacement) {
        throw new Error("That alternative no longer matches your preferences.");
      }

      await postFoodFeedback(linkedId, {
        woman_id: linkedId,
        food_id: current.id,
        issue: "swapped",
        alternative_id: replacement.id,
        stage,
        date: new Date().toISOString(),
      });

      setSwapFor(null);
    }, `Swap saved: ${replacementFood.title} replaces ${originalFood.title}.`);
  }

  const disabled = loading || busy || !initialized.current;

  return (
    <AppShell role="mother">
      <PageTitle
        eyebrow="Nutrition"
        title="Food that fits your preferences."
        copy="Explore meal ideas using your food preferences, budget, and available ingredients."
      />

      {!linkedId ? (
        <p>Complete your mother enrolment to use diet preferences.</p>
      ) : (
        <>
          <label style={{ display: "block", marginBottom: 16 }}>
            Choose the stage to view
            <select
              style={inputStyle}
              value={stage}
              disabled={disabled || dirty || showProfile}
              onChange={(event) => {
                setNotice("");
                setStage(event.target.value);
              }}
            >
              {STAGES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          {notice && <p role="status">{notice}</p>}

          {error && (
            <div role="alert" className="paper-card">
              <p>{error}</p>
              <button
                type="button"
                className="button button-secondary"
                disabled={loading || busy}
                onClick={() => setRevision((value) => ({ id: value.id + 1, feedback: true }))}
              >
                Retry suggestions
              </button>
            </div>
          )}

          {loading && <p role="status">Loading your preferences...</p>}

          <>
              {showProfile ? (
                <ProfileForm
                  profile={profile}
                  onSave={handleSaveProfile}
                  onCancel={() => setShowProfile(false)}
                />
              ) : (
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={disabled}
                  onClick={() => setShowProfile(true)}
                >
                  {profile ? "Edit diet profile" : "Set up diet profile"}
                </button>
              )}

              <DailyDietCheckIn
                key={linkedId}
                womanId={linkedId}
                disabled={disabled}
                onSaved={() => setRevision((value) => ({ id: value.id + 1, feedback: false }))}
              />

              <form
                className="paper-card"
                style={{ marginTop: 16, marginBottom: 16 }}
                onSubmit={savePreferences}
              >
                <h2>Allergies, budget and ingredients</h2>

                <fieldset
                  disabled={disabled}
                  style={{ border: 0, padding: 0, margin: 0 }}
                >
                  <label style={{ display: "block", marginBottom: 12 }}>
                    Allergies, separated by commas
                    <input
                      style={inputStyle}
                      value={allergens}
                      placeholder="Example: milk, peanut"
                      onChange={(event) => {
                        setAllergens(event.target.value);
                        setDirty(true);
                      }}
                    />
                  </label>

                  <label style={{ display: "block", marginBottom: 12 }}>
                    Budget category
                    <select
                      style={inputStyle}
                      value={budget}
                      onChange={(event) => {
                        setBudget(event.target.value);
                        setDirty(true);
                      }}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">Flexible</option>
                    </select>
                  </label>

                  <label style={{ display: "block", marginBottom: 12 }}>
                    Ingredients at home, separated by commas
                    <input
                      style={inputStyle}
                      value={ingredients}
                      placeholder="Example: rice, carrot"
                      onChange={(event) => {
                        setIngredients(event.target.value);
                        setDirty(true);
                      }}
                    />
                  </label>

                  <p>
                    Ingredient matching finds recipes containing at least one
                    listed ingredient. You may need additional ingredients.
                  </p>

                  <button
                    type="submit"
                    className="button button-primary"
                  >
                    {busy ? "Saving..." : "Save preferences"}
                  </button>

                  {dirty && (
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => {
                        setAllergens(savedPreferences.allergens);
                        setBudget(savedPreferences.budget);
                        setIngredients(savedPreferences.ingredients);
                        setDirty(false);
                      }}
                    >
                      Discard unsaved changes
                    </button>
                  )}
                </fieldset>
              </form>

              {dirty && (
                <p role="status">
                  Save your changes to see updated suggestions.
                </p>
              )}

              <section aria-label="Saved food feedback" className="paper-card">
                <h2>Saved food feedback</h2>
                <p>Undo clears the active rating for that food, including foods hidden from suggestions. History is kept. Other filters still apply.</p>
                {!feedback.length && <p>No saved food feedback.</p>}
                {feedback.map((entry) => (
                  <div key={entry.food_id}>
                    <p>{entry.food_title || entry.food_id}: {FEEDBACK.find(([value]) => value === entry.issue)?.[1] || entry.issue}
                      {entry.alternative_id && ` → ${entry.alternative_id}`}</p>
                    <button type="button" className="button button-secondary" disabled={disabled}
                      aria-label={`Undo feedback: ${entry.food_title || entry.food_id}`}
                      onClick={() => runAction(() => deleteFoodFeedback(linkedId, entry.food_id), "Feedback undone. History kept.")}>Undo feedback</button>
                  </div>
                ))}
              </section>

              {!loading && !error && result && (
                <>
                  {(dirty || showProfile) && <p>Guidance uses your saved answers, not unsaved edits.</p>}
                  <Guidance guidance={result.guidance} />
                </>
              )}

              {!dirty && !loading && !error && result && (
                <>
                <section aria-label="Food suggestions">
                  <h2>Food suggestions</h2>
                  <p>
                    These are illustrative meal ideas, not a prescribed diet and not GDM-approved.
                    Preference matching is separate from the sourced guidance above.
                    Discuss portions and individual needs with your clinician.
                  </p>

                  {result.excluded_for_incomplete_allergen_data > 0 && (
                    <p role="status">
                      Some options were excluded because their allergen
                      information is incomplete.
                    </p>
                  )}

                  {(result.suggestions || []).length === 0 ? (
                    <p>{result.message || "No matching options available."}</p>
                  ) : (
                    <ul
                      style={{ listStyle: "none", padding: 0 }}
                      className="entry-list"
                    >
                      {result.suggestions.map((item) => (
                        <li
                          key={item.id}
                          className="paper-card"
                          style={{ marginBottom: 16 }}
                        >
                          <h3>{item.title}</h3>
                          {item.is_demo && <p>Illustrative meal option</p>}
                          <p>{item.body}</p>
                          <p>Ingredients: {metadataText(item.ingredients)}</p>
                          <p>Allergens: {item.allergens?.length === 0 ? "None listed; check ingredients and cross-contact." : metadataText(item.allergens)}</p>
                          <p>Affordability category: {item.affordability || "Not provided"}</p>
                          {item.affordability_estimate && <p>Affordability estimate: {metadataText(item.affordability_estimate)}</p>}
                          {item.limit_notes && <p>{metadataText(item.limit_notes)}</p>}

                          {item.meal_types?.length > 0 && (
                            <p>Meal: {item.meal_types.join(", ")}</p>
                          )}

                          <p>
                            <strong>Why this is shown: </strong>
                            {item.match_explanation}
                          </p>

                          {(item.filter_notes || []).map((note) => (
                            <p key={note}>{note}</p>
                          ))}

                          {item.avoid_notes && <p>{item.avoid_notes}</p>}

                          {item.source_citation && (
                            <p className="citation">{item.source_citation}</p>
                          )}

                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            {item.meal_types?.length > 0 && (
                              <button
                                type="button"
                                className="button button-secondary"
                                disabled={busy}
                                aria-expanded={swapFor === item.id}
                                aria-label={`Show alternatives for ${item.title}`}
                                onClick={() => setSwapFor(
                                  swapFor === item.id ? null : item.id
                                )}
                              >
                                {swapFor === item.id ? "Close alternatives" : "Swap"}
                              </button>
                            )}

                            {swapFor === item.id && (
                              <div
                                role="group"
                                aria-label={`Alternatives for ${item.title}`}
                                style={{ flexBasis: "100%", padding: "12px 0" }}
                              >
                                <strong>Choose an alternative</strong>
                                <p>
                                  These options share a meal category and match
                                  your current filters. They are not necessarily
                                  nutritionally equivalent.
                                </p>

                                {alternativesFor(item).length === 0 ? (
                                  <p role="status">
                                    No matching alternative available.
                                  </p>
                                ) : (
                                  alternativesFor(item).map((alternative) => (
                                    <div
                                      key={alternative.id}
                                      style={{ marginBottom: 12 }}
                                    >
                                      <p>
                                        <strong>{alternative.title}</strong>
                                        <br />
                                        {alternative.match_explanation}
                                      </p>
                                      <button
                                        type="button"
                                        className="button button-primary"
                                        disabled={busy}
                                        onClick={() => swapFood(item, alternative)}
                                      >
                                        Choose {alternative.title}
                                      </button>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}

                            {FEEDBACK.map(([issue, label]) => (
                              <button
                                key={issue}
                                type="button"
                                className="button button-secondary"
                                disabled={busy}
                                aria-label={`${label}: ${item.title}`}
                                onClick={() => recordFeedback(item.id, issue)}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                </>
              )}
          </>
        </>
      )}
    </AppShell>
  );
}
