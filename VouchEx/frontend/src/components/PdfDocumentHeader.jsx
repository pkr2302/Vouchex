import React, { useCallback, useState } from 'react';
import { CompanyAddressBlock } from './CompanyAddressBlock';
import { isBannerLogoRatio, resolveLogoLayout } from '../utils/logoLayout';
import { companyTradeName } from '../utils/companyDisplay';

/**
 * PDF / print header for invoices and vouchers.
 * Supports compact square logos and wide horizontal letterheads (logo includes company name + tagline).
 */
export function PdfDocumentHeader({ company, rightContent }) {
  const preference = company?.logo_layout || 'auto';
  const [measuredBanner, setMeasuredBanner] = useState(null);
  const logo = company?.logo;

  const onLogoLoad = useCallback((e) => {
    const img = e.currentTarget;
    if (!img?.naturalWidth) return;
    setMeasuredBanner(isBannerLogoRatio(img.naturalWidth, img.naturalHeight));
  }, []);

  const useBanner = Boolean(logo && resolveLogoLayout(preference, measuredBanner));

  if (useBanner) {
    return (
      <div className="pdf-doc-header pdf-doc-header--banner">
        <div className="pdf-logo-banner-wrap">
          <img src={logo} alt="Company logo" className="pdf-logo-banner" onLoad={onLogoLoad} />
        </div>
        <div className="pdf-header-body">
          <div className="pdf-header-company">
            <CompanyAddressBlock company={company} />
            {company?.gstin ? <p className="pdf-header-meta-line">GSTIN: {company.gstin}</p> : null}
            {company?.phone ? <p className="pdf-header-meta-line">Phone: {company.phone}</p> : null}
            {company?.email ? <p className="pdf-header-meta-line">{company.email}</p> : null}
          </div>
          <div className="pdf-header-meta">{rightContent}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pdf-doc-header pdf-doc-header--compact">
      <div className="pdf-header-left">
        {logo ? (
          <img src={logo} alt="Company logo" className="pdf-logo-compact" onLoad={onLogoLoad} />
        ) : null}
        <div>
          <h3 className="pdf-header-company-name">{companyTradeName(company)}</h3>
          <CompanyAddressBlock company={company} />
          {company?.gstin ? <p className="pdf-header-meta-line">GSTIN: {company.gstin}</p> : null}
        </div>
      </div>
      <div className="pdf-header-meta">{rightContent}</div>
    </div>
  );
}

/** Settings preview — shows how the logo will appear on PDFs. */
export function CompanyLogoPreview({ logo, logoLayout = 'auto', className = '' }) {
  const [measuredBanner, setMeasuredBanner] = useState(null);

  const onLogoLoad = useCallback((e) => {
    const img = e.currentTarget;
    if (!img?.naturalWidth) return;
    setMeasuredBanner(isBannerLogoRatio(img.naturalWidth, img.naturalHeight));
  }, []);

  if (!logo) return null;

  const useBanner = resolveLogoLayout(logoLayout, measuredBanner);

  return (
    <img
      src={logo}
      alt="Uploaded corporate logo"
      className={useBanner ? `pdf-logo-banner pdf-logo-preview ${className}` : `pdf-logo-compact pdf-logo-preview ${className}`}
      onLoad={onLogoLoad}
    />
  );
}
