import { FiArrowRight, FiZap, FiTarget, FiShield } from "react-icons/fi";
import { CONTACTS } from "../../constants/contacts";

const VALUES = [
  {
    icon: FiTarget,
    title: "Simple by design",
    body: "Scan a code, see the menu, place the order. No apps to install, no accounts to create.",
  },
  {
    icon: FiZap,
    title: "Fast where it counts",
    body: "Orders reach the kitchen instantly and everyone sees the same live status, from table to pass.",
  },
  {
    icon: FiShield,
    title: "Reliable on the floor",
    body: "Built for busy service: offline-tolerant saves, clear order boards, and tools that stay out of the way.",
  },
];

export default function AboutPanel() {
  return (
    <section className="owner-about">
      <div className="owner-about__intro">
        <div className="owner-about__logo" aria-hidden="true">F</div>
        <div>
          <h2>About FlexiOrder</h2>
          <p>Restaurant ordering that works the way your floor does — QR menus for guests, live boards for kitchens, and one calm place for owners to run the day.</p>
        </div>
      </div>

      <div className="owner-about__values">
        {VALUES.map((value) => {
          const Icon = value.icon;
          return (
            <article key={value.title}>
              <span className="owner-about__value-icon"><Icon /></span>
              <div>
                <h3>{value.title}</h3>
                <p>{value.body}</p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="owner-about__contact">
        <h3>Contact us</h3>
        <p>
          Questions about onboarding, pricing, or your menu? Reach the team
          directly on any channel below.
        </p>
      </div>

      <div className="owner-about__links">
        {CONTACTS.map((contact) => {
          const ContactIcon = contact.icon;
          const external = contact.href.startsWith("http");
          return (
            <a
              key={contact.label}
              href={contact.href}
              target={external ? "_blank" : undefined}
              rel={external ? "noreferrer" : undefined}
              className="owner-about__link"
            >
              <span className="owner-about__link-icon"><ContactIcon /></span>
              <div>
                <strong>{contact.label}</strong>
                <small>{contact.value}</small>
              </div>
              <FiArrowRight />
            </a>
          );
        })}
      </div>

      <p className="owner-about__version">FlexiOrder for Owners</p>
    </section>
  );
}
