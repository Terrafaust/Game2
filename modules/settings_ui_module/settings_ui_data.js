// js/modules/settings_ui_module/settings_ui_data.js 

/**
 * @file settings_ui_data.js
 * @description Static data definitions for the Settings UI module.
 * Defines UI elements, text, and configurations for various settings.
 */

export const staticModuleData = {
    // Definitions for various setting sections and their unlock conditions
    sections: {
        themes: {
            id: 'themes',
            name: "Themes",
            description: "Customize the visual appearance of your game.",
            unlockCondition: {
                type: "resource", // Example: cost Images to unlock
                resourceId: "images",
                amount: "200"
            },
            ui: {
                buttonText: (cost) => `Unlock Themes: ${cost} Images`
            }
        },
        statistics: {
            id: 'statistics',
            name: "Statistics",
            description: "View detailed game statistics and progress.",
            unlockCondition: {
                type: "resource", // Example: cost Images to unlock
                resourceId: "images",
                amount: "500"
            },
            ui: {
                buttonText: (cost) => `Unlock Statistics: ${cost} Images`
            }
        },
        language: {
            id: 'language',
            name: "Language",
            description: "Change the game's display language.",
            unlockCondition: {
                type: "alwaysUnlocked" // Language is always available
            },
            ui: {
                buttonText: () => `Change Language`
            }
        },
        saveLoad: {
            id: 'saveLoad',
            name: "Save/Load",
            description: "Manually save, load, or reset your game progress.",
            unlockCondition: {
                type: "alwaysUnlocked" // Save/Load is always available
            },
            ui: {
                buttonText: () => `Manage Save Data`
            }
        },
        logs: {
            id: 'logs',
            name: "Logs",
            description: "View recent game events and debugging information.",
            unlockCondition: {
                type: "alwaysUnlocked" // Logs are always available
            },
            ui: {
                buttonText: () => `View Game Logs`
            }
        },
        automation: {
            id: 'automation',
            name: "Automation",
            description: "Unlock powerful automation features to streamline your gameplay.",
            unlockCondition: {
                type: "resource", // Example: cost Images to unlock
                resourceId: "images",
                amount: "1000"
            },
            ui: {
                buttonText: (cost) => `Unlock Automation: ${cost} Images`,
                disabledText: "Coming Soon" // Placeholder for future functionality
            }
        }
    },

    ui: {
        settingsTabLabel: "Settings",
        settingsTabUnlockCondition: {
            type: "globalFlag",
            flag: "settingsMenuUnlocked", // Unlocked by Commerce module
            value: true
        },
        // Theme options (should align with globalSettingsManager defaults)
        themeOptions: [
            { id: 'modern', name: 'Modern' },
            // { id: 'neon', name: 'Neon' }, // Example additional themes
            // { id: 'steampunk', name: 'Steampunk' },
        ],
        themeModes: [
            { id: 'day', name: 'Day' },
            { id: 'night', name: 'Night' },
        ],
        // Language options (should align with globalSettingsManager defaults)
        languageOptions: [
            { id: 'en', name: 'English' },
            { id: 'fr', name: 'Français' },
        ],
        // Tab labels for statistics modal
        statsTabs: [
            { id: 'resources', label: 'Resources' },
            { id: 'producers', label: 'Producers' },
            { id: 'skills', label: 'Skills' },
            { id: 'achievements', label: 'Achievements' },
            { id: 'ascension', label: 'Ascension' } // Placeholder for Stream 4
        ]
    }
};
