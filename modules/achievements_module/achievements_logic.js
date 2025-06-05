// modules/achievements_module/achievements_logic.js (v1.3 - Full Skill/SSP Achievements)

/**
 * @file achievements_logic.js
 * @description Business logic for the Achievements module.
 * v1.3: Fully implements skill-based and SSP achievement conditions.
 */

import { staticModuleData } from './achievements_data.js';
import { moduleState } from './achievements_state.js';

let coreSystemsRef = null;

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("AchievementsLogic", "Logic initialized (v1.3).");
        this.applyAllCompletedAchievementRewards(); 
    },

    isAchievementsTabUnlocked() {
        if (!coreSystemsRef || !coreSystemsRef.coreGameStateManager) {
            console.error("AchievementsLogic_isTabUnlocked_CRITICAL: coreGameStateManager missing!");
            return true; 
        }
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
        if (!coreSystemsRef || !coreSystemsRef.coreResourceManager || !coreSystemsRef.decimalUtility || !coreSystemsRef.loggingSystem || !coreSystemsRef.moduleLoader) {
            console.error("AchievementsLogic_checkCondition_CRITICAL: Core systems missing!", coreSystemsRef);
            return false;
        }
        const { coreResourceManager, decimalUtility, loggingSystem, moduleLoader } = coreSystemsRef;
        const achievementDef = staticModuleData.achievements[achievementId];
        if (!achievementDef) {
            loggingSystem.warn("AchievementsLogic", `Unknown achievement ID: ${achievementId}`);
            return false;
        }

        const condition = achievementDef.condition;
        switch (condition.type) {
            case "producerOwned":
                const targetModule = moduleLoader.getModule(condition.moduleId); 
                if (targetModule && targetModule.getProducerData) {
                    const producerData = targetModule.getProducerData(condition.producerId);
                    return decimalUtility.gte(producerData.owned, decimalUtility.new(condition.count));
                }
                loggingSystem.warn("AchievementsLogic", `Module ${condition.moduleId} or getProducerData not found for producer achievement ${achievementId}`);
                return false;
            case "resourceAmount": // Handles Study Points, Knowledge, AND Study Skill Points
                const currentAmount = coreResourceManager.getAmount(condition.resourceId);
                return decimalUtility.gte(currentAmount, decimalUtility.new(condition.amount));
            case "totalClicks":
                const coreGameplayModule = moduleLoader.getModule(condition.moduleId); 
                if (coreGameplayModule && coreGameplayModule.logic && coreGameplayModule.logic.getTotalClicks) {
                    const totalClicks = coreGameplayModule.logic.getTotalClicks();
                    return totalClicks >= condition.count;
                }
                loggingSystem.warn("AchievementsLogic", `Module ${condition.moduleId} or getTotalClicks not found for click achievement ${achievementId}`);
                return false;
            case "skillTierUnlocked": 
                const skillsModuleTier = moduleLoader.getModule(condition.moduleId); 
                if (skillsModuleTier && skillsModuleTier.logic && typeof skillsModuleTier.logic.isTierUnlocked === 'function') { 
                    return skillsModuleTier.logic.isTierUnlocked(condition.tier);
                }
                loggingSystem.warn("AchievementsLogic", `Skill tier unlock condition for ${achievementId} - skills module or logic.isTierUnlocked not ready or not a function.`);
                return false; 
            case "skillMaxLevel": 
                 const skillsModuleMax = moduleLoader.getModule(condition.moduleId); 
                 if (skillsModuleMax && skillsModuleMax.logic && 
                     typeof skillsModuleMax.logic.getSkillLevel === 'function' && 
                     typeof skillsModuleMax.logic.getSkillMaxLevel === 'function') { 
                    const currentLevel = skillsModuleMax.logic.getSkillLevel(condition.skillId);
                    const maxLevel = skillsModuleMax.logic.getSkillMaxLevel(condition.skillId); 
                    return maxLevel > 0 && currentLevel >= maxLevel; 
                 }
                 loggingSystem.warn("AchievementsLogic", `Skill max level condition for ${achievementId} - skills module or relevant logic methods not ready or not functions.`);
                return false;
            default:
                loggingSystem.warn("AchievementsLogic", `Unknown condition type for achievement ${achievementId}: ${condition.type}`);
                return false;
        }
    },

    checkAndCompleteAchievements() {
        if (!coreSystemsRef || !coreSystemsRef.coreGameStateManager || !coreSystemsRef.loggingSystem || !coreSystemsRef.coreUIManager || !coreSystemsRef.coreUpgradeManager || !coreSystemsRef.decimalUtility || !coreSystemsRef.coreResourceManager) {
            console.error("AchievementsLogic_checkAndComplete_CRITICAL: Core systems missing!", coreSystemsRef);
            return;
        }
        const { coreGameStateManager, loggingSystem, coreUIManager, coreUpgradeManager, decimalUtility, coreResourceManager } = coreSystemsRef;
        let newAchievementsCompleted = false;

        for (const achievementId in staticModuleData.achievements) {
            if (!this.isAchievementCompleted(achievementId)) {
                if (this.checkAchievementCondition(achievementId)) {
                    moduleState.completedAchievements[achievementId] = true;
                    newAchievementsCompleted = true;
                    const achievementDef = staticModuleData.achievements[achievementId];
                    loggingSystem.info("AchievementsLogic", `Achievement Unlocked: ${achievementDef.name}`);
                    coreUIManager.showNotification(`Achievement Unlocked: ${achievementDef.name}!`, 'success', 4000);

                    if (achievementDef.reward) {
                        const reward = achievementDef.reward;
                        if (reward.type === "RESOURCE_GAIN") { 
                            coreResourceManager.addAmount(reward.resourceId, decimalUtility.new(reward.amount));
                            loggingSystem.info("AchievementsLogic", `Granted one-time reward for ${achievementId}: ${reward.amount} ${reward.resourceId}`);
                        } else if (reward.type.includes("MULTIPLIER")) { 
                            const valueProvider = () => decimalUtility.add(1, decimalUtility.new(reward.value));
                             coreUpgradeManager.registerEffectSource(
                                'achievements', achievementId, reward.targetSystem,
                                reward.targetId, reward.type, valueProvider
                            );
                            if (reward.targetSystem === "studies_producers" || reward.targetSystem === "global_resource_production" || reward.targetSystem === "core_gameplay_click") {
                                const studiesModule = coreSystemsRef.moduleLoader.getModule("studies");
                                if(studiesModule && studiesModule.logic && studiesModule.logic.updateAllProducerProductions){
                                    studiesModule.logic.updateAllProducerProductions();
                                }
                            }
                        }
                    }
                }
            }
        }

        if (newAchievementsCompleted) {
            coreGameStateManager.setModuleState('achievements', { ...moduleState });
            if (coreUIManager.isActiveTab('achievements')) {
                const achievementsUI = coreSystemsRef.moduleLoader.getModule('achievements')?.ui;
                if (achievementsUI) achievementsUI.updateDynamicElements();
            }
        }
    },
    
    applyAllCompletedAchievementRewards() {
        if (!coreSystemsRef || !coreSystemsRef.coreUpgradeManager || !coreSystemsRef.decimalUtility || !coreSystemsRef.loggingSystem) {
            console.error("AchievementsLogic_applyAll_CRITICAL: Core systems missing!", coreSystemsRef);
            return;
        }
        const { coreUpgradeManager, decimalUtility, loggingSystem } = coreSystemsRef;
        
        for (const achievementId in moduleState.completedAchievements) {
            if (moduleState.completedAchievements[achievementId]) {
                const achievementDef = staticModuleData.achievements[achievementId];
                if (achievementDef && achievementDef.reward) {
                    const reward = achievementDef.reward;
                    if (reward.type.includes("MULTIPLIER")) {
                        const valueProvider = () => decimalUtility.add(1, decimalUtility.new(reward.value));
                        coreUpgradeManager.registerEffectSource(
                            'achievements', achievementId, reward.targetSystem,
                            reward.targetId, reward.type, valueProvider
                        );
                    }
                }
            }
        }
        loggingSystem.info("AchievementsLogic", "Applied persistent rewards for previously completed achievements.");
    },

    onGameLoad() {
        if (!coreSystemsRef || !coreSystemsRef.loggingSystem) {
            console.error("AchievementsLogic_onGameLoad_CRITICAL: Core systems missing!", coreSystemsRef);
            return;
        }
        coreSystemsRef.loggingSystem.info("AchievementsLogic", "onGameLoad triggered for Achievements module (v1.3).");
        this.applyAllCompletedAchievementRewards();
        this.checkAndCompleteAchievements();
        this.isAchievementsTabUnlocked(); 
    },

    onResetState() {
        if (!coreSystemsRef || !coreSystemsRef.loggingSystem || !coreSystemsRef.coreGameStateManager) {
            console.error("AchievementsLogic_onResetState_CRITICAL: Core systems missing!", coreSystemsRef);
            return;
        }
        coreSystemsRef.loggingSystem.info("AchievementsLogic", "onResetState triggered for Achievements module (v1.3).");
        if (coreSystemsRef.coreGameStateManager) {
            coreSystemsRef.coreGameStateManager.setGlobalFlag('achievementsTabPermanentlyUnlocked', false);
            coreSystemsRef.loggingSystem.info("AchievementsLogic", "'achievementsTabPermanentlyUnlocked' flag cleared.");
        }
    }
};
