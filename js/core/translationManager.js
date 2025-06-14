// js/core/translationManager.js (v2.4 - Final Guard Fix)
// Adds an isReady flag and function to be used by the UI manager.

import { globalSettingsManager } from './globalSettingsManager.js';
import { loggingSystem } from './loggingSystem.js';

let languagePacks = {};
let currentLanguage = 'en';
let ready = false; // The new readiness flag

const translationManager = {
    // **THE FIX**: New function for the UI manager to check.
    isReady() {
        return ready;
    },

    async loadLanguagePack(lang = 'en') {
        if (languagePacks[lang]) {
            return;
        }
        try {
            const packModule = await import(`../lang/${lang}.js`);
            if (packModule.default) {
                languagePacks[lang] = packModule.default;
                loggingSystem.info("TranslationManager", `Language pack for '${lang}' loaded successfully.`);
            } else {
                 throw new Error(`Default export missing in language pack: ${lang}.js`);
            }
        } catch (error) {
            loggingSystem.error("TranslationManager", `Failed to load language pack for '${lang}'.`, error);
            if (lang !== 'en') await this.loadLanguagePack('en');
        }
    },

    async initialize() {
        // Ensure ready is false at the start
        ready = false; 
        
        await this.loadLanguagePack('en');
        const savedLang = globalSettingsManager.getSetting('language', 'en');
        await this.setLanguage(savedLang); 
        
        // **THE FIX**: Set the ready flag to true at the very end of initialization.
        ready = true;
        loggingSystem.info("TranslationManager", "Translation system is now ready.");
        
        // Dispatch the event *after* setting ready to true, so listeners can proceed.
        document.dispatchEvent(new CustomEvent('languagePackChanged'));

        document.addEventListener('languageChanged', async (event) => {
            await this.setLanguage(event.detail);
            document.dispatchEvent(new CustomEvent('languagePackChanged'));
        });
    },

    async setLanguage(lang) {
        if (!languagePacks[lang]) {
            await this.loadLanguagePack(lang);
        }

        if (languagePacks[lang]) {
            currentLanguage = lang;
        } else {
            currentLanguage = 'en';
            loggingSystem.warn("TranslationManager", `Could not set language to '${lang}', falling back to 'en'.`);
        }
    },

    get(key, replacements = {}) {
        const pack = languagePacks[currentLanguage] || {};
        let text = key.split('.').reduce((obj, i) => obj && obj[i], pack);

        if (text === undefined && currentLanguage !== 'en' && languagePacks['en']) {
             text = key.split('.').reduce((obj, i) => obj && obj[i], languagePacks['en']);
        }

        if (text === undefined) {
            loggingSystem.warn("TranslationManager_Get", `Translation key not found: '${key}' in '${currentLanguage}'.`);
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
