/**
 * FlexiOrder Privacy Policy — single source of truth for all surfaces
 * (public /privacy page, landing footer link, owner About panel link).
 */

import { CONTACTS } from "./contacts";

export const PRIVACY_LAST_UPDATED = "15 August 2026";

export const PRIVACY_POLICY = [
  {
    heading: "1. Who we are",
    body: [
      "FlexiOrder (\u201Cwe\u201D, \u201Cour\u201D) is a restaurant ordering platform. Hotels and restaurants (\u201Cthe hotel\u201D) use it to show QR menus, receive dine-in / takeaway orders, and run kitchen workflows. Guests (\u201Cyou\u201D) scan a QR code to browse the menu and order.",
      "For hospitality data, the hotel is the data controller for its guests and FlexiOrder acts as its service provider. For account and platform data (logins, subscriptions, support), FlexiOrder is the controller.",
    ],
  },
  {
    heading: "2. Information we collect",
    body: [
      "Owner and staff accounts: name, email address, phone number, and a securely hashed password. We never store plain-text passwords.",
      "Hotel profile: hotel name, tagline, address, contact details, menu content, branding assets (logo, cover images), and link settings such as website and Instagram URLs that the owner chooses to publish.",
      "Order data: items ordered, quantities, prices, table or room reference, order notes, guest name and contact if the guest or waiter provides them, and order status history.",
      "Device and usage data: app/browser logs, error reports, and notification tokens used to deliver order alerts. We use local storage on the device for sign-in sessions, cart contents, and display preferences.",
      "We do not collect or store card or banking details. Any payment for an order is settled between you and the hotel through the hotel's own payment methods.",
    ],
  },
  {
    heading: "3. How we use information",
    body: [
      "To provide the service: show menus, place and route orders, display live order status to kitchens, waiters, owners, and guests.",
      "To operate accounts: sign-in, role-based access (owner, kitchen, waiter), password reset, and account security.",
      "To improve reliability: diagnose errors, prevent abuse, and keep performance stable.",
      "We do not sell, rent, or trade personal information, and we do not use order data for advertising.",
    ],
  },
  {
    heading: "4. Sharing and processors",
    body: [
      "Order data is shared with the hotel whose QR code you scanned, and with the devices that hotel authorizes (kitchen, waiter, owner stations).",
      "We use infrastructure providers to host the app, database, push notifications, and app store distribution. These processors handle data only to run the service and are bound by their own security commitments.",
      "We may disclose information if required by law, court order, or to protect users and the platform from fraud or abuse.",
    ],
  },
  {
    heading: "5. Retention",
    body: [
      "Account and hotel data is kept while the account is active. Order history is kept for the hotel's operational and tax needs and can be removed when the hotel deletes its account.",
      "Guests are not required to create an account; guest order details stored are limited to what the hotel needs to serve and bill the order.",
    ],
  },
  {
    heading: "6. Security",
    body: [
      "Passwords are hashed with industry-standard algorithms, sessions use signed tokens, and transport is encrypted in transit (HTTPS/TLS). Access follows least-privilege roles, and destructive actions require authentication.",
      "No system is perfectly secure; if a breach materially affects your data we will notify affected users and the relevant hotel without undue delay.",
    ],
  },
  {
    heading: "7. Your rights",
    body: [
      "You may request access, correction, or deletion of your personal information. Owners can manage most hotel data directly in Settings; for anything else, contact us and we will act within a reasonable time, and within the timelines required by applicable law, including India\u2019s Digital Personal Data Protection Act, 2023.",
      "Guests who want their order details removed should ask the hotel they ordered from; the hotel can delete orders from its dashboard.",
    ],
  },
  {
    heading: "7a. Deleting your account and data",
    body: [
      "To permanently delete your FlexiOrder account, your hotel profile (name, menus, branding, staff), and stored order history, email us from your registered email address. Type \u201CFlexiOrder Data Deletion\u201D in the subject and include your hotel name so we can find the account fast.",
      "We confirm every request and complete deletion within 30 days. Certain records (for example, invoices or tax documents generated for completed orders) may be kept where the law requires it; everything else is removed.",
    ],
  },
  {
    heading: "8. Cookies and local storage",
    body: [
      "FlexiOrder uses local storage on your device for sign-in sessions, cart contents, and preferences. It does not use third-party tracking cookies or ad pixels.",
    ],
  },
  {
    heading: "9. Children",
    body: [
      "FlexiOrder is a business tool. Accounts are intended for users 18 years or older, and guests order under the supervision of the establishment they visit.",
    ],
  },
  {
    heading: "10. Changes",
    body: [
      "If this policy changes, the \u201CLast updated\u201D date above will change and, for material changes, we will announce the update in the app.",
    ],
  },
];


const DELETION_MAIL = CONTACTS.find((c) => c.href?.startsWith("mailto:"))?.value || "ishwrknt@gmail.com";

export const DATA_DELETION_MAILTO = `mailto:${DELETION_MAIL}?subject=FlexiOrder%20Data%20Deletion&body=Please%20delete%20my%20FlexiOrder%20account%20and%20data.%0A%0ARegistered%20email%3A%20%0AHotel%20name%3A%20%0AReason%20(optional)%3A%20`;
