'use client';

import { useRoomStore } from '../../store/roomStore';

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
];

interface LanguageSelectorProps {
  onLanguageChange: (lang: string) => void;
}

export default function LanguageSelector({ onLanguageChange }: LanguageSelectorProps) {
  const { language, setLanguage } = useRoomStore();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const lang = e.target.value;
    setLanguage(lang);
    onLanguageChange(lang);
  }

  return (
    <select className="lang-selector" value={language} onChange={handleChange}>
      {LANGUAGES.map((l) => (
        <option key={l.value} value={l.value}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
