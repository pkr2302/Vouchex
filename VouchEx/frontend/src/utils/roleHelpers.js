export function resolveUserRole(user) {
  return user?.effective_role || user?.role;
}

export function isGroupAdmin(user) {
  return resolveUserRole(user) === 'group_admin' || user?.role === 'group_admin';
}

export function canSwitchCompanies(user, companies = null) {
  if (!user) return false;
  if (user.role === 'super_admin' || user.role === 'group_admin') return true;
  if ((user.managed_company_ids || []).length > 1) return true;
  if (Array.isArray(companies) && companies.length > 1) return true;
  return false;
}

export function isCompanyStaffAdmin(user) {
  const role = resolveUserRole(user);
  return (
    role === 'admin'
    || role === 'super_admin'
    || role === 'trial_owner'
    || role === 'group_admin'
  );
}

export function isPortalCompanyAdmin(user) {
  const role = resolveUserRole(user);
  return role === 'admin' || role === 'group_admin';
}

export function roleDisplayLabel(role) {
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'group_admin') return 'Group Admin';
  if (role === 'trial_owner') return 'Free Trial';
  if (role === 'admin') return 'Admin Account';
  return `${role || 'user'} Account`;
}

/** Apply per-company pivot role onto the user object for the active company. */
export function withEffectiveRoleForCompany(user, companyId) {
  if (!user) return user;
  if (user.role === 'super_admin' || user.role === 'group_admin' || user.role === 'trial_owner') {
    return { ...user, effective_role: user.role };
  }
  const key = companyId != null ? String(companyId) : '';
  const pivot = key ? (user.company_roles?.[key] || user.company_roles?.[companyId]) : null;
  if (pivot === 'admin' || pivot === 'user') {
    return { ...user, effective_role: pivot };
  }
  return { ...user, effective_role: user.role };
}

export function resolveAuthPhase({ currentUser, account, needsPassword }) {
  if (!currentUser) return 'guest';
  if (needsPassword) return 'set-password';
  if (currentUser.role === 'trial_owner') {
    const step = account?.onboarding_step ?? currentUser.onboarding_step ?? 'company_create';
    if (step !== 'complete') return 'onboarding';
    if (account?.needs_subscription || account?.has_portal_access === false) return 'subscription';
  }
  return 'portal';
}
