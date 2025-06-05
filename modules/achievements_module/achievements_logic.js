// modules/achievements_module/achievements_logic.js (v1.1 - Skill Achievement Stubs)

/**
 * @file achievements_logic.js
 * @description Business logic for the Achievements module.
 * v1.1: Adds stubs for skill-related achievement conditions.
 */

import { staticModuleData } from './achievements_data.js';
import { moduleState } from './achievements_state.js';

let coreSystemsRef = null;

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("AchievementsLogic", "Logic initialized (v1.1).");
        this.applyAllCompletedAchievementRewards(); 
    },

    isAchievementsTabUnlocked() {
        if (!coreSystemsRef) return false;
        // Check for the permanent unlock flag first
        return coreSystemsRef.coreGameStateManager.getGlobalFlag('achievementsTabPermanentlyUnlocked', false);
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
                const targetModule = moduleLoader.getModule(condition.moduleId); 
                if (targetModule && targetModule.getProducerData) {
                    const producerData = targetModule.getProducerData(condition.producerId);
                    return decimalUtility.gte(producerData.owned, decimalUtility.new(condition.count));
                }
                loggingSystem.warn("AchievementsLogic", `Module ${condition.moduleId} or getProducerData not found for achievement ${achievementId}`);
                return false;
            case "resourceAmount":
                const currentAmount = coreResourceManager.getAmount(condition.resourceId);
                return decimalUtility.gte(currentAmount, decimalUtility.new(condition.amount));
            case "totalClicks":
                const coreGameplayModule = moduleLoader.getModule(condition.moduleId); // 'core_gameplay'
                if (coreGameplayModule && coreGameplayModule.logic && coreGameplayModule.logic.getTotalClicks) {
                    const totalClicks = coreGameplayModule.logic.getTotalClicks();
                    return totalClicks >= condition.count;
                }
                loggingSystem.warn("AchievementsLogic", `Module ${condition.moduleId} or getTotalClicks not found for achievement ${achievementId}`);
                return false;
            case "skillTierUnlocked": // Stub for skill tier unlock
                const skillsModuleTier = moduleLoader.getModule(condition.moduleId); // 'skills'
                if (skillsModuleTier && skillsModuleTier.logic && skillsModuleTier.logic.isTierUnlocked) { // Assuming isTierUnlocked(tierNum) exists in skills_logic
                    return skillsModuleTier.logic.isTierUnlocked(condition.tier);
                }
                loggingSystem.warn("AchievementsLogic", `Skill tier unlock condition for ${achievementId} - skills module or logic.isTierUnlocked not ready.`);
                return false; 
            case "skillMaxLevel": // Stub for skill max level
                 const skillsModuleMax = moduleLoader.getModule(condition.moduleId); // 'skills'
                 if (skillsModuleMax && skillsModuleMax.logic && skillsModuleMax.logic.getSkillLevel && skillsModuleMax.logic.getSkillMaxLevel) { // Assuming getSkillMaxLevel(skillId) exists
                    const currentLevel = skillsModuleMax.logic.getSkillLevel(condition.skillId);
                    const maxLevel = skillsModuleMax.logic.getSkillMaxLevel(condition.skillId); // Need this function in skills_logic
                    return currentLevel >= maxLevel;
                 }
                 loggingSystem.warn("AchievementsLogic", `Skill max level condition for ${achievementId} - skills module or relevant logic not ready.`);
                return false;
            default:
                loggingSystem.warn("AchievementsLogic", `Unknown condition type for achievement ${achievementId}: ${condition.type}`);
                return false;
        }
    },

    checkAndCompleteAchievements() {
        const { coreGameStateManager, loggingSystem, coreUIManager, coreUpgradeManager, decimalUtility } = coreSystemsRef;
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
                        let valueProvider;

                        if (reward.type === "RESOURCE_GAIN") { // Handle one-time resource gain
                            coreResourceManager.addAmount(reward.resourceId, decimalUtility.new(reward.amount));
                            loggingSystem.info("AchievementsLogic", `Granted one-time reward for ${achievementId}: ${reward.amount} ${reward.resourceId}`);
                            // No need to register with CoreUpgradeManager for one-time gains
                        } else if (reward.type.includes("MULTIPLIER")) { // For persistent multipliers
                            valueProvider = () => decimalUtility.add(1, decimalUtility.new(reward.value));
                             coreUpgradeManager.registerEffectSource(
                                'achievements', achievementId, reward.targetSystem,
                                reward.targetId, reward.type, valueProvider
                            );
                             // Trigger recalculation in affected modules
                            if (reward.targetSystem === "studies_producers" || reward.targetSystem === "global_resource_production" || reward.targetSystem === "core_gameplay_click") {
                                const studiesModule = coreSystemsRef.moduleLoader.getModule("studies");
                                if(studiesModule && studiesModule.logic && studiesModule.logic.updateAllProducerProductions){
                                    studiesModule.logic.updateAllProducerProductions();
                                }
                                // If core_gameplay_click, no direct recalculation needed, bonus is applied on click
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
        const { coreUpgradeManager, decimalUtility, loggingSystem, coreResourceManager } = coreSystemsRef;
        if (!coreUpgradeManager) {
            loggingSystem.error("AchievementsLogic", "CoreUpgradeManager not available.");
            return;
        }

        for (const achievementId in moduleState.completedAchievements) {
            if (moduleState.completedAchievements[achievementId]) {
                const achievementDef = staticModuleData.achievements[achievementId];
                if (achievementDef && achievementDef.reward) {
                    const reward = achievementDef.reward;
                    // IMPORTANT: One-time rewards (like RESOURCE_GAIN) should NOT be re-applied on game load.
                    // They are applied once when the achievement is first completed.
                    // Only register persistent effects like multipliers here.
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
        coreSystemsRef.loggingSystem.info("AchievementsLogic", "onGameLoad triggered for Achievements module (v1.1).");
        this.applyAllCompletedAchievementRewards();
        this.checkAndCompleteAchievements();
    },

    onResetState() {
        coreSystemsRef.loggingSystem.info("AchievementsLogic", "onResetState triggered for Achievements module (v1.1).");
        // Unregister effects? CoreUpgradeManager might need a clearByModuleId('achievements')
        // For now, on next load, only truly completed ones will re-register.
        // State is cleared by manifest.
    }
};
