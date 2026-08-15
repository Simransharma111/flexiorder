import { FiGlobe, FiMail, FiMessageCircle, FiPhone } from "react-icons/fi";

// Single source of truth for FlexiOrder support/contact channels.
export const CONTACTS = [
  {
    icon: FiMail,
    label: "Email",
    value: "flexiorderofficial@gmail.com",
    href: "mailto:flexiorderofficial@gmail.com",
  },
  {
    icon: FiPhone,
    label: "Call",
    value: "+91 86792 50661",
    href: "tel:+918679250661",
  },
  {
    icon: FiMessageCircle,
    label: "WhatsApp",
    value: "+91 78761 29329",
    href: "https://wa.me/917876129329",
  },
  {
    icon: FiGlobe,
    label: "Website",
    value: "flexiorder.vercel.app",
    href: "https://flexiorder.vercel.app",
  },
];
