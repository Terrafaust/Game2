// js/core/translationManager.js (v2.1 - Path Correction)
// Corrects the dynamic import path to go up one level from /core/ to /js/.

import { globalSettingsManager } from './globalSettingsManager.js';
import { loggingSystem } from './loggingSystem.js';

let languagePacks = {};
let currentLanguage = 'en';

const translationManager = {
    async loadLanguagePack(lang = 'en') {
        try {
            // THIS IS THE FIX: Path is now relative to this file's location in /core/
            const packModule = await import(`../lang/${lang}.js`);
            if (packModule.default) {
                languagePacks[lang] = packModule.default;
                loggingSystem.info("TranslationManager", `Language pack for '${lang}' loaded.`);
            } else {
                 throw new Error(`Default export missing in language pack: ${lang}.js`);
            }
        } catch (error) {
            loggingSystem.error("TranslationManager", `Failed to load language pack for '${lang}'. Defaulting to 'en'.`, error);
            if (lang !== 'en') await this.loadLanguagePack('en');
        }
    },

    async initialize() {
        const savedLang = globalSettingsManager.getSetting('language', 'en');
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
            return `{${key}}`;
        }

        for (const placeholder in replacements) {
            text = text.replace(`{${placeholder}}`, replacements[placeholder]);
        }
        return text;
    }
};

export { translationManager };
