// modules/market_module/market_data.js (v3.1 - UI Overhaul & Compatibility)

/**
 * @file market_data.js
 * @description Static data definitions for the Market module.
 * v3.1: Added back-compat properties (marketItems, marketUnlocks) to fix manifest loading issues.
 * v3.0: Restructured data into categories (Consumables, Feature Unlocks, Skill Points) for UI overhaul.
 * Added new unlocks and updated conditions as per the roadmap.
 */

const consumables = {
    buyImages: { 
        id: 'buyImages', 
        name: 'Acquire Image', // Name is now singular
        description: 'Purchase decorative Images with your Study Points.', 
        tooltip: 'Getting 1,000 Images is required to unlock the ability to Prestige for the first time.',
        costResource: 'studyPoints', 
        baseCost: '1000000', 
        costGrowthFactor: '1.0005', 
        benefitResource: 'images', 
        benefitAmountPerPurchase: '1',
    }
};

const skillPoints = {
    buyStudySkillPoints: { 
        id: 'buyStudySkillPoints', 
        name: 'Acquire Study Skill Point', // Name is now singular
        description: 'Convert Study Points into valuable SSPs to enhance your abilities.', 
        costResource: 'studyPoints', 
        baseCost: '10000000', 
        costGrowthFactor: '1.15', 
        benefitResource: 'studySkillPoints', 
        benefitAmountPerPurchase: '1',
    },
    buyPrestigeSkillPoints: { 
        id: 'buyPrestigeSkillPoints', 
        name: 'Acquire Prestige Skill Point', // Name is now singular
        description: 'Convert Knowledge into powerful PSPs to unlock permanent upgrades.', 
        costResource: 'knowledge', 
        baseCost: '1e7', 
        costGrowthFactor: '1.2', 
        benefitResource: 'prestigeSkillPoints', 
        benefitAmountPerPurchase: '1',
        unlockCondition: (coreSystems) => {
            const prestigeModule = coreSystems.moduleLoader.getModule('prestige');
            if (!prestigeModule || !prestigeModule.logic) return false;
            const prestigeCount = prestigeModule.logic.getTotalPrestigeCount ? prestigeModule.logic.getTotalPrestigeCount() : coreSystems.decimalUtility.new(0);
            return coreSystems.decimalUtility.gte(prestigeCount, 1);
        }
    }
};

const featureUnlocks = {
    buyMultiples: { 
        id: 'buyMultiples', 
        name: 'Unlock Buy Multipliers', 
        description: 'Unlock the ability to buy producers and items in bulk (x10, x100, Max).', 
        costResource: 'images', 
        costAmount: '1000', // Cost updated
        flagToSet: 'buyMultiplesUnlocked', 
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
    automatorMenu: {
        id: 'unlockAutomatorMenu',
        name: 'Unlock Automator Menu',
        description: 'Unlock a dedicated menu to manage your automators.',
        costResource: 'images',
        costAmount: '5000',
        flagToSet: 'automatorTabUnlocked',
        unlockCondition: (coreSystems) => {
            const prestigeModule = coreSystems.moduleLoader.getModule('prestige');
            if (!prestigeModule || !prestigeModule.logic) return false;
            const prestigeCount = prestigeModule.logic.getTotalPrestigeCount ? prestigeModule.logic.getTotalPrestigeCount() : coreSystems.decimalUtility.new(0);
            return coreSystems.decimalUtility.gte(prestigeCount, 3);
        }
    },
    themes: {
        id: 'unlockThemes',
        name: 'Unlock Modified UI',
        description: 'Gain the ability to change the look and feel of the game with themes.',
        costResource: 'images',
        costAmount: '10000',
        flagToSet: 'themesUnlocked',
         unlockCondition: (coreSystems) => {
            const prestigeModule = coreSystems.moduleLoader.getModule('prestige');
            if (!prestigeModule || !prestigeModule.logic) return false;
            const prestigeCount = prestigeModule.logic.getTotalPrestigeCount ? prestigeModule.logic.getTotalPrestigeCount() : coreSystems.decimalUtility.new(0);
            return coreSystems.decimalUtility.gte(prestigeCount, 3);
        }
    }
};

export const staticModuleData = {
    resources: {
        images: { id: 'images', name: "Images", initialAmount: "0", isUnlocked: false, showInUI: false, hasProductionRate: false },
        studySkillPoints: { id: 'studySkillPoints', name: "Study Skill Points", initialAmount: "0", isUnlocked: true, showInUI: false, hasProductionRate: false },
        prestigeSkillPoints: { id: 'prestigeSkillPoints', name: 'Prestige Skill Points', initialAmount: '0', isUnlocked: true, showInUI: false, hasProductionRate: false }
    },
    
    // New categorized data for the UI overhaul
    consumables,
    skillPoints,
    featureUnlocks,
    
    // --- FIX: Add old properties back for manifest compatibility ---
    marketItems: { ...consumables, ...skillPoints },
    marketUnlocks: { ...featureUnlocks },
    // --- END FIX ---

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

    // --- FIX: Add UI property for manifest compatibility ---
    ui: {
        marketTabLabel: "Market"
    }
};
