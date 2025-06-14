// js/core/translationManager.js (v2.5 - Simplified Lifecycle)
// Simplifies the initialization lifecycle to prevent race conditions.
// The ready flag is now the single source of truth for loading status.

import { globalSettingsManager } from './globalSettingsManager.js';
import { loggingSystem } from './loggingSystem.js';

let languagePacks = {};
let currentLanguage = 'en';
let ready = false;

const translationManager = {
    isReady() {
        return ready;
    },

    async loadLanguagePack(lang) {
        // Prevent re-loading
        if (languagePacks[lang]) {
            return true;
        }
        try {
            const packModule = await import(`../lang/${lang}.js`);
            if (packModule.default) {
                languagePacks[lang] = packModule.default;
                loggingSystem.info("TranslationManager", `Language pack for '${lang}' loaded successfully.`);
                return true;
            }
            throw new Error(`Default export missing in language pack: ${lang}.js`);
        } catch (error) {
            loggingSystem.error("TranslationManager", `Failed to load language pack for '${lang}'.`, error);
            return false;
        }
    },

    async initialize() {
        ready = false;
        
        // Always load English as a fallback
        const englishLoaded = await this.loadLanguagePack('en');
        if (!englishLoaded) {
            // If English fails to load, something is fundamentally wrong.
            loggingSystem.error("TranslationManager", "CRITICAL: English language pack failed to load. Translations will not work.");
            ready = true; // Set ready anyway so game doesn't hang
            return;
        }

        const savedLang = globalSettingsManager.getSetting('language', 'en');
        if (savedLang !== 'en') {
            await this.loadLanguagePack(savedLang);
        }
        
        // Set the current language *after* attempting to load it.
        if (languagePacks[savedLang]) {
            currentLanguage = savedLang;
        } else {
            currentLanguage = 'en'; // Fallback
        }
        
        // Add the listener for future changes.
        document.addEventListener('languageChanged', async (event) => {
            await this.setLanguage(event.detail);
        });

        // Set ready to true only at the very end.
        ready = true;
        loggingSystem.info("TranslationManager", `Translation system is now ready. Current language: '${currentLanguage}'.`);
    },

    async setLanguage(lang) {
        const langLoaded = await this.loadLanguagePack(lang);
        if (langLoaded) {
            currentLanguage = lang;
            loggingSystem.info("TranslationManager", `Language changed to '${lang}'.`);
            // This event is for mid-game refreshes.
            document.dispatchEvent(new CustomEvent('languagePackChanged'));
        } else {
            loggingSystem.warn("TranslationManager", `Could not switch to language '${lang}'. It failed to load.`);
        }
    },

    get(key, replacements = {}) {
        const pack = languagePacks[currentLanguage] || languagePacks['en'] || {};
        let text = key.split('.').reduce((obj, i) => obj && obj[i], pack);

        if (text === undefined && currentLanguage !== 'en') {
             text = key.split('.').reduce((obj, i) => obj && obj[i], languagePacks['en']);
        }

        if (text === undefined) {
            loggingSystem.warn("TranslationManager_Get", `Key not found: '${key}' in '${currentLanguage}'.`);
            return `{${key}}`;
        }
        
        for (const placeholder in replacements) {
            text = text.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), replacements[placeholder]);
        }
        return text;
    },

    getCurrentLanguage() {
        return currentLanguage;
    }
};

export { translationManager };
