// modules/achievements_module/achievements_logic.js (v2.0 - Ascension Update)

/**
 * @file achievements_logic.js
 * @description Business logic for the Achievements module.
 * v2.0: Adds prestige conditions and a global multiplier for total achievements.
 */

import { staticModuleData } from './achievements_data.js';
import { moduleState } from './achievements_state.js';

let coreSystemsRef = null;

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("AchievementsLogic", "Logic initialized (v2.0).");
        this.applyAllCompletedAchievementRewards();
        this.registerGlobalAchievementBonus(); // New: Register the dynamic global bonus
    },

    getCompletedAchievementCount() {
        return Object.keys(moduleState.completedAchievements).length;
    },

    // New: Register the global bonus based on total completed achievements
    registerGlobalAchievementBonus() {
        const { coreUpgradeManager, decimalUtility, loggingSystem } = coreSystemsRef;
        const valueProvider = () => {
            const count = this.getCompletedAchievementCount();
            // Formula: 1 + (count * 0.01) -> e.g., 77 achievements = 1 + 0.77 = 1.77x multiplier
            return decimalUtility.add(1, decimalUtility.multiply(count, 0.01));
        };

        coreUpgradeManager.registerEffectSource(
            'achievements',
            'global_bonus_from_total_count', // unique key
            'global_production', // a global target
            'all', // affecting everything
            'MULTIPLIER',
            valueProvider // dynamically calculates the bonus
        );
        loggingSystem.info("AchievementsLogic", "Registered dynamic global production bonus from total achievements.");
    },

    isAchievementsTabUnlocked() {
        if (!coreSystemsRef || !coreSystemsRef.coreGameStateManager) { return true; }
        const { coreGameStateManager, coreUIManager, loggingSystem } = coreSystemsRef;
        if (coreGameStateManager.getGlobalFlag('achievementsTabPermanentlyUnlocked', false)) {
            return true;
        }
        const conditionMet = coreGameStateManager.getGlobalFlag('achievementsTabUnlocked', false); 
        if (conditionMet) {
            coreGameStateManager.setGlobalFlag('achievementsTabPermanentlyUnlocked', true);
            if(coreUIManager) coreUIManager.renderMenu();
            loggingSystem.info("AchievementsLogic", "Achievements tab permanently unlocked.");
            return true;
        }
        return false;
    },

    isAchievementCompleted(achievementId) {
        return moduleState.completedAchievements[achievementId] === true;
    },

    checkAchievementCondition(achievementId) {
        const { coreResourceManager, decimalUtility, loggingSystem, moduleLoader } = coreSystemsRef;
        const achievementDef = staticModuleData.achievements[achievementId];
        if (!achievementDef) {
            loggingSystem.warn("AchievementsLogic", `Unknown achievement ID: ${achievementId}`);
            return false;
        }

        const condition = achievementDef.condition;
        switch (condition.type) {
            case "producerOwned":
                const studiesModule = moduleLoader.getModule('studies');
                if (studiesModule?.logic?.getOwnedProducerCount) {
                    const count = studiesModule.logic.getOwnedProducerCount(condition.producerId);
                    return decimalUtility.gte(count, condition.count);
                }
                return false;

            case "prestigeProducerOwned": // New condition type
                const prestigeModule = moduleLoader.getModule('prestige');
                if (prestigeModule?.logic?.getOwnedPrestigeProducerCount) {
                    const count = prestigeModule.logic.getOwnedPrestigeProducerCount(condition.producerId);
                    return decimalUtility.gte(count, condition.count);
                }
                return false;

            case "resourceAmount":
                return decimalUtility.gte(coreResourceManager.getAmount(condition.resourceId), condition.amount);

            case "totalClicks":
                const coreModule = moduleLoader.getModule('core_gameplay');
                if (coreModule?.logic?.getTotalClicks) {
                    return coreModule.logic.getTotalClicks() >= condition.count;
                }
                return false;

            case "skillTierUnlocked": 
                const skillsModuleT = moduleLoader.getModule('skills');
                if (skillsModuleT?.logic?.isTierUnlocked) { 
                    return skillsModuleT.logic.isTierUnlocked(condition.tier);
                }
                return false; 

            case "skillMaxLevel": 
                 const skillsModuleM = moduleLoader.getModule('skills');
                 if (skillsModuleM?.logic?.getSkillLevel && skillsModuleM?.logic?.getSkillMaxLevel) { 
                    const currentLevel = skillsModuleM.logic.getSkillLevel(condition.skillId);
                    const maxLevel = skillsModuleM.logic.getSkillMaxLevel(condition.skillId); 
                    return maxLevel > 0 && currentLevel >= maxLevel; 
                 }
                return false;

            case "totalAchievements": // New condition type
                return this.getCompletedAchievementCount() >= condition.count;

            default:
                loggingSystem.warn("AchievementsLogic", `Unknown condition type for achievement ${achievementId}: ${condition.type}`);
                return false;
        }
    },

    checkAndCompleteAchievements() {
        const { coreGameStateManager, loggingSystem, coreUIManager, coreUpgradeManager, decimalUtility, coreResourceManager, moduleLoader } = coreSystemsRef;
        let newAchievementsCompleted = false;

        for (const achievementId in staticModuleData.achievements) {
            if (!this.isAchievementCompleted(achievementId)) {
                if (this.checkAchievementCondition(achievementId)) {
                    moduleState.completedAchievements[achievementId] = true;
                    newAchievementsCompleted = true;
                    const achievementDef = staticModuleData.achievements[achievementId];
                    loggingSystem.info("AchievementsLogic", `Achievement Unlocked: ${achievementDef.name}`);
                    coreUIManager.showNotification(`Achievement Unlocked: ${achievementDef.name}!`, 'success', 4000);

                    // Apply the one-time static reward, if it exists
                    if (achievementDef.reward) {
                        const reward = achievementDef.reward;
                        if (reward.type === "RESOURCE_GAIN") { 
                            coreResourceManager.addAmount(reward.resourceId, decimalUtility.new(reward.amount));
                            loggingSystem.info("AchievementsLogic", `Granted one-time reward for ${achievementId}: ${reward.amount} ${reward.resourceId}`);
                        } else if (reward.type.includes("MULTIPLIER")) { 
                            const valueProvider = () => decimalUtility.add(1, decimalUtility.new(reward.value));
                            coreUpgradeManager.registerEffectSource('achievements', achievementId, reward.targetSystem, reward.targetId, reward.type, valueProvider);
                        }
                    }
                }
            }
        }

        if (newAchievementsCompleted) {
            coreGameStateManager.setModuleState('achievements', { ...moduleState });
            
            // Because the global achievement bonus depends on the count, we need to force an update
            // on all productions whenever a new achievement is earned.
            const studiesModule = moduleLoader.getModule("studies");
            if(studiesModule?.logic?.updateAllProducerProductions){
                studiesModule.logic.updateAllProducerProductions();
            }
            const prestigeModule = moduleLoader.getModule("prestige");
            if(prestigeModule?.logic?.updateAllPrestigeProducerProductions){
                prestigeModule.logic.updateAllPrestigeProducerProductions();
            }

            if (coreUIManager.isActiveTab('achievements')) {
                const achievementsUI = moduleLoader.getModule('achievements')?.ui;
                if (achievementsUI) achievementsUI.updateDynamicElements();
            }
        }
    },
    
    applyAllCompletedAchievementRewards() {
        const { coreUpgradeManager, decimalUtility, loggingSystem } = coreSystemsRef;
        
        for (const achievementId in moduleState.completedAchievements) {
            if (moduleState.completedAchievements[achievementId]) {
                const achievementDef = staticModuleData.achievements[achievementId];
                if (achievementDef?.reward?.type.includes("MULTIPLIER")) {
                    const reward = achievementDef.reward;
                    const valueProvider = () => decimalUtility.add(1, decimalUtility.new(reward.value));
                    coreUpgradeManager.registerEffectSource('achievements', achievementId, reward.targetSystem, reward.targetId, reward.type, valueProvider);
                }
            }
        }
        loggingSystem.info("AchievementsLogic", "Applied persistent rewards for previously completed achievements.");
    },

    onGameLoad() {
        coreSystemsRef.loggingSystem.info("AchievementsLogic", "onGameLoad triggered (v2.0).");
        this.applyAllCompletedAchievementRewards();
        this.registerGlobalAchievementBonus(); // Ensure bonus is registered on load
        this.checkAndCompleteAchievements();
        this.isAchievementsTabUnlocked(); 
    },

    onResetState() {
        coreSystemsRef.loggingSystem.info("AchievementsLogic", "onResetState triggered (v2.0).");
        if (coreSystemsRef.coreGameStateManager) {
            coreSystemsRef.coreGameStateManager.setGlobalFlag('achievementsTabPermanentlyUnlocked', false);
        }
    }
};
