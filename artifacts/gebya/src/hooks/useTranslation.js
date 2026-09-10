import { useLang } from '../context/LangContext';

export function useTranslation() {
  const { lang } = useLang();
  return (en, am) => lang === 'am' ? am : en;
}
