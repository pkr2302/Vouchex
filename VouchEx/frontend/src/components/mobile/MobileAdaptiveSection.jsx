import MobileCollapsibleSection from './MobileCollapsibleSection';

/** Desktop: children always visible. Mobile: collapsible section. */
export default function MobileAdaptiveSection({
  title,
  subtitle,
  defaultOpenMobile = false,
  children,
  className = '',
}) {
  return (
    <>
      <div className={`desktop-only ${className}`}>{children}</div>
      <div className="mobile-only">
        <MobileCollapsibleSection
          title={title}
          subtitle={subtitle}
          defaultOpen={defaultOpenMobile}
          className={className}
        >
          {children}
        </MobileCollapsibleSection>
      </div>
    </>
  );
}
