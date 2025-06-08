// modules/settings_ui_module/settings_ui_data.js (v2 - New Themes)

/**
 * @file settings_ui_data.js
 * @description Static data definitions for the Settings UI module.
 * v2: Added Pink, RGB (animated), and Red&Yellow themes.
 */

export const staticModuleData = {
    // Corrected the id for "Red & Yellow" and added the "Classic" theme to match the CSS.
    themes: [
        { name: "Modern", id: "modern", modes: ["Day", "Night"], defaultMode: "day" },
        { name: "Classic", id: "classic", modes: ["Day", "Night"], defaultMode: "day" },
        { name: "Neon", id: "neon", modes: ["Day", "Night"], defaultMode: "night" },
        { name: "Steampunk", id: "steampunk", modes: ["Day", "Night"], defaultMode: "day" },
        { name: "Pink", id: "pink", modes: ["Day", "Night"], defaultMode: "day" },
        { name: "RGB", id: "rgb", modes: ["Day", "Night"], defaultMode: "day" }, 
        { name: "Red & Yellow", id: "red_yellow", modes: ["Day", "Night"], defaultMode: "day" },
    ],
    languages: [ // Placeholder for language selection
        { id: "en", name: "English" },
        { id: "fr", name: "Français (Placeholder)" },
    ],
    ui: {
        settingsTabLabel: "Settings",
        sections: {
            display: "Display & Theme",
            language: "Language (Placeholder)",
            gameActions: "Game Actions",
            statistics: "Game Statistics", // Updated label slightly
            automation: "Automation (Coming Soon)",
            debug: "Debugging"
        }
    }
};
