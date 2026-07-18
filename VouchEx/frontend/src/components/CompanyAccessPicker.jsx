import { useMemo } from 'react';
import { Building2, Shield, UserRound, Check } from 'lucide-react';

function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

/**
 * Premium checkbox matrix for assigning companies (+ optional Admin/User per company).
 */
export default function CompanyAccessPicker({
  companies = [],
  selectedIds = [],
  rolesByCompany = {},
  onChangeIds,
  onChangeRole,
  showRoles = true,
  label = 'Company Access Matrix',
  emptyLabel = 'No companies available to assign.',
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

  const selectAll = () => {
    const all = companies.map((c) => String(c.id));
    onChangeIds(all);
    if (showRoles && onChangeRole) {
      all.forEach((id) => {
        if (!rolesByCompany[id]) onChangeRole(id, 'user');
      });
    }
  };

  const clearAll = () => onChangeIds([]);

  if (!companies.length) {
    return (
      <div className="access-matrix">
        <div className="access-matrix__head">
          <h4 className="form-section-title" style={{ margin: 0 }}>{label}</h4>
        </div>
        <p className="access-matrix__empty">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="access-matrix">
      <div className="access-matrix__head">
        <div>
          <h4 className="form-section-title" style={{ margin: 0, border: 'none', paddingBottom: 0 }}>
            {label}
          </h4>
          <p className="access-matrix__hint">
            Tick each company this person can open
            {showRoles ? ', then set Admin or User rights for that company.' : '.'}
          </p>
        </div>
        <div className="access-matrix__tools">
          <span className="access-matrix__count">
            {selectedIds.length} / {companies.length} selected
          </span>
          <button type="button" className="access-matrix__link" onClick={selectAll}>Select all</button>
          <button type="button" className="access-matrix__link" onClick={clearAll}>Clear</button>
        </div>
      </div>

      <div className="access-matrix__grid">
        {companies.map((co) => {
          const id = String(co.id);
          const checked = selectedSet.has(id);
          const role = rolesByCompany[id] || 'user';
          return (
            <div
              key={id}
              className={`access-tile${checked ? ' is-active' : ''}`}
              onClick={() => toggle(co.id, !checked)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggle(co.id, !checked);
                }
              }}
            >
              <div className="access-tile__top">
                <div className={`access-tile__avatar${checked ? ' is-on' : ''}`}>
                  {checked ? <Check size={16} strokeWidth={2.5} /> : <Building2 size={16} />}
                </div>
                <label
                  className="access-tile__check"
                  htmlFor={`${idPrefix}-${id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    id={`${idPrefix}-${id}`}
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => toggle(co.id, e.target.checked)}
                  />
                </label>
              </div>
              <div className="access-tile__name" title={co.name}>{co.name}</div>
              <div className="access-tile__meta">Company #{co.id}</div>
              {showRoles && (
                <div
                  className="access-tile__roles"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className={`access-role-chip${checked && role === 'user' ? ' is-on' : ''}`}
                    disabled={!checked}
                    onClick={() => onChangeRole?.(id, 'user')}
                  >
                    <UserRound size={12} /> User
                  </button>
                  <button
                    type="button"
                    className={`access-role-chip access-role-chip--admin${checked && role === 'admin' ? ' is-on' : ''}`}
                    disabled={!checked}
                    onClick={() => onChangeRole?.(id, 'admin')}
                  >
                    <Shield size={12} /> Admin
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedIds.length > 0 && (
        <div className="access-matrix__summary">
          <span className="access-matrix__summary-label">Access granted</span>
          <div className="access-matrix__chips">
            {companies
              .filter((co) => selectedSet.has(String(co.id)))
              .map((co) => {
                const id = String(co.id);
                const role = rolesByCompany[id] || 'user';
                return (
                  <span key={id} className={`access-summary-chip${role === 'admin' ? ' is-admin' : ''}`}>
                    {co.name}
                    {showRoles ? ` · ${role === 'admin' ? 'Admin' : 'User'}` : ''}
                  </span>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Premium picker for granting existing users access when creating a company.
 */
export function UserAccessPicker({
  users = [],
  selectedIds = [],
  rolesByUser = {},
  onChangeIds,
  onChangeRole,
  label = 'Grant Access to Existing Users',
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
      <div className="access-matrix">
        <h4 className="form-section-title" style={{ margin: 0, border: 'none', paddingBottom: 0 }}>{label}</h4>
        <p className="access-matrix__empty">No existing users to assign yet.</p>
      </div>
    );
  }

  return (
    <div className="access-matrix">
      <div className="access-matrix__head">
        <div>
          <h4 className="form-section-title" style={{ margin: 0, border: 'none', paddingBottom: 0 }}>
            {label}
          </h4>
          <p className="access-matrix__hint">
            Optional — give people like Aditya instant access to this new company.
          </p>
        </div>
        <span className="access-matrix__count">{selectedIds.length} selected</span>
      </div>

      <div className="access-matrix__grid access-matrix__grid--users">
        {users.map((u) => {
          const id = String(u.id);
          const checked = selectedSet.has(id);
          const role = rolesByUser[id] || (u.role === 'admin' ? 'admin' : 'user');
          const locked = u.role === 'group_admin';
          return (
            <div
              key={id}
              className={`access-tile access-tile--user${checked ? ' is-active' : ''}`}
              onClick={() => toggle(u.id, !checked)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggle(u.id, !checked);
                }
              }}
            >
              <div className="access-tile__top">
                <div className={`access-tile__avatar access-tile__avatar--user${checked ? ' is-on' : ''}`}>
                  {checked ? <Check size={16} strokeWidth={2.5} /> : initials(u.name)}
                </div>
                <label
                  className="access-tile__check"
                  htmlFor={`${idPrefix}-${id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    id={`${idPrefix}-${id}`}
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => toggle(u.id, e.target.checked)}
                  />
                </label>
              </div>
              <div className="access-tile__name" title={u.name}>{u.name}</div>
              <div className="access-tile__meta" title={u.email}>{u.email}</div>
              <div
                className="access-tile__roles"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className={`access-role-chip${checked && role === 'user' ? ' is-on' : ''}`}
                  disabled={!checked || locked}
                  onClick={() => onChangeRole?.(id, 'user')}
                >
                  <UserRound size={12} /> User
                </button>
                <button
                  type="button"
                  className={`access-role-chip access-role-chip--admin${checked && role === 'admin' ? ' is-on' : ''}`}
                  disabled={!checked || locked}
                  onClick={() => onChangeRole?.(id, 'admin')}
                >
                  <Shield size={12} /> Admin
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
