import { useState, useEffect } from 'react';

type TranslationFile = 'common' | 'booking' | 'admin' | 'auth';

export function useTranslation(namespace: TranslationFile = 'common') {
  const [translations, setTranslations] = useState<any>({});
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current language from localStorage
    const savedLang = localStorage.getItem('language') || 'en';
    setLanguage(savedLang);

    // Load translations
    loadTranslations(savedLang, namespace);
  }, [namespace]);

  const loadTranslations = async (lang: string, ns: string) => {
    try {
      const response = await fetch(`/locales/${lang}/${ns}.json`);
      if (!response.ok) {
        // Fallback to English if translation file doesn't exist
        const fallbackResponse = await fetch(`/locales/en/${ns}.json`);
        const fallbackData = await fallbackResponse.json();
        setTranslations(fallbackData);
      } else {
        const data = await response.json();
        setTranslations(data);
      }
    } catch (error) {
      console.error('Failed to load translations:', error);
      // Try to load English as fallback
      try {
        const fallbackResponse = await fetch(`/locales/en/${ns}.json`);
        const fallbackData = await fallbackResponse.json();
        setTranslations(fallbackData);
      } catch (fallbackError) {
        console.error('Failed to load fallback translations:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const t = (key: string, params?: Record<string, string>) => {
    // Navigate nested keys (e.g., "hero.title")
    const keys = key.split('.');
    let value: any = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Return the key itself if translation is not found
        return key;
      }
    }

    // If value is not a string, return the key
    if (typeof value !== 'string') {
      return key;
    }

    // Replace parameters if provided
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        value = value.replace(`{{${paramKey}}}`, paramValue);
      });
    }

    return value;
  };

  const changeLanguage = async (newLang: string) => {
    localStorage.setItem('language', newLang);
    setLanguage(newLang);
    await loadTranslations(newLang, namespace);
  };

  return {
    t,
    language,
    changeLanguage,
    loading,
    ready: !loading
  };
}