import { useEffect } from 'react';

function isMobile() {
  return typeof window !== 'undefined' && window.innerWidth <= 1024;
}

function bindStepSection(title, idx, sections, form) {
  if (title.dataset.mobileStepBound) return;
  title.dataset.mobileStepBound = '1';

  const section = document.createElement('div');
  section.className = 'mobile-step-section';
  section.dataset.stepIndex = String(idx);
  if (idx > 0) section.classList.add('mobile-step-section--hidden');

  const parent = title.parentNode;
  parent.insertBefore(section, title);
  section.appendChild(title);
  title.classList.add('mobile-step-section__title');

  let el = section.nextSibling;
  while (el) {
    if (el.nodeType === 1 && el.matches?.('h3.form-section-title, h4.form-section-title')) break;
    const next = el.nextSibling;
    section.appendChild(el);
    el = next;
  }

  sections.push(section);
}

function buildStepChrome(form, sections) {
  if (form.querySelector('.mobile-step-chrome')) return;

  const chrome = document.createElement('div');
  chrome.className = 'mobile-step-chrome mobile-only';
  chrome.innerHTML = `
    <div class="mobile-step-chrome__dots" role="tablist" aria-label="Form steps"></div>
    <div class="mobile-step-chrome__actions">
      <button type="button" class="mobile-step-chrome__back" data-no-btn-spinner>Back</button>
      <button type="button" class="mobile-step-chrome__next btn-primary" data-no-btn-spinner>Next</button>
    </div>
  `;

  const dots = chrome.querySelector('.mobile-step-chrome__dots');
  sections.forEach((_, i) => {
    const dot = document.createElement('span');
    dot.className = 'mobile-step-chrome__dot';
    dot.dataset.step = String(i);
    dots.appendChild(dot);
  });

  form.appendChild(chrome);

  let current = 0;

  const update = () => {
    sections.forEach((sec, i) => {
      sec.classList.toggle('mobile-step-section--hidden', i !== current);
    });
    dots.querySelectorAll('.mobile-step-chrome__dot').forEach((d, i) => {
      d.classList.toggle('mobile-step-chrome__dot--active', i === current);
      d.classList.toggle('mobile-step-chrome__dot--done', i < current);
    });
    const backBtn = chrome.querySelector('.mobile-step-chrome__back');
    const nextBtn = chrome.querySelector('.mobile-step-chrome__next');
    backBtn.style.visibility = current === 0 ? 'hidden' : 'visible';
    if (current >= sections.length - 1) {
      nextBtn.textContent = 'Review & save';
      nextBtn.type = 'submit';
      nextBtn.classList.add('mobile-step-chrome__save');
    } else {
      nextBtn.textContent = 'Next';
      nextBtn.type = 'button';
      nextBtn.classList.remove('mobile-step-chrome__save');
    }
    chrome.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  chrome.querySelector('.mobile-step-chrome__back').addEventListener('click', () => {
    if (current > 0) {
      current -= 1;
      update();
    }
  });

  chrome.querySelector('.mobile-step-chrome__next').addEventListener('click', (e) => {
    if (current < sections.length - 1) {
      e.preventDefault();
      current += 1;
      update();
      return;
    }
    e.preventDefault();
    form.noValidate = true;
    if (typeof form.requestSubmit === 'function') {
      const submitBtn = form.querySelector('.btn-row .btn-primary[type="button"], .btn-row button.btn-primary');
      if (submitBtn) submitBtn.click();
      else form.requestSubmit();
    } else {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  });

  update();
}

function enhanceForms() {
  if (!isMobile()) return;
  document.querySelectorAll('.master-form').forEach((form) => {
    if (form.dataset.mobileStepReady) return;
    const titles = [
      ...form.querySelectorAll(
        ':scope > h3.form-section-title, :scope > h4.form-section-title, :scope > div > h3.form-section-title, :scope > div > h4.form-section-title'
      ),
    ];
    if (titles.length < 2) return;

    form.dataset.mobileStepReady = '1';
    form.classList.add('mobile-step-form');
    form.noValidate = true;

    const sections = [];
    titles.forEach((title, idx) => bindStepSection(title, idx, sections, form));
    if (sections.length >= 2) buildStepChrome(form, sections);
  });
}

/** One section visible at a time — thumb-friendly step flow on mobile. */
export default function MobileStepFormEnhancer({ activeTab }) {
  useEffect(() => {
    const run = () => requestAnimationFrame(enhanceForms);
    run();
    window.addEventListener('resize', run);
    const observer = new MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.removeEventListener('resize', run);
      observer.disconnect();
    };
  }, [activeTab]);

  return null;
}
