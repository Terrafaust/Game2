// js/core/globalSettingsManager.js

/**
 * @file globalSettingsManager.js
 * @description Manages global user-configurable settings for the game,
 * such as theme, language, and other preferences.
 * Settings are persisted, typically using localStorage.
 */

import { loggingSystem } from './loggingSystem.js';
// coreUIManager will be needed to apply theme changes, but to avoid circular dependencies,
// this manager will store the settings, and coreUIManager can query it or be notified.
// import { coreUIManager } from './coreUIManager.js'; 

const SETTINGS_STORAGE_KEY = 'incrementalGameGlobalSettings';

// Default settings structure
const defaultSettings = {
    theme: {
        name: 'modern', // Default theme name
        mode: 'day',    // Default mode ('day' or 'night')
    },
    language: 'en', // Default language (e.g., 'en', 'fr')
    volume: {
        master: 0.8,
        music: 0.5,
        sfx: 0.7,
    },
    showNotifications: true,
    // Add other settings as needed, e.g., animation preferences, number formatting
};

let currentSettings = { ...defaultSettings }; // Start with defaults

const globalSettingsManager = {
    /**
     * Initializes the settings manager by loading settings from storage.
     * If no settings are found, it applies and saves the default settings.
     */
    initialize() {
        this.loadSettings();
        loggingSystem.info("GlobalSettingsManager", "Global Settings Manager initialized.", this.getAllSettings());
        // Initial application of settings (e.g., theme) would typically be handled
        // by the relevant managers (like coreUIManager) after they are also initialized,
        // by them querying this manager.
    },

    /**
     * Loads settings from localStorage. If no settings are found,
     * it uses the default settings and saves them.
     */
    loadSettings() {
        try {
            const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (storedSettings) {
                const parsedSettings = JSON.parse(storedSettings);
                // Merge loaded settings with defaults to ensure all keys are present
                // This handles cases where new settings are added to defaultSettings
                // and are not yet in the user's saved data.
                currentSettings = this._deepMerge(defaultSettings, parsedSettings);
                loggingSystem.info("GlobalSettingsManager", "Settings loaded from storage.");
            } else {
                loggingSystem.info("GlobalSettingsManager", "No settings found in storage. Using default settings.");
                currentSettings = { ...defaultSettings }; // Ensure it's a fresh copy
                this.saveSettings(); // Save defaults if nothing was loaded
            }
        } catch (error) {
            loggingSystem.error("GlobalSettingsManager", "Error loading settings from storage. Using defaults.", error);
            currentSettings = { ...defaultSettings };
            // Optionally clear corrupted storage item
            // localStorage.removeItem(SETTINGS_STORAGE_KEY);
        }
        // After loading, ensure any systems relying on these settings are updated.
        // This might involve an event system or direct calls if dependencies are managed carefully.
        // For example, coreUIManager.applyTheme(currentSettings.theme.name, currentSettings.theme.mode);
        // This call should happen after coreUIManager is also initialized.
    },

    /**
     * Saves the current settings to localStorage.
     */
    saveSettings() {
        try {
            const settingsString = JSON.stringify(currentSettings);
            localStorage.setItem(SETTINGS_STORAGE_KEY, settingsString);
            loggingSystem.debug("GlobalSettingsManager", "Settings saved to storage.");
        } catch (error) {
            loggingSystem.error("GlobalSettingsManager", "Error saving settings to storage:", error);
        }
    },

    /**
     * Retrieves a specific setting value.
     * @param {string} keyPath - The path to the setting (e.g., 'theme.name', 'language').
     * @param {any} [defaultValue] - Value to return if the setting is not found.
     * @returns {any} The value of the setting or defaultValue.
     */
    getSetting(keyPath, defaultValue = undefined) {
        const pathParts = keyPath.split('.');
        let value = currentSettings;
        try {
            for (const part of pathParts) {
                if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value,part)) {
                    value = value[part];
                } else {
                    // loggingSystem.debug("GlobalSettingsManager", `Setting not found at path '${keyPath}'. Part '${part}' missing. Returning default.`);
                    return defaultValue;
                }
            }
            return value;
        } catch (e) {
            loggingSystem.warn("GlobalSettingsManager", `Error accessing setting '${keyPath}'.`, e);
            return defaultValue;
        }
    },

    /**
     * Sets a specific setting value and saves all settings.
     * @param {string} keyPath - The path to the setting (e.g., 'theme.name', 'language').
     * @param {any} value - The new value for the setting.
     */
    setSetting(keyPath, value) {
        const pathParts = keyPath.split('.');
        let settingRef = currentSettings;
        try {
            for (let i = 0; i < pathParts.length - 1; i++) {
                const part = pathParts[i];
                if (!settingRef[part] || typeof settingRef[part] !== 'object') {
                    settingRef[part] = {}; // Create intermediate objects if they don't exist
                }
                settingRef = settingRef[part];
            }
            settingRef[pathParts[pathParts.length - 1]] = value;
            loggingSystem.debug("GlobalSettingsManager", `Setting '${keyPath}' set to:`, value);
            this.saveSettings();

            // Notify relevant systems of the change.
            // Example: if theme changed, tell UIManager to re-apply.
            if (keyPath.startsWith('theme.')) {
                // This is where you'd call coreUIManager.applyTheme, but direct import creates circular dependency.
                // An event system or callback registration would be better.
                // For now, main.js or coreUIManager itself might poll/react.
                // Or, coreUIManager can expose a method that this manager calls, if load order allows.
                // Placeholder for notification:
                // if (typeof window.applyThemeSettings === 'function') { // Assuming coreUIManager sets this up
                //     window.applyThemeSettings(currentSettings.theme.name, currentSettings.theme.mode);
                // }
                // A simple way is to dispatch a custom event
                document.dispatchEvent(new CustomEvent('themeChanged', { detail: currentSettings.theme }));
            }
            if (keyPath === 'language') {
                 document.dispatchEvent(new CustomEvent('languageChanged', { detail: currentSettings.language }));
            }

        } catch (e) {
            loggingSystem.error("GlobalSettingsManager", `Error setting setting '${keyPath}'.`, e);
        }
    },

    /**
     * Retrieves all current settings.
     * @returns {object} A deep copy of the current settings object.
     */
    getAllSettings() {
        try {
            return JSON.parse(JSON.stringify(currentSettings));
        } catch (e) {
            loggingSystem.error("GlobalSettingsManager", "Error deep copying all settings", e);
            return {}; // Return empty object on error
        }
    },

    /**
     * Resets all settings to their default values and saves.
     */
    resetToDefaults() {
        loggingSystem.info("GlobalSettingsManager", "Resetting all settings to defaults.");
        currentSettings = JSON.parse(JSON.stringify(defaultSettings)); // Deep copy of defaults
        this.saveSettings();
        // Notify relevant systems of the reset.
        document.dispatchEvent(new CustomEvent('settingsReset', { detail: this.getAllSettings() }));
        document.dispatchEvent(new CustomEvent('themeChanged', { detail: currentSettings.theme }));
        document.dispatchEvent(new CustomEvent('languageChanged', { detail: currentSettings.language }));
    },

    /**
     * Deeply merges a source object into a target object.
     * The target object is mutated.
     * @param {object} target - The target object to merge into.
     * @param {object} source - The source object to merge from.
     * @returns {object} The mutated target object.
     * @private
     */
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

    /**
     * Helper to check if a value is a non-null object.
     * @param item
     * @returns {boolean}
     * @private
     */
    _isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }
};

// Initialize on load.
// Note: If coreUIManager needs to apply settings like theme immediately,
// its initialization and the call to apply theme should be coordinated
// in main.js after both managers are ready.
// globalSettingsManager.initialize(); // Initialization will be called from main.js

export { globalSettingsManager, defaultSettings }; // Export defaults for UI to know available options
