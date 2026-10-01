import { Link } from "react-router-dom";
import Brand from "../../components/Brand";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import PixelArt from "../../components/PixelArt";

const pageContent = {
  "how-it-works": {
    eyebrow: "How Punarnava works",
    title: "One record. Every step of the journey.",
    intro:
      "Punarnava connects the people who support a mother — from pregnancy and childbirth through the first year after birth.",
    sections: [
      {
        number: "01",
        title: "The journey stays connected",
        copy:
          "Important moments, visits and care information stay together instead of getting lost between appointments.",
      },
      {
        number: "02",
        title: "Care follows the mother",
        copy:
          "Mothers can follow their own journey, while ASHA workers and doctors can add the information they need for continuity of care.",
      },
      {
        number: "03",
        title: "Everyone sees what they need",
        copy:
          "Different people have different roles. Punarnava keeps each view focused on the information that role is meant to access.",
      },
    ],
  },
  principles: {
    eyebrow: "Our principles",
    title: "Built around continuity, dignity and trust.",
    intro:
      "Punarnava is designed around a simple idea: healthcare information should help people stay connected without making care more complicated.",
    sections: [
      {
        number: "01",
        title: "Continuity over fragments",
        copy:
          "A mother's care should not feel like a collection of disconnected visits. Her record grows with her.",
      },
      {
        number: "02",
        title: "Privacy by role",
        copy:
          "Personal and clinical information should only be visible to the people who have a reason and permission to see it.",
      },
      {
        number: "03",
        title: "Simple enough for real life",
        copy:
          "The experience is designed for mothers, ASHA workers and clinics — including situations where connectivity, time or technical familiarity may be limited.",
      },
      {
        number: "04",
        title: "Human care stays human",
        copy:
          "Punarnava supports care teams and families. It does not replace clinical judgement or human support.",
      },
    ],
  },
  privacy: {
    eyebrow: "Privacy",
    title: "Your care information deserves care too.",
    intro:
      "Punarnava is designed so that access to a mother's information follows her care relationship and the permissions associated with it.",
    sections: [
      {
        number: "01",
        title: "Access is role-based",
        copy:
          "Mother, ASHA, doctor and family views are intentionally different. Each role is designed around the information it needs.",
      },
      {
        number: "02",
        title: "Sharing has a boundary",
        copy:
          "Family sharing is limited to the information a mother chooses to make available. Private journal and sensitive information are not part of the family view by default.",
      },
      {
        number: "03",
        title: "Care records stay focused",
        copy:
          "Punarnava is built for continuity of care rather than collecting unrelated personal information.",
      },
    ],
  },
};

export default function PublicPage({ page }) {
  const content = pageContent[page];

  return (
    <main className="landing public-page">
      <nav className="landing-nav">
        <Link to="/" aria-label="Punarnava home">
          <Brand />
        </Link>

        <div className="nav-actions">
          <Link to="/login">
            <Button tone="quiet">Log in</Button>
          </Link>
          <Link to="/signup">
            <Button>Create account</Button>
          </Link>
        </div>
      </nav>

      <section className="public-hero">
        <div className="hero-copy">
          <div className="eyebrow">{content.eyebrow}</div>
          <div className="display display-xl">{content.title}</div>
          <p className="lead">{content.intro}</p>

          <div className="trust-line">
            <Icon name="shield" />
            <span>Private, simple and made for continuity of care</span>
          </div>
        </div>

        <div className="hero-art">
          <div className="sun-stamp" />
          <PixelArt kind="mother" />
          <div className="art-caption">
            <span>A record that grows with you</span>
            <Icon name="leaf" />
          </div>
        </div>
      </section>

      <section className="public-sections">
        {content.sections.map((section) => (
          <article className="public-section-card" key={section.number}>
            <span className="pixel-label">{section.number}</span>
            <div>
              <div className="feature-title">{section.title}</div>
              <p>{section.copy}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="public-cta">
        <div>
          <div className="eyebrow">Start here</div>
          <div className="display display-lg">Care should keep moving forward.</div>
          <p>
            Whether you are a mother, an ASHA worker, a doctor or a family
            member, Punarnava gives you a view built for your part in the
            journey.
          </p>
        </div>

        <div className="button-row">
          <Link to="/login">
            <Button>Continue to Punarnava <Icon name="arrow" /></Button>
          </Link>
          <Link to="/">
            <Button tone="secondary">Back home</Button>
          </Link>
        </div>
      </section>

      <footer>
        <Brand />
        <span>Made for every step after birth.</span>

        <div className="footer-links">
          <Link to="/how-it-works">How it works</Link>
          <Link to="/principles">Principles</Link>
          <Link to="/privacy">Privacy</Link>
        </div>
      </footer>
    </main>
  );
}
