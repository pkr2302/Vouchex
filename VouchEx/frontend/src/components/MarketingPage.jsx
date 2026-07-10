import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUp,
  BarChart3,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Factory,
  FileText,
  Lock,
  Menu,
  Package,
  Play,
  Share2,
  Shield,
  ShoppingBag,
  Star,
  Truck,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { VouchExBrand } from './VouchExBrand';
import MarketingDemoCarousel from './MarketingDemoCarousel';
import '../styles/marketing.css';

const SITE_URL = 'https://vouchex.kuhu.org.in';

const NAV_LINKS = [
  { id: 'mkt-demo', label: '2 Min Demo' },
  { id: 'mkt-solution', label: 'Solution' },
  { id: 'mkt-why', label: 'Why VouchEx' },
  { id: 'mkt-industry', label: 'Industry' },
  { id: 'mkt-security', label: 'Security' },
  { id: 'mkt-reviews', label: 'Reviews' },
];

const TRUST_ITEMS = [
  'GST Ready',
  'MSME Friendly',
  'Secure Cloud Backup',
  'Multi-user Access',
  'Made in India 🇮🇳',
];

const FEATURES = [
  { icon: FileText, title: 'GST Invoicing & E-Way Bill', desc: 'B2B, B2C, export invoices with e-invoice and e-way bill readiness.' },
  { icon: Package, title: 'Inventory Management', desc: 'Track stock, consumption, and item-wise GST across purchases and sales.' },
  { icon: BarChart3, title: 'Real-Time Accounting', desc: 'Auto-posted general ledger from every voucher — always up to date.' },
  { icon: BarChart3, title: 'Financial Reports & P&L', desc: 'Trial balance, profit & loss, and balance sheet from your books.' },
  { icon: Users, title: 'Multi-User Access & Audit Trail', desc: 'Role-based access with login logs and change history for compliance.' },
  { icon: Cloud, title: 'Cloud Backup & Security', desc: 'Encrypted cloud storage with scheduled backups and secure access.' },
];

const COMPARE_ROWS = [
  ['Cloud Access', true, false],
  ['Multi-user', true, 'Limited'],
  ['Auto Backup', true, false],
  ['GST Compliance', true, 'Partial'],
  ['Real-time Reports', true, false],
];

const INDUSTRIES = [
  { icon: Truck, label: 'Trading' },
  { icon: Factory, label: 'Manufacturing' },
  { icon: Wrench, label: 'Services' },
  { icon: ShoppingBag, label: 'Retail' },
  { icon: Briefcase, label: 'Professionals' },
  { icon: Building2, label: 'CA Firms' },
];

const SECURITY = [
  { icon: Lock, title: 'Bank-grade Security', desc: 'Encrypted sessions and secure authentication.' },
  { icon: Cloud, title: 'Daily Cloud Backup', desc: 'Automated backup routines for peace of mind.' },
  { icon: Shield, title: 'Role-based Access', desc: 'Control who sees and edits financial data.' },
  { icon: FileText, title: 'Audit Logs', desc: 'Full trail of logins and critical changes.' },
];

const TESTIMONIALS = [
  {
    quote: 'VouchEx cut our GST filing prep from days to hours. Clients love the clean invoice PDFs and real-time books.',
    name: 'CA Priya Mehta',
    role: 'Chartered Accountant',
    company: 'Mehta & Associates, Ahmedabad',
  },
  {
    quote: 'We moved from spreadsheets to VouchEx for inventory and invoicing. The trial was genuinely full-featured.',
    name: 'Rajesh Shah',
    role: 'Trader',
    company: 'Shah Trading Co., Surat',
  },
  {
    quote: 'As an SME owner I needed something simpler than desktop software but powerful enough for my CA. VouchEx fits perfectly.',
    name: 'Anita Desai',
    role: 'SME Owner',
    company: 'Desai Engineering Works',
  },
];

function useAnimatedCounter(target, duration = 1800, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return undefined;
    let frame;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      setValue(Math.floor(target * (1 - (1 - p) ** 3)));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, start]);
  return value;
}

function StatCounter({ target, suffix, label, active }) {
  const n = useAnimatedCounter(target, 1600, active);
  return (
    <div className="mkt-stat">
      <strong>{n.toLocaleString('en-IN')}{suffix}</strong>
      <span>{label}</span>
    </div>
  );
}

function HelpCenterModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="mkt-modal-overlay" onClick={onClose} role="presentation">
      <div className="mkt-modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="mkt-help-title">
        <h3 id="mkt-help-title">Help Centre</h3>
        <p className="mkt-modal-body">
          For any query regarding VouchEx, billing, or your account, please reach us on:
        </p>
        <ul className="mkt-help-list">
          <li><strong>Phone:</strong> +91 8655235466 or +91 8160784999</li>
          <li><strong>Email:</strong> rajatlakhani2@gmail.com</li>
          <li><strong>Email:</strong> rajpopatpriyank@gmail.com</li>
        </ul>
        <p className="mkt-modal-note">Our team typically responds within one business day.</p>
        <button type="button" className="mkt-btn-primary mkt-btn-lg" onClick={onClose}>OK</button>
      </div>
    </div>
  );
}

export default function MarketingPage({ onStartTrial, onSignIn, trialDays = 30 }) {
  const [navSolid, setNavSolid] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [copyToast, setCopyToast] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const statsRef = useRef(null);
  const testimonialPauseRef = useRef(false);

  const scrollToId = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileNavOpen(false);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileNavOpen]);

  useEffect(() => {
    const onScroll = () => {
      setNavSolid(window.scrollY > 8);
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return undefined;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      if (testimonialPauseRef.current) return;
      setTestimonialIdx((i) => (i + 1) % TESTIMONIALS.length);
    }, 14000);
    return () => clearInterval(t);
  }, []);

  const copySiteLink = async () => {
    try {
      await navigator.clipboard.writeText(SITE_URL);
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 3500);
    } catch {
      window.prompt('Copy this link:', SITE_URL);
    }
  };

  const t = TESTIMONIALS[testimonialIdx];
  const prevReview = () => {
    testimonialPauseRef.current = true;
    setTestimonialIdx((i) => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  };
  const nextReview = () => {
    testimonialPauseRef.current = true;
    setTestimonialIdx((i) => (i + 1) % TESTIMONIALS.length);
  };

  return (
    <div className="mkt-page">
      <div className="mkt-bg-glow mkt-bg-glow--1" aria-hidden />
      <div className="mkt-bg-glow mkt-bg-glow--2" aria-hidden />

      <header className={`mkt-sticky-header ${navSolid ? 'mkt-sticky-header--solid' : ''}`}>
        <div className="mkt-header-inner">
          <div className="mkt-top-bar__logo">
            <VouchExBrand variant="auth" className="mkt-header-logo" />
          </div>
          <button
            type="button"
            className="mkt-mobile-menu-btn"
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <nav className="mkt-subnav mkt-subnav--desktop" aria-label="Page sections">
            {NAV_LINKS.map(({ id, label }) => (
              <button key={id} type="button" onClick={() => scrollToId(id)}>{label}</button>
            ))}
          </nav>
          <div className="mkt-top-bar__actions">
            <button type="button" className="mkt-btn-primary mkt-btn-header" onClick={onSignIn}>Sign In</button>
            <button type="button" className="mkt-btn-primary mkt-btn-header" onClick={onStartTrial}>Start Free Trial</button>
          </div>
        </div>
      </header>

      {mobileNavOpen && (
        <>
          <button
            type="button"
            className="mkt-mobile-nav-backdrop"
            aria-label="Close menu"
            onClick={() => setMobileNavOpen(false)}
          />
          <nav className="mkt-mobile-nav-drawer" aria-label="Mobile page sections">
            {NAV_LINKS.map(({ id, label }) => (
              <button key={id} type="button" onClick={() => scrollToId(id)}>{label}</button>
            ))}
            <div className="mkt-mobile-nav-drawer__actions">
              <button type="button" className="mkt-btn-primary mkt-btn-lg" onClick={() => { setMobileNavOpen(false); onSignIn(); }}>Sign In</button>
              <button type="button" className="mkt-btn-primary mkt-btn-lg" onClick={() => { setMobileNavOpen(false); onStartTrial(); }}>Start Free Trial</button>
            </div>
          </nav>
        </>
      )}

      <div className="mkt-sticky-spacer" aria-hidden />

      <section className="mkt-hero">
        <div className="mkt-hero-inner">
          <h1>
            Complete{' '}
            <span className="mkt-gradient-text">GST</span>
            {' & '}
            <span className="mkt-gradient-text mkt-gradient-text--green">Accounting Platform</span>
            {' '}for SMEs and Chartered Accountants
          </h1>
          <p className="mkt-hero-sub">
            Manage invoicing, GST compliance, inventory, financial reports, and business accounting from a single cloud platform.
          </p>
          <div className="mkt-hero-cta">
            <button type="button" className="mkt-btn-primary mkt-btn-lg" onClick={onStartTrial}>
              Start {trialDays}-Day Free Trial
              <ArrowRight size={18} aria-hidden />
            </button>
            <button type="button" className="mkt-btn-outline mkt-btn-lg" onClick={() => scrollToId('mkt-demo')}>
              <Play size={16} aria-hidden />
              Watch 2-Min Demo
            </button>
          </div>
          <ul className="mkt-trust-row">
            {TRUST_ITEMS.map((item) => (
              <li key={item}><CheckCircle2 size={15} aria-hidden />{item}</li>
            ))}
          </ul>
          <p className="mkt-social-proof-title">Trusted by Businesses and Chartered Accountants Across India</p>
          <div className="mkt-stats" ref={statsRef}>
            <StatCounter target={500} suffix="+" label="Businesses" active={statsVisible} />
            <StatCounter target={100} suffix="+" label="CAs" active={statsVisible} />
            <StatCounter target={10000} suffix="+" label="Invoices Generated" active={statsVisible} />
          </div>
        </div>
      </section>

      <section id="mkt-demo" className="mkt-showcase">
        <div className="mkt-container">
          <h2 className="mkt-section-title">See VouchEx in Action</h2>
          <p className="mkt-section-lead mkt-section-lead--center">Real portal screens — dashboard, Company 360, and financial statements.</p>
          <MarketingDemoCarousel autoMs={12000} />
        </div>
      </section>

      <section className="mkt-section mkt-section--light" id="mkt-solution">
        <div className="mkt-container">
          <h2 className="mkt-section-title">Everything Your Business Needs</h2>
          <p className="mkt-section-lead">One platform for invoicing, compliance, inventory, and financial reporting.</p>
          <div className="mkt-features-grid">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <article key={title} className="mkt-feature-card">
                <div className="mkt-feature-icon"><Icon size={22} aria-hidden /></div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mkt-section" id="mkt-why">
        <div className="mkt-container mkt-container--narrow">
          <h2 className="mkt-section-title">Why Businesses Choose VouchEx</h2>
          <div className="mkt-compare-wrap">
            <table className="mkt-compare">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>VouchEx</th>
                  <th>Traditional Software</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map(([feature, vx, trad]) => (
                  <tr key={feature}>
                    <td>{feature}</td>
                    <td>{vx === true ? <Check className="mkt-check" size={18} aria-label="Yes" /> : vx}</td>
                    <td>{trad === false ? <X className="mkt-cross" size={18} aria-label="No" /> : trad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mkt-section mkt-section--light" id="mkt-industry">
        <div className="mkt-container">
          <h2 className="mkt-section-title">Built for Every Industry</h2>
          <div className="mkt-industries">
            {INDUSTRIES.map(({ icon: Icon, label }) => (
              <div key={label} className="mkt-industry">
                <div className="mkt-industry-icon"><Icon size={22} aria-hidden /></div>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mkt-section" id="mkt-security">
        <div className="mkt-container">
          <h2 className="mkt-section-title">Enterprise-Grade Security</h2>
          <p className="mkt-section-lead mkt-section-lead--center">
            Your financial data is encrypted and securely stored in the cloud.
          </p>
          <div className="mkt-security-grid">
            {SECURITY.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="mkt-security-card">
                <Icon size={24} aria-hidden />
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mkt-section mkt-section--light" id="mkt-reviews">
        <div className="mkt-container mkt-container--narrow">
          <h2 className="mkt-section-title">What Our Users Say</h2>
          <div className="mkt-testimonial" role="region" aria-live="polite">
            <button type="button" className="mkt-carousel-arrow mkt-carousel-arrow--left mkt-carousel-arrow--inline" onClick={prevReview} aria-label="Previous review">
              <ChevronLeft size={22} />
            </button>
            <div className="mkt-testimonial__body">
              <div className="mkt-stars" aria-hidden>
                {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={16} fill="currentColor" />)}
              </div>
              <blockquote>&ldquo;{t.quote}&rdquo;</blockquote>
              <footer>
                <strong>{t.name}</strong>
                <span>{t.role} · {t.company}</span>
              </footer>
              <div className="mkt-carousel-dots">
                {TESTIMONIALS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={i === testimonialIdx ? 'active' : ''}
                    aria-label={`Review ${i + 1}`}
                    onClick={() => { testimonialPauseRef.current = true; setTestimonialIdx(i); }}
                  />
                ))}
              </div>
            </div>
            <button type="button" className="mkt-carousel-arrow mkt-carousel-arrow--right mkt-carousel-arrow--inline" onClick={nextReview} aria-label="Next review">
              <ChevronRight size={22} />
            </button>
          </div>
        </div>
      </section>

      <section className="mkt-section mkt-final-cta">
        <div className="mkt-container">
          <div className="mkt-cta-card">
            <h2>Ready to simplify your accounting?</h2>
            <p>Start your {trialDays}-day free trial today. No credit card required.</p>
            <div className="mkt-hero-cta mkt-hero-cta--center">
              <button type="button" className="mkt-btn-primary mkt-btn-lg" onClick={onStartTrial}>Start Free Trial</button>
              <a className="mkt-btn-outline mkt-btn-lg" href="mailto:rajpopatpriyank@gmail.com?subject=VouchEx%20Demo%20Request">Book Demo</a>
            </div>
          </div>
        </div>
      </section>

      <footer className="mkt-footer">
        <div className="mkt-container mkt-footer-grid">
          <div className="mkt-footer-brand">
            <VouchExBrand variant="auth" className="mkt-footer-logo" />
          </div>
          <div>
            <h4>Products</h4>
            <ul className="mkt-footer-plain">
              <li>Accounting</li>
              <li>GST</li>
              <li>Inventory</li>
              <li>Reports</li>
            </ul>
          </div>
          <div>
            <h4>Support</h4>
            <ul>
              <li>
                <button type="button" onClick={() => setHelpOpen(true)}>Help Centre</button>
              </li>
            </ul>
            <button type="button" className="mkt-share-btn" onClick={copySiteLink} aria-label="Copy website link">
              <Share2 size={18} />
            </button>
          </div>
        </div>
        <div className="mkt-footer-legal">
          <a href="/privacy-policy" rel="nofollow">Privacy Policy</a>
          <span aria-hidden>·</span>
          <a href="/terms-of-service" rel="nofollow">Terms of Service</a>
        </div>
        <p className="mkt-footer-copy">© 2026 VouchEx. All Rights Reserved.</p>
      </footer>

      {showScrollTop && (
        <button type="button" className="mkt-scroll-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Scroll to top">
          <ArrowUp size={22} />
        </button>
      )}

      {copyToast && (
        <div className="mkt-toast" role="status">
          Website link — &quot;{SITE_URL}&quot; has been copied to your clipboard.
        </div>
      )}

      <HelpCenterModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
