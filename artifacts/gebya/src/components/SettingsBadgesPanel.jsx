import { BADGE_DEFINITIONS } from '../utils/badges';
import { useLang } from '../context/LangContext';

export default function SettingsBadgesPanel({ earnedBadges = [] }) {
  const { lang, t } = useLang();

  return (
    <div className="bg-white rounded-2xl border border-green-100/50 overflow-hidden">
      <div className="px-4 pt-4 pb-3">
        {earnedBadges.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-2">{t.noBadges}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {BADGE_DEFINITIONS.filter((badge) => earnedBadges.includes(badge.id)).map((badge) => (
              <div
                key={badge.id}
                className="flex items-center gap-2 px-3 py-2 rounded-2xl"
                style={{ background: 'rgba(196,136,58,0.12)', border: '1.5px solid #C4883A' }}
              >
                <span className="text-xl">{badge.emoji}</span>
                <div>
                  <div className="text-xs font-bold text-green-900">
                    {lang === 'am' ? badge.titleAm : badge.title}
                  </div>
                  <div className="text-xs text-green-700">
                    {lang === 'am' ? badge.descriptionAm : badge.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {earnedBadges.length > 0 && earnedBadges.length < BADGE_DEFINITIONS.length && (
          <p className="text-xs text-gray-400 text-center mt-2">
            {earnedBadges.length} / {BADGE_DEFINITIONS.length} {t.badgesEarned}
          </p>
        )}
      </div>
    </div>
  );
}
