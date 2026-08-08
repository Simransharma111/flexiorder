export const normalizeRole = (role) => String(role || "").trim().toLowerCase();

export const isRoleAllowed = (role, allowedRoles) => {
  if (!allowedRoles?.length) return true;
  const normalizedRole = normalizeRole(role);
  return allowedRoles.some((allowedRole) => normalizeRole(allowedRole) === normalizedRole);
};
