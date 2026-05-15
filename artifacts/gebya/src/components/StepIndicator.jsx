import { Check } from 'lucide-react';
import { useLang } from '../context/LangContext';

const STEPS = [
  { id: 'details', labelKey: 'stepDetails', labelAmKey: 'stepDetailsAm' },
  { id: 'payment', labelKey: 'stepPayment', labelAmKey: 'stepPaymentAm' },
  { id: 'review',  labelKey: 'stepReview',  labelAmKey: 'stepReviewAm'  },
];

function StepIndicator({ currentStep, onStepClick }) {
  const { t, lang } = useLang();
  const steps = STEPS;

  const getStepState = (stepId) => {
    const currentIdx = steps.findIndex(s => s.id === currentStep);
    const stepIdx   = steps.findIndex(s => s.id === stepId);
    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'current';
    return 'upcoming';
  };

  return (
    <div className="flex items-center justify-center w-full px-2 py-2">
      {steps.map((step, idx) => {
        const state = getStepState(step.id);
        const isClickable = state === 'completed';
        const label = lang === 'am' ? (t[step.labelAmKey] || step.id) : (t[step.labelKey] || step.id);
        const isSmall = typeof window !== 'undefined' && window.innerWidth < 360;

        return (
          <div key={step.id} className="flex items-center flex-1">
            <button
              type="button"
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={`
                flex flex-col items-center justify-center min-w-[44px] min-h-[44px]
                transition-all duration-200 rounded-full
                ${isClickable ? 'cursor-pointer press-scale' : 'cursor-default'}
              `}
              aria-label={`${label}${state === 'completed' ? ' (completed)' : state === 'current' ? ' (current)' : ''}`}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all"
                style={{
                  background: state === 'completed' ? '#2d6a4f'
                       : state === 'current'  ? '#1B4332'
                       : '#e5e7eb',
                  color:  state === 'completed' || state === 'current' ? '#fff' : '#9ca3af',
                  boxShadow: state === 'current' ? '0 0 0 3px rgba(27,67,50,0.15)' : 'none',
                }}
              >
                {state === 'completed' ? (
                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                ) : (
                  <span className="text-[10px] font-black leading-none">{idx + 1}</span>
                )}
              </div>
              {!isSmall && (
                <span
                  className="text-[10px] font-bold mt-1 leading-tight text-center"
                  style={{
                    color: state === 'current' ? '#1B4332'
                         : state === 'completed' ? '#2d6a4f'
                         : '#9ca3af',
                  }}
                >
                  {label}
                </span>
              )}
            </button>
            {idx < steps.length - 1 && (
              <div
                className="flex-1 h-px mx-1 mb-3"
                style={{
                  background: state === 'completed' ? '#2d6a4f' : '#e8e2d8',
                  minWidth: '12px',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default StepIndicator;
