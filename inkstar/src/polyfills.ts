// Hermes ships without Intl.PluralRules; the chart engine's bundled i18next asks for it at start-up.
// Neither it nor our own strings use plural forms, so a single-category shim is sufficient.
const intl = Intl as unknown as { PluralRules?: unknown };
if (!intl.PluralRules) {
  intl.PluralRules = class {
    static supportedLocalesOf() {
      return [];
    }
    select() {
      return 'other';
    }
    resolvedOptions() {
      return { locale: 'en', pluralCategories: ['other'] };
    }
  };
}

export {};
