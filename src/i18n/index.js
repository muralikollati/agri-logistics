import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import te from "./te.json";
import ta from "./ta.json";

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  resources: {
    en: { translation: en },
    te: { translation: te },
    ta: { translation: ta },
  },
  lng: "te", // overridden after login with the user's saved language (users/{uid}.language)
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
