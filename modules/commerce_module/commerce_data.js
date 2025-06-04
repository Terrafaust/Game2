// modules/commerce_module/commerce_data.js 

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
            showInUI: false, // Hidden until unlocked
        },
        studySkillPoints: {
            id: 'studySkillPoints',
            name: "Study Skill Points",
            initialAmount: 0,
            isUnlocked: false, // Initially locked, unlocked by purchase
            showInUI: false, // Hidden until unlocked
        }
    },

    // Definitions for purchasable items in the Commerce module
    purchasables: {
        // Item to gain Images
        imageGenerator: {
            id: 'imageGenerator',
            name: "Image Generator",
            description: "A device that passively generates Images.",
            resourceId: "images", // Resource it produces
            baseProduction: "1", // Images/s per generator (for future passive gain, currently just for cost)
            baseCost: "1000000", // 1 Million SP
            costResource: "studyPoints",
            costGrowthFactor: "1.0005", // Very low growth factor as per roadmap
            unlockCondition: {
                type: "resource",
                resourceId: "studyPoints",
                amount: "1000000" // Unlocked when player can afford first one
            },
            ui: {
                buttonText: (cost) => `Buy Image Generator: ${cost} SP`,
                tooltip: (owned) => `You own ${owned} Image Generators. Each contributes to your Images.`
            }
        },
        // Item to gain Study Skill Points
        skillPointGenerator: {
            id: 'skillPointGenerator',
            name: "Skill Point Generator",
            description: "A specialized facility to generate Study Skill Points.",
            resourceId: "studySkillPoints", // Resource it produces
            baseProduction: "1", // SSP/s per generator (for future passive gain, currently just for cost)
            baseCost: "10000000", // 10 Million SP
            costResource: "studyPoints",
            costGrowthFactor: "1.5", // AGGRESSIVE growth factor as per roadmap - FLAG FOR REVIEW
            unlockCondition: {
                type: "resource",
                resourceId: "studyPoints",
                amount: "10000000" // Unlocked when player can afford first one
            },
            ui: {
                buttonText: (cost) => `Buy Skill Point Generator: ${cost} SP`,
                tooltip: (owned) => `You own ${owned} Skill Point Generators. Each contributes to your Study Skill Points.`
            }
        },
        // Unlock for Settings menu
        settingsUnlock: {
            id: 'settingsUnlock',
            name: "Unlock Settings Menu",
            description: "Gain access to game settings like themes, statistics, and more.",
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
