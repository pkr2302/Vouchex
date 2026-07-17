import { useMemo } from 'react';

/**
 * Checkbox list for assigning companies (+ optional per-company Admin/User role).
 */
export default function CompanyAccessPicker({
  companies = [],
  selectedIds = [],
  rolesByCompany = {},
  onChangeIds,
  onChangeRole,
  showRoles = true,
  label = 'Company access*',
  emptyLabel = 'No companies available.',
  idPrefix = 'company-access',
}) {
  const selectedSet = useMemo(
    () => new Set((selectedIds || []).map(String)),
    [selectedIds]
  );

  const toggle = (companyId, checked) => {
    const id = String(companyId);
    const next = checked
      ? Array.from(new Set([...selectedIds.map(String), id]))
      : selectedIds.map(String).filter((x) => x !== id);
    onChangeIds(next);
    if (checked && onChangeRole && !rolesByCompany[id]) {
      onChangeRole(id, 'user');
    }
  };

  if (!companies.length) {
    return (
      <div className="form-group">
        <label>{label}</label>
        <p className="company-access-picker__empty">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="form-group company-access-picker">
      <label>{label}</label>
      <p className="company-access-picker__hint">
        Tick each company this person can open. {showRoles ? 'Set Admin or User rights per company.' : ''}
      </p>
      <div className="company-access-picker__list">
        {companies.map((co) => {
          const id = String(co.id);
          const checked = selectedSet.has(id);
          return (
            <div key={id} className={`company-access-picker__row${checked ? ' is-checked' : ''}`}>
              <label className="company-access-picker__check" htmlFor={`${idPrefix}-${id}`}>
                <input
                  id={`${idPrefix}-${id}`}
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => toggle(co.id, e.target.checked)}
                />
                <span>{co.name}</span>
              </label>
              {showRoles && (
                <select
                  className="form-input company-access-picker__role"
                  disabled={!checked}
                  value={rolesByCompany[id] || 'user'}
                  onChange={(e) => onChangeRole?.(id, e.target.value)}
                  aria-label={`Role for ${co.name}`}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              )}
            </div>
          );
        })}
      </div>
      {selectedIds.length > 0 && (
        <p className="company-access-picker__summary">
          Selected ({selectedIds.length}): {companies
            .filter((co) => selectedSet.has(String(co.id)))
            .map((co) => co.name)
            .join(', ')}
        </p>
      )}
    </div>
  );
}

/**
 * Checkbox list for granting existing users access when creating a company.
 */
export function UserAccessPicker({
  users = [],
  selectedIds = [],
  rolesByUser = {},
  onChangeIds,
  onChangeRole,
  label = 'Grant access to existing users',
  idPrefix = 'user-access',
}) {
  const selectedSet = useMemo(
    () => new Set((selectedIds || []).map(String)),
    [selectedIds]
  );

  const toggle = (userId, checked) => {
    const id = String(userId);
    const next = checked
      ? Array.from(new Set([...selectedIds.map(String), id]))
      : selectedIds.map(String).filter((x) => x !== id);
    onChangeIds(next);
    if (checked && onChangeRole && !rolesByUser[id]) {
      onChangeRole(id, 'user');
    }
  };

  if (!users.length) {
    return (
      <div className="form-group">
        <label>{label}</label>
        <p className="company-access-picker__empty">No existing users to assign yet.</p>
      </div>
    );
  }

  return (
    <div className="form-group company-access-picker">
      <label>{label}</label>
      <p className="company-access-picker__hint">
        Optional — tick users (e.g. Aditya) who should get this new company immediately.
      </p>
      <div className="company-access-picker__list">
        {users.map((u) => {
          const id = String(u.id);
          const checked = selectedSet.has(id);
          return (
            <div key={id} className={`company-access-picker__row${checked ? ' is-checked' : ''}`}>
              <label className="company-access-picker__check" htmlFor={`${idPrefix}-${id}`}>
                <input
                  id={`${idPrefix}-${id}`}
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => toggle(u.id, e.target.checked)}
                />
                <span>
                  {u.name} <em>({u.email})</em>
                </span>
              </label>
              <select
                className="form-input company-access-picker__role"
                disabled={!checked || u.role === 'group_admin'}
                value={rolesByUser[id] || (u.role === 'admin' ? 'admin' : 'user')}
                onChange={(e) => onChangeRole?.(id, e.target.value)}
                aria-label={`Role for ${u.name}`}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
