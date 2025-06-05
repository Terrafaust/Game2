// modules/market_module/market_data.js (v1.2 - SSP no-showInUI, Achievements Unlock)

/**
 * @file market_data.js
 * @description Static data definitions for the Market module.
 * v1.2: Set studySkillPoints.showInUI to false.
 * v1.1: Includes definition for unlocking achievementsTab.
 */

export const staticModuleData = {
    resources: {
        images: {
            id: 'images',
            name: "Images",
            initialAmount: "0",
            isUnlocked: true, 
            showInUI: true, // Images should be visible in the resource bar
            hasProductionRate: false 
        },
        studySkillPoints: {
            id: 'studySkillPoints',
            name: "Study Skill Points",
            initialAmount: "0",
            isUnlocked: true, 
            showInUI: false, // Study Skill Points should NOT be visible in the main resource bar
            hasProductionRate: false 
        }
    },

    marketItems: {
        buyImages: {
            id: 'buyImages',
            name: 'Acquire Images',
            description: 'Purchase decorative Images with your Study Points.',
            costResource: 'studyPoints',
            baseCost: '1000000', 
            costGrowthFactor: '1.0005', 
            benefitResource: 'images',
            benefitAmountPerPurchase: '1', 
        },
        buyStudySkillPoints: {
            id: 'buyStudySkillPoints',
            name: 'Acquire Study Skill Points',
            description: 'Convert Study Points into valuable Study Skill Points to enhance your abilities.',
            costResource: 'studyPoints',
            baseCost: '10000000', 
            costGrowthFactor: '1.5', 
            benefitResource: 'studySkillPoints',
            benefitAmountPerPurchase: '1', 
        }
    },

    marketUnlocks: {
        settingsTab: {
            id: 'unlockSettingsTab',
            name: 'Unlock Settings Menu', // Name still descriptive
            description: 'Gain access to game settings and customization options.',
            costResource: 'images',
            costAmount: '100', 
            flagToSet: 'settingsTabUnlocked', 
        },
        achievementsTab: { 
            id: 'unlockAchievementsTab',
            name: 'Unlock Achievements Menu', // Name still descriptive
            description: 'Track your accomplishments and earn rewards.',
            costResource: 'images',
            costAmount: '100', 
            flagToSet: 'achievementsTabUnlocked', 
        }
    },

    ui: {
        marketTabLabel: "Market",
    }
};
