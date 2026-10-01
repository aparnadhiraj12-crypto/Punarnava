import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import PageTitle from "../../components/PageTitle";
import Badge from "../../components/Badge";
import { Loading, Unreachable, EmptyState } from "../../components/Page";
import { getSession } from "../../lib/session";
import {
  getFamilyGrants,
  grantFamilyAccess,
  revokeFamilyAccess,
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
      const data = await getFamilyGrants(linkedId);
      setSharedView(data);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
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
        <h2 className="section-title">Invite family</h2>

        <form className="paper-card" onSubmit={inviteFamilyMember}>
          <label className="field-label" htmlFor="family-phone">
            Family member phone
          </label>

          <input
            id="family-phone"
            className="text-input"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Enter phone number"
          />

          <div className="section-block">
            <h3 className="card-title">Choose what to share</h3>

            <div className="simple-list">
              {SHARING_OPTIONS.map((item) => (
                <label key={item.id} className="paper-card">
                  <input
                    type="checkbox"
                    checked={selected[item.id]}
                    onChange={() => toggleOption(item.id)}
                  />

                  <strong>{item.label}</strong>
                  <p>{item.description}</p>
                </label>
              ))}
            </div>
          </div>

          <button className="primary-button" type="submit">
            Invite family member
          </button>

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
              <article key={grant.id} className="paper-card">
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

                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => revokeAccess(grant.id)}
                >
                  Revoke access
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
