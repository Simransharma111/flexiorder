import { Link } from "react-router-dom";
import { FiArrowLeft, FiMail } from "react-icons/fi";
import { CONTACTS } from "../constants/contacts";
import { DATA_DELETION_MAILTO, PRIVACY_LAST_UPDATED, PRIVACY_POLICY } from "../constants/privacyPolicy";

const EMAIL = CONTACTS.find((c) => c.href?.startsWith("mailto:"));

export default function PrivacyPolicyPage() {
  return (
    <main className="privacy-page">
      <header className="privacy-page__head">
        <Link to="/" className="privacy-page__back"><FiArrowLeft /> Back to home</Link>
        <h1>Privacy Policy</h1>
        <p className="privacy-page__updated">Last updated: {PRIVACY_LAST_UPDATED}</p>
        <p className="privacy-page__intro">
          This policy explains what FlexiOrder collects, why, and how you stay in control
          of your information — whether you run a hotel on it or order from one.
        </p>
      </header>

      <article className="privacy-page__body">
        {PRIVACY_POLICY.map((section) => (
          <section key={section.heading} className="privacy-page__section">
            <h2>{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph.slice(0, 60)}>{paragraph}</p>
            ))}
          </section>
        ))}

        <section className="privacy-page__section privacy-page__deletion" aria-label="Request data deletion">
          <h2>12. Request data deletion</h2>
          <p>
            Email us at {EMAIL ? <a href={EMAIL.href}>{EMAIL.value}</a> : "our support email"} from your
            registered email address and your account, hotel data, and order history will be
            permanently deleted — confirmed within 30 days.
          </p>
          <a className="privacy-page__deletion-button" href={DATA_DELETION_MAILTO}>
            <FiMail aria-hidden="true" /> Request data deletion
          </a>
        </section>

        <section className="privacy-page__section privacy-page__contact">
          <h2>13. Contact</h2>
          <p>
            Privacy questions or requests (access, correction, deletion):
            {" "}{EMAIL ? <a href={EMAIL.href}>{EMAIL.value}</a> : "contact us via the Contact page."}
          </p>
        </section>
      </article>
    </main>
  );
}
