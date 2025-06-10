// modules/market_module/market_data.js (v3.0 - UI Restructure)

/**
 * @file market_data.js
 * @description Static data definitions for the Market module.
 * v3.0: Restructured data for new UI categories (Consumables, Feature Unlocks, Skill Points).
 * v2.0: Added tiered Image Automator upgrade.
 * v1.4: Added Prestige Skill Points resource and market item.
 */

export const staticModuleData = {
    resources: {
        images: { id: 'images', name: "Images", initialAmount: "0", isUnlocked: false, showInUI: false, hasProductionRate: false },
        studySkillPoints: { id: 'studySkillPoints', name: "Study Skill Points", initialAmount: "0", isUnlocked: true, showInUI: false, hasProductionRate: false },
        prestigeSkillPoints: { id: 'prestigeSkillPoints', name: 'Prestige Skill Points', initialAmount: '0', isUnlocked: true, showInUI: false, hasProductionRate: false }
    },

    // --- ROADMAP 3.1: Data Restructure ---
    consumables: {
        buyImage: { 
            id: 'buyImage', 
            name: 'Acquire Image', 
            description: 'Purchase a decorative Image with your Study Points.', 
            costResource: 'studyPoints', 
            baseCost: '1000000', 
            costGrowthFactor: '1.005', 
            benefitResource: 'images', 
            benefitAmountPerPurchase: '1', 
        },
    },

    featureUnlocks: {
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
        buyMultiples: {
            id: 'unlockBuyMultiples',
            name: 'Unlock Buy Multipliers',
            description: 'Unlock the ability to buy items in multiples (x10, x100, Max).',
            costResource: 'images',
            costAmount: '1000',
            flagToSet: 'buyMultiplesUnlocked',
        },
        automatorMenu: {
            id: 'unlockAutomatorMenu',
            name: 'Unlock Automator Menu',
            description: 'Gain access to the automation sub-tab in the Market.',
            costResource: 'images',
            costAmount: '5000', // Example cost
            flagToSet: 'automatorMenuUnlocked',
            unlockCondition: { type: 'prestigeCount', count: 3 }
        },
        modifiedUI: {
            id: 'unlockModifiedUI',
            name: 'Unlock Modified UI',
            description: 'Unlock a special, modified user interface theme.',
            costResource: 'images',
            costAmount: '10000', // Example cost
            flagToSet: 'modifiedUIUnlocked',
            unlockCondition: { type: 'prestigeCount', count: 3 }
        }
    },

    skillPoints: {
        buyStudySkillPoint: { 
            id: 'buyStudySkillPoint', 
            name: 'Acquire Study Skill Point', 
            description: 'Convert Study Points into a valuable Study Skill Point to enhance your abilities.', 
            costResource: 'studyPoints', 
            baseCost: '10000000', 
            costGrowthFactor: '1.2', 
            benefitResource: 'studySkillPoints', 
            benefitAmountPerPurchase: '1', 
        },
        buyPrestigeSkillPoint: { 
            id: 'buyPrestigeSkillPoint', 
            name: 'Acquire Prestige Skill Point', 
            description: 'Convert Knowledge into a powerful Prestige Skill Point to unlock permanent upgrades.', 
            costResource: 'knowledge', 
            baseCost: '1e7', 
            costGrowthFactor: '1.2', 
            benefitResource: 'prestigeSkillPoints', 
            benefitAmountPerPurchase: '1',
            unlockCondition: { type: 'prestigeCount', count: 1 }
        }
    },
    // --- END ROADMAP 3.1 ---

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
