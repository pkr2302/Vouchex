import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DEMO_SLIDES = [
  {
    src: '/brand/demo/dashboard.png',
    alt: 'VouchEx Dashboard — sales, GST, and activity overview',
    caption: 'Dashboard — KPIs, compliance, and recent activity',
  },
  {
    src: '/brand/demo/company-360.png',
    alt: 'VouchEx Company 360 — receivables, payables, and cash view',
    caption: 'Company 360 — complete financial snapshot',
  },
  {
    src: '/brand/demo/financials.png',
    alt: 'VouchEx Financial Statements — trial balance, P&L, balance sheet',
    caption: 'Financial Statements — trial balance, P&L & balance sheet',
  },
];

export default function MarketingDemoCarousel({ autoMs = 12000 }) {
  const [idx, setIdx] = useState(0);
  const pauseUntilRef = useRef(0);

  const bumpPause = useCallback(() => {
    pauseUntilRef.current = Date.now() + autoMs * 2;
  }, [autoMs]);

  const goTo = useCallback((nextIdx) => {
    bumpPause();
    setIdx(((nextIdx % DEMO_SLIDES.length) + DEMO_SLIDES.length) % DEMO_SLIDES.length);
  }, [bumpPause]);

  const prev = useCallback(() => {
    bumpPause();
    setIdx((i) => (i - 1 + DEMO_SLIDES.length) % DEMO_SLIDES.length);
  }, [bumpPause]);

  const next = useCallback(() => {
    bumpPause();
    setIdx((i) => (i + 1) % DEMO_SLIDES.length);
  }, [bumpPause]);

  useEffect(() => {
    const t = setInterval(() => {
      if (Date.now() < pauseUntilRef.current) return;
      setIdx((i) => (i + 1) % DEMO_SLIDES.length);
    }, autoMs);
    return () => clearInterval(t);
  }, [autoMs]);

  const slide = DEMO_SLIDES[idx];

  return (
    <div className="mkt-demo-carousel">
      <div className="mkt-demo-carousel__frame">
        <button
          type="button"
          className="mkt-carousel-arrow mkt-carousel-arrow--left"
          onClick={(e) => { e.stopPropagation(); prev(); }}
          aria-label="Previous screenshot"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="mkt-demo-carousel__viewport">
          {DEMO_SLIDES.map((s, i) => (
            <img
              key={s.src}
              src={s.src}
              alt={s.alt}
              className={`mkt-demo-carousel__img${i === idx ? ' is-active' : ''}`}
              loading={i === 0 ? 'eager' : 'lazy'}
              draggable={false}
            />
          ))}
        </div>
        <button
          type="button"
          className="mkt-carousel-arrow mkt-carousel-arrow--right"
          onClick={(e) => { e.stopPropagation(); next(); }}
          aria-label="Next screenshot"
        >
          <ChevronRight size={24} />
        </button>
      </div>
      <p className="mkt-demo-carousel__caption">{slide.caption}</p>
      <div className="mkt-carousel-dots">
        {DEMO_SLIDES.map((s, i) => (
          <button
            key={s.src}
            type="button"
            className={i === idx ? 'active' : ''}
            aria-label={`Screenshot ${i + 1}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div>
  );
}
