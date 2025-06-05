// modules/market_module/market_data.js (v1)

/**
 * @file market_data.js
 * @description Static data definitions for the Market module.
 * Defines new resources "Images" and "Study Skill Points", their purchase costs,
 * and items/unlocks available in the market.
 */

export const staticModuleData = {
    resources: {
        images: {
            id: 'images',
            name: "Images",
            initialAmount: "0",
            isUnlocked: true, // Unlocked when market module loads/is unlocked
            showInUI: true,
            hasProductionRate: false // Custom flag to hint UI not to show "/s"
        },
        studySkillPoints: {
            id: 'studySkillPoints',
            name: "Study Skill Points",
            initialAmount: "0",
            isUnlocked: true, // Unlocked when market module loads/is unlocked
            showInUI: true,
            hasProductionRate: false // Custom flag
        }
    },

    marketItems: {
        buyImages: {
            id: 'buyImages',
            name: 'Acquire Images',
            description: 'Purchase decorative Images with your Study Points.',
            costResource: 'studyPoints',
            baseCost: '1000000', // 1M SP
            costGrowthFactor: '1.0005', // Per image purchased (if buying one by one)
                                     // If buying in bulk, this factor might apply differently or be per batch.
                                     // For simplicity, let's assume it's per unit for now.
            benefitResource: 'images',
            benefitAmountPerPurchase: '1', // Grants 1 Image per purchase
        },
        buyStudySkillPoints: {
            id: 'buyStudySkillPoints',
            name: 'Acquire Study Skill Points',
            description: 'Convert Study Points into valuable Study Skill Points to enhance your abilities.',
            costResource: 'studyPoints',
            baseCost: '10000000', // 10M SP
            costGrowthFactor: '1.5', // Per skill point purchased
            benefitResource: 'studySkillPoints',
            benefitAmountPerPurchase: '1', // Grants 1 Study Skill Point per purchase
        }
    },

    marketUnlocks: {
        settingsTab: {
            id: 'unlockSettingsTab',
            name: 'Unlock Settings Menu',
            description: 'Gain access to game settings and customization options.',
            costResource: 'images',
            costAmount: '100', // Cost 100 Images
            flagToSet: 'settingsTabUnlocked',
        },
        achievementsTab: {
            id: 'unlockAchievementsTab',
            name: 'Unlock Achievements Menu',
            description: 'Track your accomplishments and earn rewards.',
            costResource: 'images',
            costAmount: '100', // Cost 100 Images (Roadmap: "e.g., 100 Images")
            flagToSet: 'achievementsTabUnlocked',
        }
    },

    ui: {
        marketTabLabel: "Market",
        // Unlock condition for the Market tab itself is a global flag `marketUnlocked`
        // which is set by the Studies module.
    }
};
