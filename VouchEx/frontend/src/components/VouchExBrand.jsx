/**
 * Full VouchEx lockup (icon + wordmark + tagline) — single asset, do not split.
 */

export const VOUCHEX_LOGO = '/brand/vouchex-logo.svg';
export const VOUCHEX_LOGO_SIDEBAR = '/brand/vouchex-logo-sidebar.svg';

/** Sidebar: one unified logo image. */
export function SidebarBrand() {
  return (
    <div className="sidebar-brand-lockup">
      <img
        src={VOUCHEX_LOGO}
        alt="VouchEx — Accounts made simple"
        className="vouchex-brand vouchex-brand--sidebar"
        decoding="async"
        draggable={false}
      />
    </div>
  );
}

export function MobileHeaderBrand() {
  return (
    <div className="mobile-header-brand mobile-only">
      <img
        src={VOUCHEX_LOGO_SIDEBAR}
        alt="VouchEx"
        className="vouchex-brand vouchex-brand--mobile-header"
        decoding="async"
        draggable={false}
      />
    </div>
  );
}

export function MobileDrawerBrand() {
  return (
    <div className="mobile-drawer-brand">
      <img
        src={VOUCHEX_LOGO_SIDEBAR}
        alt="VouchEx — Accounts made simple"
        className="vouchex-brand vouchex-brand--mobile-drawer"
        decoding="async"
        draggable={false}
      />
    </div>
  );
}

export function VouchExBrand({ variant = 'sidebar', className = '', alt = 'VouchEx' }) {
  if (variant === 'sidebar') {
    return <SidebarBrand />;
  }
  if (variant === 'mobile-header') {
    return <MobileHeaderBrand />;
  }
  if (variant === 'mobile-drawer') {
    return <MobileDrawerBrand />;
  }

  const classMap = {
    logo: 'vouchex-brand vouchex-brand--logo',
    auth: 'vouchex-brand vouchex-brand--auth',
    icon: 'vouchex-brand vouchex-brand--icon',
  };
  const cls = `${classMap[variant] || classMap.logo}${className ? ` ${className}` : ''}`;

  return (
    <img
      src={VOUCHEX_LOGO}
      alt={alt}
      className={cls}
      decoding="async"
      draggable={false}
    />
  );
}

export { VOUCHEX_LOGO as VOUCHEX_BRAND_ASSETS };
