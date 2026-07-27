import OnboardingScreen from '../OnboardingScreen';
import StaffJoinScreen from '../StaffJoinScreen';

const P = {
  bg: 'var(--color-bg)',
  header: 'var(--color-primary)',
  border: 'var(--color-border)',
};

export function LoadingScreen({ t }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: P.bg }}>
      <div className="text-center animate-elastic">
        <div className="text-5xl mb-3">📓</div>
        <h1 className="text-2xl font-black font-serif" style={{ color: P.header }}>ገበያ</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--color-text-soft)' }}>{t.loading}</p>
      </div>
    </div>
  );
}

export function StaffJoinScreenView({ onJoined, onBack }) {
  return (
    <StaffJoinScreen
      onJoined={onJoined}
      onBack={onBack}
    />
  );
}

export function OnboardingScreenView({ onComplete, shopProfile }) {
  if (shopProfile && shopProfile.name) return null;
  return (
    <OnboardingScreen onComplete={onComplete} />
  );
}
