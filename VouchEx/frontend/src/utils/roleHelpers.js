export function isGroupAdmin(user) {
  return user?.role === 'group_admin';
}

export function canSwitchCompanies(user, companies = null) {
  if (!user) return false;
  if (user.role === 'super_admin' || user.role === 'group_admin') return true;
  if ((user.managed_company_ids || []).length > 1) return true;
  if (Array.isArray(companies) && companies.length > 1) return true;
  return false;
}

export function isCompanyStaffAdmin(user) {
  return (
    user?.role === 'admin'
    || user?.role === 'super_admin'
    || user?.role === 'trial_owner'
    || user?.role === 'group_admin'
  );
}

export function isPortalCompanyAdmin(user) {
  return user?.role === 'admin' || user?.role === 'group_admin';
}

export function roleDisplayLabel(role) {
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'group_admin') return 'Group Admin';
  if (role === 'trial_owner') return 'Free Trial';
  if (role === 'admin') return 'Admin Account';
  return `${role || 'user'} Account`;
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
