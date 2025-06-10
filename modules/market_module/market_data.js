// modules/market_module/market_data.js (v3.1 - Decouple Dependencies)

/**
 * @file market_data.js
 * @description Static data definitions for the Market module.
 * v3.1: Removed unlockCondition functions to prevent load-time dependency errors. Conditions are now checked in the UI.
 * v3.0: Restructured data into categories for the new UI. Added new feature unlocks and updated conditions.
 */

export const staticModuleData = {
    resources: {
        images: { id: 'images', name: "Images", initialAmount: "0", isUnlocked: false, showInUI: false, hasProductionRate: false },
        studySkillPoints: { id: 'studySkillPoints', name: "Study Skill Points", initialAmount: "0", isUnlocked: true, showInUI: false, hasProductionRate: false },
        prestigeSkillPoints: { id: 'prestigeSkillPoints', name: 'Prestige Skill Points', initialAmount: '0', isUnlocked: true, showInUI: false, hasProductionRate: false }
    },

    consumables: {
        buyImages: { 
            id: 'buyImages', 
            name: 'Acquire Image', 
            description: 'Purchase decorative Images with your Study Points.', 
            costResource: 'studyPoints', 
            baseCost: '1000000', 
            costGrowthFactor: '1.0005', 
            benefitResource: 'images', 
            benefitAmountPerPurchase: '1', 
        },
    },
    
    skillPoints: {
        buyStudySkillPoints: { 
            id: 'buyStudySkillPoints', 
            name: 'Acquire Study Skill Point', 
            description: 'Convert Study Points into valuable Study Skill Points to enhance your abilities.', 
            costResource: 'studyPoints', 
            baseCost: '10000000', 
            costGrowthFactor: '1.2', 
            benefitResource: 'studySkillPoints', 
            benefitAmountPerPurchase: '1', 
        },
        buyPrestigeSkillPoints: { 
            id: 'buyPrestigeSkillPoints', 
            name: 'Acquire Prestige Skill Point', 
            description: 'Convert Knowledge into powerful Prestige Skill Points to unlock permanent upgrades.', 
            costResource: 'knowledge', 
            baseCost: '1e7', 
            costGrowthFactor: '1.2', 
            benefitResource: 'prestigeSkillPoints', 
            benefitAmountPerPurchase: '1',
            unlockPrestigeLevel: 1 // Condition check moved to UI
        }
    },

    featureUnlocks: {
        buyMultiples: {
            id: 'unlockBuyMultiples',
            name: 'Unlock Buy Multipliers',
            description: 'Unlock x10, x25, and MAX purchase options for all producers and items.',
            costResource: 'images',
            costAmount: '1000',
            flagToSet: 'buyMultiplesUnlocked'
        },
        settingsTab: { 
            id: 'unlockSettingsTab', 
            name: 'Unlock Settings Menu', 
            description: 'Gain access to game settings and customization options.', 
            costResource: 'images', 
            costAmount: '100', 
            flagToSet: 'settingsTabUnlocked', 
        },
        achievementsTab: {  
            id: 'unlockAchievementsTab', 
            name: 'Unlock Achievements Menu', 
            description: 'Track your accomplishments and earn rewards.', 
            costResource: 'images', 
            costAmount: '100', 
            flagToSet: 'achievementsTabUnlocked', 
        },
        themes: {
            id: 'unlockThemes',
            name: 'Unlock Themes',
            description: 'Unlock themes to change the look and feel of the game. Found in settings.',
            costResource: 'images',
            costAmount: '500',
            flagToSet: 'themesUnlocked'
        },
        automatorMenu: {
            id: 'unlockAutomatorMenu',
            name: 'Unlock Automator Menu',
            description: 'Gain access to the Automator menu to automate parts of the game.',
            costResource: 'images',
            costAmount: '500000',
            flagToSet: 'automatorMenuUnlocked',
            unlockPrestigeLevel: 3 // Condition check moved to UI
        },
         modifiedUI: {
            id: 'unlockModifiedUI',
            name: 'Unlock Modified UI',
            description: 'Unlocks a modified UI layout.',
            costResource: 'images',
            costAmount: '100000000',
            flagToSet: 'modifiedUIUnlocked',
            unlockPrestigeLevel: 3 // Condition check moved to UI
        }
    },

    marketAutomations: {
        imageAutomator: {
            id: 'imageAutomator',
            name: 'Image Purchase Automator',
            description: 'Automatically purchases Images for you.',
            costResource: 'prestigePoints',
            levels: [
                { level: 1, cost: '1e5',  rate: 10,   description: 'Automatically buys 10 Images per second.' },
                { level: 2, cost: '1e10', rate: 100,  description: 'Upgrades to 100 Images per second.' },
                { level: 3, cost: '1e15', rate: 1000, description: 'Upgrades to 1000 Images per second.' },
            ]
        }
    },

    ui: {
        marketTabLabel: "Market",
    }
};
