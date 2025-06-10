// modules/market_module/market_data.js (v3.1 - Restored Consumables)

/**
 * @file market_data.js
 * @description Static data definitions for the Market module.
 * v3.1: Re-introduced the 'consumables' category to separate Images from Skill Points.
 * v3.0: Complete refactor for roadmap. Removed automations, added feature unlocks and skill points sections.
 */

export const staticModuleData = {
    resources: {
        images: { id: 'images', name: "Images", initialAmount: "0", isUnlocked: false, showInUI: false, hasProductionRate: false },
        studySkillPoints: { id: 'studySkillPoints', name: "Study Skill Points", initialAmount: "0", isUnlocked: true, showInUI: false, hasProductionRate: false },
        prestigeSkillPoints: { id: 'prestigeSkillPoints', name: 'Prestige Skill Points', initialAmount: '0', isUnlocked: true, showInUI: false, hasProductionRate: false }
    },
    
    // NEW: Section for items like Images.
    consumables: {
        buyImages: { 
            id: 'buyImages', 
            name: 'Acquire Image', 
            description: 'Purchase decorative Images with your Study Points. Get 1,000 to unlock Prestige.', 
            costResource: 'studyPoints', 
            baseCost: '1000000', 
            costGrowthFactor: '1.0005', 
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
            costAmount: '200',
            flagToSet: 'settingsTabUnlocked' 
        },
        achievementsTab: {  
            id: 'unlockAchievementsTab', 
            name: 'Unlock Achievements Menu', 
            description: 'Track your accomplishments and earn rewards.', 
            costResource: 'images', 
            costAmount: '100',
            flagToSet: 'achievementsTabUnlocked'
        },
        themes: {
            id: 'unlockThemes',
            name: 'Unlock Themes',
            description: 'Unlock additional visual themes in the Settings menu.',
            costResource: 'images',
            costAmount: '200',
            flagToSet: 'themesUnlocked'
        },
        statistics: {
            id: 'unlockStatistics',
            name: 'Unlock Game Statistics',
            description: 'View detailed game statistics in the Settings menu.',
            costResource: 'images',
            costAmount: '500',
            flagToSet: 'gameStatsUnlocked'
        },
        automation: {
            id: 'unlockAutomation',
            name: 'Unlock Automation Menu',
            description: 'Unlock the Automation menu to purchase powerful automators.',
            costResource: 'images',
            costAmount: '1e7',
            flagToSet: 'automationTabUnlocked',
            unlockCondition: { type: 'prestigeCount', value: 3 }
        },
        modifiedUI: {
            id: 'unlockModifiedUI',
            name: 'Unlock Modified UI',
            description: 'A future update will modify the UI.',
            costResource: 'images',
            costAmount: '1e12',
            flagToSet: 'modifiedUIUnlocked',
            isFuture: true
        }
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
            unlockCondition: { type: 'purchaseCount', id: 'studySkillPoints', value: 1 }
        }
    },

    ui: {
        marketTabLabel: "Market",
    }
};
