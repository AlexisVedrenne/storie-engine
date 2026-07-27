// Single source of truth for which languages the app supports — consumed by
// the setup wizard's language step and the settings language picker, so
// adding a language later means adding one entry here, nothing else.
export const SUPPORTED_LOCALES = [
  { code: "fr-FR", label: "Français" },
  { code: "en-US", label: "English" },
];

export const DEFAULT_LOCALE = "fr-FR";
