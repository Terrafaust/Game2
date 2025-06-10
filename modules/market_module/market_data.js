// js/modules/market/market_data.js (v1.0 - Roadmap Restructure)

/**
 * @file market_data.js
 * @description Static data for the Market module.
 * v1.0: Restructured data into categories as per the game roadmap (Phase 3).
 * - Implemented singular naming for items.
 * - Added new unlock conditions for prestige-gated items.
 */

export const staticModuleData = {
    // Defines resources this module uses or provides.
    // This structure is for registration with the coreResourceManager.
    resources: {
        images: {
            id: 'images',
            name: 'Images',
            initialAmount: '0',
            showInUI: false,
            isUnlocked: false,
            hasProductionRate: false,
            resetsOnPrestige: true
        },
        studySkillPoints: {
            id: 'studySkillPoints',
            name: 'Study Skill Points',
            initialAmount: '0',
            showInUI: true,
            isUnlocked: true,
            hasProductionRate: false,
            resetsOnPrestige: true
        },
        prestigeSkillPoints: {
            id: 'prestigeSkillPoints',
            name: 'Prestige Skill Points',
            initialAmount: '0',
            showInUI: false,
            isUnlocked: false,
            hasProductionRate: false,
            resetsOnPrestige: false // These are kept through prestige
        }
    },

    // Category for items that can be purchased multiple times and are consumed or accumulated.
    consumables: {
        'acquireImage': {
            id: 'acquireImage',
            name: 'Acquire Image', // Singular name
            description: 'Generates a single image. Useful for unlocking prestige and other features.',
            costResource: 'studyPoints',
            benefitResource: 'images',
            baseCost: '25',
            costGrowthFactor: '1.25',
            benefitAmountPerPurchase: '1',
            isScalable: true
        }
    },

    // Category for items that grant skill points for the various skill trees.
    skillPoints: {
        'acquireStudySkillPoint': {
            id: 'acquireStudySkillPoint',
            name: 'Acquire Study Skill Point', // Singular name
            description: 'Grants one Study Skill Point (SSP) for use in the Skills tab.',
            costResource: 'knowledge',
            benefitResource: 'studySkillPoints',
            baseCost: '1e+5',
            costGrowthFactor: '1.3',
            benefitAmountPerPurchase: '1',
            isScalable: true
        },
        'acquirePrestigeSkillPoint': {
            id: 'acquirePrestigeSkillPoint',
            name: 'Acquire Prestige Skill Point', // Singular name
            description: 'Grants one Prestige Skill Point (PSP).',
            costResource: 'knowledge',
            benefitResource: 'prestigeSkillPoints',
            baseCost: '1e7',
            costGrowthFactor: '1.3',
            benefitAmountPerPurchase: '1',
            isScalable: true,
            // Roadmap: Unlock condition based on prestige count
            unlockCondition: {
                type: 'prestigeCount',
                count: 1
            }
        }
    },

    // Category for one-time purchases that unlock game features.
    featureUnlocks: {
        'buyMultiples': {
            id: 'buyMultiples',
            name: 'Unlock Buy Multiples',
            description: 'Unlocks the ability to buy items in multiples of 10, 100, and Max.',
            costResource: 'images',
            costAmount: '1000', // Roadmap: Cost is 1000 images
            flagToSet: 'buyMultiplesUnlocked'
        },
        'settings': {
            id: 'settings',
            name: 'Unlock Settings Menu',
            description: 'Unlocks the game settings menu, allowing you to change themes and manage your save.',
            costResource: 'images',
            costAmount: '200',
            flagToSet: 'settingsTabUnlocked'
        },
        'achievements': {
            id: 'achievements',
            name: 'Unlock Achievements',
            description: 'Unlocks the achievements system, which provides permanent boosts.',
            costResource: 'studyPoints',
            costAmount: '200',
            flagToSet: 'achievementsTabUnlocked'
        },
        'automatorMenu': {
            id: 'automatorMenu',
            name: 'Unlock Automator Menu',
            description: 'Unlocks the automator menu for managing passive generation.',
            costResource: 'images',
            costAmount: '1e7',
            flagToSet: 'automatorMenuUnlocked',
            // Roadmap: Unlock condition based on prestige count
            unlockCondition: {
                type: 'prestigeCount',
                count: 3
            }
        },
        'modifiedUI': {
            id: 'modifiedUI',
            name: 'Unlock Modified UI',
            description: 'Unlocks a modified UI layout. Requires 3 prestiges.',
            costResource: 'images',
            costAmount: '1e7',
            flagToSet: 'modifiedUIUnlocked',
            // Roadmap: Unlock condition based on prestige count
            unlockCondition: {
                type: 'prestigeCount',
                count: 3
            }
        }
    },
    
};