import { useState, useEffect } from 'react';

export function useTimeOfDay() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const msUntilNextHour = (60 - new Date().getMinutes()) * 60 * 1000;
    let intervalId;
    const timer = setTimeout(() => {
      setTick(t => t + 1);
      intervalId = setInterval(() => setTick(t => t + 1), 60 * 60 * 1000);
    }, msUntilNextHour);
    return () => {
      clearTimeout(timer);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const hour = new Date().getHours();
  let period, greetingEn, greetingAm;

  if (hour < 5) {
    period = 'night';
    greetingEn = 'Good evening';
    greetingAm = 'እንደምን አመሸህ';
  } else if (hour < 12) {
    period = 'morning';
    greetingEn = 'Good morning';
    greetingAm = 'እንደምን አደርክ';
  } else if (hour < 17) {
    period = 'afternoon';
    greetingEn = 'Good afternoon';
    greetingAm = 'እንደምን ዋልክ';
  } else if (hour < 20) {
    period = 'evening';
    greetingEn = 'Good evening';
    greetingAm = 'እንደምን አመሸህ';
  } else {
    period = 'night';
    greetingEn = 'Good evening';
    greetingAm = 'እንደምን አመሸህ';
  }

  return { period, greeting: { en: greetingEn, am: greetingAm } };
}
