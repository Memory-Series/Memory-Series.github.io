import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import zh from "./locales/zh.json";
import { resolveInitialLng } from "./lib/i18n-storage";

// i18n-002: persisted language preference.
// - Initial language resolved from localStorage -> navigator.language -> "zh".
// - fallbackLng is "en" so missing Chinese strings in en mode stay en (not en->zh
//   and not zh->en in zh mode). Symmetric per-locale fallback is the safe default.
const initialLng = resolveInitialLng();

i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    en: { translation: en },
  },
  lng: initialLng,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;