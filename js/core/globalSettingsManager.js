// js/core/globalSettingsManager.js (v1.1 - Theme Event Detail Fix)

/**
 * @file globalSettingsManager.js
 * @description Manages global user-configurable settings for the game.
 * v1.1: Ensures 'themeChanged' event detail contains correct structure.
 */

import { loggingSystem } from './loggingSystem.js';

const SETTINGS_STORAGE_KEY = 'incrementalGameGlobalSettings';

const defaultSettings = {
    theme: {
        name: 'modern', 
        mode: 'day',    
    },
    language: 'en', 
    volume: {
        master: 0.8,
        music: 0.5,
        sfx: 0.7,
    },
    showNotifications: true,
};

let currentSettings = { ...defaultSettings }; 

const globalSettingsManager = {
    initialize() {
        this.loadSettings();
        loggingSystem.info("GlobalSettingsManager", "Global Settings Manager initialized.", this.getAllSettings());
    },

    loadSettings() {
        try {
            const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (storedSettings) {
                const parsedSettings = JSON.parse(storedSettings);
                currentSettings = this._deepMerge(defaultSettings, parsedSettings);
                loggingSystem.info("GlobalSettingsManager", "Settings loaded from storage.");
            } else {
                loggingSystem.info("GlobalSettingsManager", "No settings found in storage. Using default settings.");
                currentSettings = JSON.parse(JSON.stringify(defaultSettings)); // Deep copy
                this.saveSettings(); 
            }
        } catch (error) {
            loggingSystem.error("GlobalSettingsManager", "Error loading settings from storage. Using defaults.", error);
            currentSettings = JSON.parse(JSON.stringify(defaultSettings));
        }
        // Dispatch theme change after loading settings so UI can pick up initial theme
        document.dispatchEvent(new CustomEvent('themeChanged', { 
            detail: { 
                name: currentSettings.theme.name, 
                mode: currentSettings.theme.mode 
            } 
        }));
        loggingSystem.debug("GlobalSettingsManager_Load", `Dispatched initial themeChanged event: name=${currentSettings.theme.name}, mode=${currentSettings.theme.mode}`);

    },

    saveSettings() {
        try {
            const settingsString = JSON.stringify(currentSettings);
            localStorage.setItem(SETTINGS_STORAGE_KEY, settingsString);
            loggingSystem.debug("GlobalSettingsManager", "Settings saved to storage.");
        } catch (error) {
            loggingSystem.error("GlobalSettingsManager", "Error saving settings to storage:", error);
        }
    },

    getSetting(keyPath, defaultValue = undefined) {
        const pathParts = keyPath.split('.');
        let value = currentSettings;
        try {
            for (const part of pathParts) {
                if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value,part)) {
                    value = value[part];
                } else {
                    return defaultValue;
                }
            }
            return value;
        } catch (e) {
            loggingSystem.warn("GlobalSettingsManager", `Error accessing setting '${keyPath}'.`, e);
            return defaultValue;
        }
    },

    setSetting(keyPath, value) {
        const pathParts = keyPath.split('.');
        let settingRef = currentSettings;
        try {
            for (let i = 0; i < pathParts.length - 1; i++) {
                const part = pathParts[i];
                if (!settingRef[part] || typeof settingRef[part] !== 'object') {
                    settingRef[part] = {}; 
                }
                settingRef = settingRef[part];
            }
            settingRef[pathParts[pathParts.length - 1]] = value;
            loggingSystem.debug("GlobalSettingsManager", `Setting '${keyPath}' set to:`, value);
            this.saveSettings();

            if (keyPath.startsWith('theme.')) {
                loggingSystem.debug("GlobalSettingsManager_SetSetting", `Theme related setting changed. New theme state: name=${currentSettings.theme.name}, mode=${currentSettings.theme.mode}`);
                document.dispatchEvent(new CustomEvent('themeChanged', { 
                    detail: { 
                        name: currentSettings.theme.name, 
                        mode: currentSettings.theme.mode 
                    } 
                }));
            }
            if (keyPath === 'language') {
                 document.dispatchEvent(new CustomEvent('languageChanged', { detail: currentSettings.language }));
            }

        } catch (e) {
            loggingSystem.error("GlobalSettingsManager", `Error setting setting '${keyPath}'.`, e);
        }
    },

    getAllSettings() {
        try {
            return JSON.parse(JSON.stringify(currentSettings));
        } catch (e) {
            loggingSystem.error("GlobalSettingsManager", "Error deep copying all settings", e);
            return {}; 
        }
    },

    resetToDefaults() {
        loggingSystem.info("GlobalSettingsManager", "Resetting all settings to defaults.");
        currentSettings = JSON.parse(JSON.stringify(defaultSettings)); 
        this.saveSettings();
        document.dispatchEvent(new CustomEvent('settingsReset', { detail: this.getAllSettings() }));
        document.dispatchEvent(new CustomEvent('themeChanged', { 
            detail: { 
                name: currentSettings.theme.name, 
                mode: currentSettings.theme.mode 
            } 
        }));
        document.dispatchEvent(new CustomEvent('languageChanged', { detail: currentSettings.language }));
    },

    _deepMerge(target, source) {
        const output = { ...target };
        if (this._isObject(target) && this._isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this._isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = this._deepMerge(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    },

    _isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }
};

export { globalSettingsManager, defaultSettings };
