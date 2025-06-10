// modules/market_module/market_data.js (v2.0 - Added Image Automator)

/**
 * @file market_data.js
 * @description Static data definitions for the Market module.
 * v2.0: Added tiered Image Automator upgrade.
 * v1.4: Added Prestige Skill Points resource and market item.
 */

export const staticModuleData = {
    resources: {
        images: { id: 'images', name: "Images", initialAmount: "0", isUnlocked: false, showInUI: false, hasProductionRate: false },
        studySkillPoints: { id: 'studySkillPoints', name: "Study Skill Points", initialAmount: "0", isUnlocked: true, showInUI: false, hasProductionRate: false },
        prestigeSkillPoints: { id: 'prestigeSkillPoints', name: 'Prestige Skill Points', initialAmount: '0', isUnlocked: true, showInUI: false, hasProductionRate: false }
    },

    marketItems: {
        buyImages: { id: 'buyImages', name: 'Acquire Images', description: 'Purchase decorative Images with your Study Points.', costResource: 'studyPoints', baseCost: '1000000', costGrowthFactor: '1.0005', benefitResource: 'images', benefitAmountPerPurchase: '1', },
        buyStudySkillPoints: { id: 'buyStudySkillPoints', name: 'Acquire Study Skill Points', description: 'Convert Study Points into valuable Study Skill Points to enhance your abilities.', costResource: 'studyPoints', baseCost: '10000000', costGrowthFactor: '1.2', benefitResource: 'studySkillPoints', benefitAmountPerPurchase: '1', },
        buyPrestigeSkillPoints: { id: 'buyPrestigeSkillPoints', name: 'Acquire Prestige Skill Points', description: 'Convert Knowledge into powerful Prestige Skill Points to unlock permanent upgrades.', costResource: 'knowledge', baseCost: '1e7', costGrowthFactor: '1.2', benefitResource: 'prestigeSkillPoints', benefitAmountPerPurchase: '1',}
    },

    marketUnlocks: {
        settingsTab: { id: 'unlockSettingsTab', name: 'Unlock Settings Menu', description: 'Gain access to game settings and customization options.', costResource: 'images', costAmount: '100', flagToSet: 'settingsTabUnlocked', },
        achievementsTab: {  id: 'unlockAchievementsTab', name: 'Unlock Achievements Menu', description: 'Track your accomplishments and earn rewards.', costResource: 'images', costAmount: '100', flagToSet: 'achievementsTabUnlocked', }
    },

    // --- FEATURE: Added definition for Image Automator ---
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
    // --- END FEATURE ---

    ui: {
        marketTabLabel: "Market",
    }
};