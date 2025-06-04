// js/modules/commerce_module/commerce_data.js (v3)

/**
 * @file commerce_data.js
 * @description Static data definitions for the Commerce module.
 * Defines new resources ("Images", "Study Skill Points") and items that can be purchased
 * with Study Points, including their costs and unlock conditions for other modules.
 * All numerical values that can grow large are represented as strings to be
 * converted to Decimal objects by the consuming system.
 */

export const staticModuleData = {
    // Definition for the 'Images' resource
    resources: {
        images: {
            id: 'images',
            name: "Images",
            initialAmount: 0,
            isUnlocked: false, // Initially locked, unlocked by purchase
            showInUI: true, // NEW: Show in UI by default once unlocked
            color: '#8B5CF6' // Purple color for Images
        },
        studySkillPoints: {
            id: 'studySkillPoints',
            name: "Study Skill Points",
            initialAmount: 0,
            isUnlocked: false, // Initially locked, unlocked by purchase
            showInUI: false, // NEW: Do NOT show in UI by default
            color: '#EC4899' // Pink color for Study Skill Points
        }
    },

    // Definitions for purchasable items in the Commerce module
    purchasables: {
        // Item to gain Images (one-time gain on purchase)
        buyImage: { // Renamed from imageGenerator
            id: 'buyImage',
            name: "Buy Image",
            description: "Acquire a single Image.",
            type: "resourceGain", // NEW: Explicitly define as resource gain
            gainResourceId: "images", // NEW: What resource it grants
            gainAmount: "1", // NEW: How much it grants
            baseCost: "1000000", // 1 Million SP
            costResource: "studyPoints",
            costGrowthFactor: "1.0005", // Very low growth factor as per roadmap
            unlockCondition: {
                type: "resource",
                resourceId: "studyPoints",
                amount: "1000000" // Unlocked when player can afford first one
            },
            showOwnedCount: false, // NEW: Do not show owned count in UI
            ui: {
                buttonText: (cost) => `Buy Image: ${cost} SP`,
                tooltip: () => `Instantly gain 1 Image.` // Tooltip adjusted
            }
        },
        // Item to gain Study Skill Points (one-time gain on purchase)
        buySkillPoint: { // Renamed from skillPointGenerator
            id: 'buySkillPoint',
            name: "Buy Study Skill Point",
            description: "Acquire a single Study Skill Point.",
            type: "resourceGain", // NEW: Explicitly define as resource gain
            gainResourceId: "studySkillPoints", // NEW: What resource it grants
            gainAmount: "1", // NEW: How much it grants
            baseCost: "10000000", // 10 Million SP
            costResource: "studyPoints",
            costGrowthFactor: "1.5", // AGGRESSIVE growth factor as per roadmap - FLAG FOR REVIEW
            unlockCondition: {
                type: "resource",
                resourceId: "studyPoints",
                amount: "10000000" // Unlocked when player can afford first one
            },
            showOwnedCount: false, // NEW: Do not show owned count in UI
            ui: {
                buttonText: (cost) => `Buy Skill Point: ${cost} SP`,
                tooltip: () => `Instantly gain 1 Study Skill Point.` // Tooltip adjusted
            }
        },
        // Unlock for Settings menu
        settingsUnlock: {
            id: 'settingsUnlock',
            name: "Unlock Settings Menu",
            description: "Gain access to game settings like themes, statistics, and more.",
            type: "flagUnlock", // NEW: Explicitly define as flag unlock
            costResource: "images",
            baseCost: "100", // Cost in Images
            costGrowthFactor: "1", // One-time purchase
            unlockCondition: {
                type: "globalFlag", // Unlocked by global flag (e.g., after 10 Professors)
                flag: "commerceUnlocked", // This flag is set by Studies module
                value: true
            },
            setsGlobalFlag: {
                flag: "settingsMenuUnlocked",
                value: true
            },
            showOwnedCount: false, // NEW: Not applicable
            ui: {
                buttonText: (cost) => `Unlock Settings: ${cost} Images`,
                tooltip: () => `Unlocks the 'Settings' tab in the main menu.`
            }
        },
        // Unlock for Achievements menu
        achievementsUnlock: {
            id: 'achievementsUnlock',
            name: "Unlock Achievements Menu",
            description: "View your progress and claim rewards for in-game achievements.",
            type: "flagUnlock", // NEW: Explicitly define as flag unlock
            costResource: "images",
            baseCost: "100", // Cost in Images
            costGrowthFactor: "1", // One-time purchase
            unlockCondition: {
                type: "globalFlag", // Unlocked by global flag (e.g., after 10 Professors)
                flag: "commerceUnlocked", // This flag is set by Studies module
                value: true
            },
            setsGlobalFlag: {
                flag: "achievementsMenuUnlocked",
                value: true
            },
            showOwnedCount: false, // NEW: Not applicable
            ui: {
                buttonText: (cost) => `Unlock Achievements: ${cost} Images`,
                tooltip: () => `Unlocks the 'Achievements' tab in the main menu.`
            }
        }
    },

    ui: {
        commerceTabLabel: "Commerce",
        commerceTabUnlockCondition: {
            type: "globalFlag",
            flag: "commerceUnlocked", // Unlocked by Studies module
            value: true
        }
    }
};
