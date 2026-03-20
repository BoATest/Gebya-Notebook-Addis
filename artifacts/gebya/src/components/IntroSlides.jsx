import { useState } from 'react';
import db from '../db';
import { useLang } from '../context/LangContext';

const slides = [
  {
    emoji: '📒',
    titleKey: 'introSlide1Title',
    bodyKey: 'introSlide1Body',
    bg: '#1B4332',
    accent: '#C4883A',
  },
  {
    emoji: '💰',
    titleKey: 'introSlide2Title',
    bodyKey: 'introSlide2Body',
    bg: '#14532d',
    accent: '#86efac',
  },
  {
    emoji: '⚡',
    titleKey: 'introSlide3Title',
    bodyKey: 'introSlide3Body',
    bg: '#163a2a',
    accent: '#D4654A',
  },
];

function IntroSlides({ onDone }) {
  const { t } = useLang();
  const [index, setIndex] = useState(0);

  const slide = slides[index];
  const isLast = index === slides.length - 1;

  const handleNext = () => {
    if (isLast) {
      finish();
    } else {
      setIndex(i => i + 1);
    }
  };

  const finish = async () => {
    await db.settings.put({ key: 'intro_seen', value: 'yes' });
    onDone();
  };

  return (
    <div
      className="min-h-screen flex flex-col texture-noise"
      style={{ background: slide.bg, transition: 'background 0.4s ease' }}
    >
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="text-8xl mb-8 animate-elastic" style={{ lineHeight: 1 }}>{slide.emoji}</div>

        <h1
          className="text-3xl font-black text-white mb-4 leading-tight font-serif animate-slide-up"
        >
          {t[slide.titleKey]}
        </h1>

        <p
          className="text-base font-medium leading-relaxed font-sans animate-fade"
          style={{ color: 'rgba(255,255,255,0.75)', maxWidth: '300px' }}
        >
          {t[slide.bodyKey]}
        </p>
      </div>

      <div className="px-6 pb-12">
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all"
              style={{
                width: i === index ? '28px' : '8px',
                height: '8px',
                background: i === index ? '#fff' : 'rgba(255,255,255,0.35)',
              }}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="w-full py-4 font-black text-base transition-all active:scale-95 press-scale"
          style={{
            background: '#fff',
            color: slide.bg,
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 5px 0 rgba(0,0,0,0.2), var(--shadow-md)',
          }}
        >
          {isLast ? t.introLetsStart : t.introNext}
        </button>

        {!isLast && (
          <button
            onClick={finish}
            className="w-full mt-3 py-2 font-semibold text-sm font-sans"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            {t.introSkip}
          </button>
        )}
      </div>
    </div>
  );
}

export default IntroSlides;
