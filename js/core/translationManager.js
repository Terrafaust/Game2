// js/core/translationManager.js (v2.0 - Bugfix)
// Corrects the initialize function to be async to handle await for language packs.

import { globalSettingsManager } from './globalSettingsManager.js';
import { loggingSystem } from './loggingSystem.js';

let languagePacks = {};
let currentLanguage = 'en';

const translationManager = {
    async loadLanguagePack(lang = 'en') {
        try {
            const packModule = await import(`../lang/${lang}.js`);
            if (packModule.default) {
                languagePacks[lang] = packModule.default;
                loggingSystem.info("TranslationManager", `Language pack for '${lang}' loaded.`);
            } else {
                 throw new Error(`Default export missing in language pack: ${lang}.js`);
            }
        } catch (error) {
            loggingSystem.error("TranslationManager", `Failed to load language pack for '${lang}'. Defaulting to 'en'.`, error);
            if (lang !== 'en') await this.loadLanguagePack('en'); // Fallback to English
        }
    },

    // THIS IS THE FIX: The initialize function must be async.
    async initialize() {
        const savedLang = globalSettingsManager.getSetting('language', 'en');
        // We must await the setLanguage function to ensure the initial pack is loaded before the game continues.
        await this.setLanguage(savedLang); 
        
        document.addEventListener('languageChanged', (event) => {
            this.setLanguage(event.detail);
        });
    },

    async setLanguage(lang) {
        if (!languagePacks[lang]) {
            await this.loadLanguagePack(lang);
        }
        currentLanguage = lang;
        document.dispatchEvent(new CustomEvent('languagePackChanged'));
    },

    get(key, replacements = {}) {
        const pack = languagePacks[currentLanguage] || languagePacks['en'] || {};
        let text = key.split('.').reduce((obj, i) => obj && obj[i], pack);

        if (text === undefined) {
            loggingSystem.warn("TranslationManager", `Translation key not found: '${key}' for language '${currentLanguage}'.`);
            return `{${key}}`; // Return the key itself as a fallback
        }

        for (const placeholder in replacements) {
            text = text.replace(`{${placeholder}}`, replacements[placeholder]);
        }
        return text;
    }
};

export { translationManager };
