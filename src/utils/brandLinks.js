/**
 * Normalizes hotel brand links saved in Hotel Information so guests always
 * get a safe absolute URL, whether the owner typed "myhotel", "@myhotel",
 * "instagram.com/myhotel", or a full URL.
 */

const trim = (value) => String(value ?? "").trim();

export const toBrandLinkUrl = (value) => {
  const raw = trim(value);
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/\s/.test(raw)) return null;
  return `https://${raw.replace(/^\/\//, "")}`;
};

export const toInstagramUrl = (value) => {
  const raw = trim(value);
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.includes("instagram.com")) return `https://${raw.replace(/^\/\//, "")}`;
  const handle = raw.replace(/^@+/, "").replace(/\s/g, "");
  return handle ? `https://instagram.com/${handle}` : null;
};
