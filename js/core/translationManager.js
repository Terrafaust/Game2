// js/core/translationManager.js (v2.2 - Robust Language Handling)
// Pre-loads English as a fallback and ensures the entire UI can react to language changes.
// Handles asynchronous events correctly and provides better fallbacks for missing keys.

import { globalSettingsManager } from './globalSettingsManager.js';
import { loggingSystem } from './loggingSystem.js';

let languagePacks = {};
let currentLanguage = 'en';

const translationManager = {
    async loadLanguagePack(lang = 'en') {
        // Prevent re-loading if the pack already exists
        if (languagePacks[lang]) {
            loggingSystem.debug("TranslationManager", `Language pack for '${lang}' already loaded.`);
            return;
        }
        try {
            // Path is relative to this file's location in /core/
            const packModule = await import(`../lang/${lang}.js`);
            if (packModule.default) {
                languagePacks[lang] = packModule.default;
                loggingSystem.info("TranslationManager", `Language pack for '${lang}' loaded.`);
            } else {
                 throw new Error(`Default export missing in language pack: ${lang}.js`);
            }
        } catch (error) {
            loggingSystem.error("TranslationManager", `Failed to load language pack for '${lang}'. Defaulting to 'en'.`, error);
            // If the failed language wasn't 'en', attempt to load 'en' as a fallback.
            if (lang !== 'en') {
                await this.loadLanguagePack('en');
            }
        }
    },

    async initialize() {
        // Load English first to ensure there's always a base fallback.
        await this.loadLanguagePack('en');

        const savedLang = globalSettingsManager.getSetting('language', 'en');
        // This will set the language, load the pack if it's not 'en', and fire the event.
        await this.setLanguage(savedLang); 
        
        // MODIFICATION: Make the listener async to properly wait for the language pack to load.
        document.addEventListener('languageChanged', async (event) => {
            await this.setLanguage(event.detail);
        });
    },

    async setLanguage(lang) {
        if (!languagePacks[lang]) {
            await this.loadLanguagePack(lang);
        }

        // After attempting to load, set language to what's available (desired lang or 'en' fallback)
        if (languagePacks[lang]) {
            currentLanguage = lang;
        } else {
            currentLanguage = 'en'; // Fallback to english if desired lang failed to load
        }

        loggingSystem.info("TranslationManager", `Language set to '${currentLanguage}'. Dispatching languagePackChanged event.`);
        document.dispatchEvent(new CustomEvent('languagePackChanged'));
    },

    get(key, replacements = {}) {
        const pack = languagePacks[currentLanguage] || languagePacks['en'] || {};
        let text = key.split('.').reduce((obj, i) => obj && obj[i], pack);

        // MODIFICATION: If key not found in current language, explicitly try English as a fallback.
        if (text === undefined && currentLanguage !== 'en' && languagePacks['en']) {
             text = key.split('.').reduce((obj, i) => obj && obj[i], languagePacks['en']);
        }

        if (text === undefined) {
            loggingSystem.warn("TranslationManager", `Translation key not found: '${key}' for language '${currentLanguage}'.`);
            return `{${key}}`;
        }
        
        // MODIFICATION: Use a global regex for replacement to handle multiple identical placeholders.
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
