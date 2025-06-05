// modules/settings_ui_module/settings_ui_data.js (v1)

/**
 * @file settings_ui_data.js
 * @description Static data definitions for the Settings UI module.
 */

export const staticModuleData = {
    themes: [
        { name: "Modern", id: "modern", modes: ["Day", "Night"], defaultMode: "day" },
        { name: "Neon", id: "neon", modes: ["Day", "Night"], defaultMode: "night" },
        { name: "Steampunk", id: "steampunk", modes: ["Day", "Night"], defaultMode: "day" },
        // Add more themes as desired
    ],
    languages: [ // Placeholder for language selection
        { id: "en", name: "English" },
        { id: "fr", name: "Français (Placeholder)" },
    ],
    ui: {
        settingsTabLabel: "Settings",
        // Unlock condition for the Settings tab is a global flag `settingsTabUnlocked`
        // which is set by the Market module.
        sections: {
            display: "Display & Theme",
            language: "Language (Placeholder)",
            gameActions: "Game Actions",
            statistics: "Game Statistics (Basic)",
            automation: "Automation (Coming Soon)",
            debug: "Debugging"
        }
    }
};
