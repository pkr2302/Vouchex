import { useEffect } from 'react';

function isMobile() {
  return typeof window !== 'undefined' && window.innerWidth <= 1024;
}

function bindSection(title, idx) {
  if (title.dataset.mobileAccordionBound) return;
  title.dataset.mobileAccordionBound = '1';

  const section = document.createElement('div');
  section.className = 'mobile-form-section';
  if (idx > 0) section.classList.add('mobile-form-section--collapsed');

  const parent = title.parentNode;
  parent.insertBefore(section, title);
  section.appendChild(title);
  title.classList.add('mobile-form-section__toggle');
  title.setAttribute('role', 'button');
  title.setAttribute('tabindex', '0');

  let el = section.nextSibling;
  while (el) {
    if (el.nodeType === 1 && el.matches?.('h3.form-section-title, h4.form-section-title')) break;
    const next = el.nextSibling;
    section.appendChild(el);
    el = next;
  }

  const toggle = () => section.classList.toggle('mobile-form-section--collapsed');
  title.addEventListener('click', toggle);
  title.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  });
}

function enhanceForms() {
  if (!isMobile()) return;
  document.querySelectorAll('.master-form').forEach((form) => {
    if (form.dataset.mobileAccordionReady) return;
    form.dataset.mobileAccordionReady = '1';
    form.classList.add('mobile-form-accordion');
    const titles = [...form.querySelectorAll(':scope > h3.form-section-title, :scope > h4.form-section-title, :scope > div > h3.form-section-title, :scope > div > h4.form-section-title')];
    titles.forEach((title, idx) => bindSection(title, idx));
  });
}

/** Auto-collapse master-form sections on mobile (first section open). */
export default function MobileFormAccordionEnhancer({ activeTab }) {
  useEffect(() => {
    const run = () => {
      requestAnimationFrame(enhanceForms);
    };
    run();
    window.addEventListener('resize', run);
    return () => window.removeEventListener('resize', run);
  }, [activeTab]);

  return null;
}
