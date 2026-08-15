import { FiGlobe, FiMail, FiMessageCircle, FiPhone } from "react-icons/fi";

// Single source of truth for FlexiOrder support/contact channels.
export const CONTACTS = [
  {
    icon: FiMail,
    label: "Email",
    value: "ishwrknt@gmail.com",
    href: "mailto:ishwrknt@gmail.com",
  },
  {
    icon: FiPhone,
    label: "Call",
    value: "+91 78761 29329",
    href: "tel:+917876129329",
  },
  {
    icon: FiMessageCircle,
    label: "WhatsApp",
    value: "+91 86792 50661",
    href: "https://wa.me/918679250661",
  },
  {
    icon: FiGlobe,
    label: "Website",
    value: "flexiorder.vercel.app",
    href: "https://flexiorder.vercel.app",
  },
];
