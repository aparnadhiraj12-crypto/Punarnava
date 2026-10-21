import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import PageTitle from "../../components/PageTitle";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import { Loading, Unreachable, EmptyState } from "../../components/Page";
import { getSession } from "../../lib/session";
import {
  getFamilyGrants,
  grantFamilyAccess,
  revokeFamilyAccess,
  getPartnerAlerts,
  updatePartnerPhone,
} from "../../lib/api";

const SHARING_OPTIONS = [
  {
    id: "stage",
    label: "Pregnancy / postpartum stage",
    description: "Your current stage and basic timeline.",
  },
  {
    id: "diet",
    label: "Diet",
    description: "Food guidance and saved diet information.",
  },
  {
    id: "classes",
    label: "Classes",
    description: "Available classes and movement activities.",
  },
  {
    id: "appointments",
    label: "Upcoming appointments",
    description: "Appointments you choose to share.",
  },
];

export default function Family() {
  const { linkedId } = getSession();

  const [phone, setPhone] = useState("");
  const [selected, setSelected] = useState(
    SHARING_OPTIONS.reduce((acc, item) => {
      acc[item.id] = true;
      return acc;
    }, {})
  );

  const [sharedView, setSharedView] = useState(null);
  const [partnerAlerts, setPartnerAlerts] = useState(null);
  const [spousePhoneInput, setSpousePhoneInput] = useState("");
  const [partnerMsg, setPartnerMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!linkedId) {
      setLoading(false);
      return;
    }

    fetchSharedView();
  }, [linkedId]);

  async function fetchSharedView() {
    setLoading(true);
    setFailed(false);

    try {
      const [grantsRes, alertsRes] = await Promise.allSettled([
        getFamilyGrants(linkedId),
        getPartnerAlerts(linkedId),
      ]);
      if (grantsRes.status === "fulfilled") setSharedView(grantsRes.value);
      if (alertsRes.status === "fulfilled") {
        setPartnerAlerts(alertsRes.value);
        setSpousePhoneInput(alertsRes.value.spouse_phone || "");
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePartnerPhone(event) {
    event.preventDefault();
    setPartnerMsg("");

    try {
      await updatePartnerPhone(linkedId, spousePhoneInput.trim());
      setPartnerMsg("Partner phone number updated successfully.");
      await fetchSharedView();
    } catch {
      setPartnerMsg("Could not update partner phone. Please try again.");
    }
  }

  function toggleOption(id) {
    setSelected((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }

  async function inviteFamilyMember(event) {
    event.preventDefault();
    setMessage("");

    if (!phone.trim()) {
      setMessage("Enter a phone number to invite a family member.");
      return;
    }

    try {
      await grantFamilyAccess({
        woman_id: linkedId,
        phone: phone.trim(),
        scope: Object.entries(selected)
          .filter(([, enabled]) => enabled)
          .map(([id]) => id),
      });

      setPhone("");
      setMessage("Family access has been created.");
      await fetchSharedView();
    } catch {
      setMessage("Family access could not be created. Please try again.");
    }
  }

  async function revokeAccess(id) {
    setMessage("");

    try {
      await revokeFamilyAccess(id);
      setMessage("Family access has been revoked.");
      await fetchSharedView();
    } catch {
      setMessage("Family access could not be revoked. Please try again.");
    }
  }

  return (
    <AppShell role="mother">
      <PageTitle
        eyebrow="Family"
        title="Share only what you choose."
        copy="Invite a family member to a narrow view of your pregnancy or postpartum journey."
      />

      <div className="paper-card">
        <div className="card-title">What family members can see</div>
        <p>
          Family sharing is intentionally limited. They do not get access to
          your journal, mental-health information, clinical readings, or private
          self-reports.
        </p>

        <ul className="tag-row">
          {SHARING_OPTIONS.map((item) => (
            <li key={item.id}>
              <Badge>{item.label}</Badge>
            </li>
          ))}
        </ul>
      </div>

      <section className="section-block">
        <h2 className="section-title">Spouse & Partner Support</h2>
        <div className="paper-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <div className="eyebrow" style={{ color: "var(--green)" }}>Notification Only · No Full App Access</div>
              <div className="card-title" style={{ marginTop: "0.2rem" }}>Appointment Alerts & Mental Guidance</div>
            </div>
            <Badge tone="sage">{partnerAlerts?.spouse_phone ? "Linked" : "Not Linked"}</Badge>
          </div>
          <p style={{ marginTop: "0.5rem" }}>
            Your partner receives automated SMS notifications for upcoming check-ups and empathetic advice on how to mentally support you during {partnerAlerts?.stage_title || "each trimester"}. They cannot see your medical charts or private notes.
          </p>

          <form onSubmit={handleSavePartnerPhone} className="field" style={{ marginTop: "1rem" }}>
            <label htmlFor="spouse-phone">Partner's phone number</label>
            <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", alignItems: "center" }}>
              <input
                id="spouse-phone"
                type="tel"
                value={spousePhoneInput}
                onChange={(e) => setSpousePhoneInput(e.target.value)}
                placeholder="+91 98765 43210"
                style={{ flex: 1, minWidth: "200px" }}
              />
              <Button type="submit">
                {partnerAlerts?.spouse_phone ? "Update Number" : "Save Number"}
              </Button>
            </div>
            {partnerMsg && <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>{partnerMsg}</p>}
          </form>

          {partnerAlerts?.guidance && (
            <div style={{ marginTop: "1.2rem", padding: "1rem", background: "rgba(168, 197, 181, 0.15)", borderRadius: "12px" }}>
              <strong style={{ fontSize: "0.9rem", color: "var(--green-dark)" }}>Current advice sent to your partner for {partnerAlerts.guidance.title}:</strong>
              <p style={{ margin: "0.3rem 0 0", fontSize: "0.9rem" }}>"{partnerAlerts.guidance.mental_support_actions[0]}"</p>
            </div>
          )}
        </div>
      </section>

      <section className="section-block">
        <h2 className="section-title">Invite family</h2>

        <form className="paper-card" onSubmit={inviteFamilyMember} style={{ display: "grid", gap: "1rem" }}>
          <label className="field" htmlFor="family-phone">
            <span>Family member phone</span>
            <input
              id="family-phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Enter phone number"
            />
          </label>

          <div className="section-block">
            <h3 className="card-title">Choose what to share</h3>

            <div className="simple-list">
              {SHARING_OPTIONS.map((item) => (
                <label key={item.id} className="paper-card" style={{ display: "flex", gap: "0.8rem", alignItems: "flex-start", cursor: "pointer", margin: "0.4rem 0" }}>
                  <input
                    type="checkbox"
                    checked={selected[item.id]}
                    onChange={() => toggleOption(item.id)}
                    style={{ marginTop: "0.25rem", width: "20px", height: "20px", accentColor: "var(--green)" }}
                  />
                  <div>
                    <strong>{item.label}</strong>
                    <p style={{ margin: "0.2rem 0 0" }}>{item.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Button type="submit">
            Invite family member
          </Button>

          {message && <p className="muted">{message}</p>}
        </form>
      </section>

      <section className="section-block">
        <h2 className="section-title">Current sharing</h2>

        {loading && <Loading />}

        {failed && <Unreachable onRetry={fetchSharedView} />}

        {!loading && !failed && !sharedView && (
          <EmptyState
            title="No family sharing yet."
            note="When you invite someone, their active access will appear here."
          />
        )}

        {!loading && !failed && sharedView?.grants?.length === 0 && (
          <EmptyState
            title="No active family access."
            note="You can invite a family member whenever you're ready."
          />
        )}

        {sharedView?.grants?.length > 0 && (
          <div className="simple-list">
            {sharedView.grants.map((grant) => (
              <article key={grant.id} className="paper-card" style={{ display: "grid", gap: "0.6rem" }}>
                <div className="card-title">
                  {grant.phone || grant.name || "Family member"}
                </div>

                <ul className="tag-row">
                  {(grant.scope || []).map((item) => (
                    <li key={item}>
                      <Badge>{item}</Badge>
                    </li>
                  ))}
                </ul>

                <div>
                  <Button
                    tone="secondary"
                    type="button"
                    onClick={() => revokeAccess(grant.id)}
                  >
                    Revoke access
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
