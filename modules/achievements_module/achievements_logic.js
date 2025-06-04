// js/modules/achievements_module/achievements_logic.js 

/**
 * @file achievements_logic.js
 * @description Contains the business logic for the Achievements module,
 * primarily handling achievement condition checking, unlocking, and reward application.
 */

import { staticModuleData } from './achievements_data.js';
import { moduleState } from './achievements_state.js';

let coreSystemsRef = null; // To store references to core game systems

export const moduleLogic = {
    /**
     * Initializes the logic component with core system references.
     * @param {object} coreSystems - References to core game systems.
     */
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.debug("AchievementsLogic", "Logic initialized.");
    },

    /**
     * Checks all achievement conditions and unlocks any that are met.
     * This should be called periodically by the game loop.
     */
    checkAchievementConditions() {
        const { loggingSystem } = coreSystemsRef;

        for (const achievementId in staticModuleData.achievements) {
            const achievementDef = staticModuleData.achievements[achievementId];

            // Skip if already unlocked
            if (moduleState.unlockedAchievements[achievementId]) {
                continue;
            }

            const conditionMet = this._checkSingleAchievementCondition(achievementDef);

            if (conditionMet) {
                this.unlockAchievement(achievementId);
            }
        }
    },

    /**
     * Checks the condition for a single achievement.
     * @param {object} achievementDef - The definition of the achievement.
     * @returns {boolean} True if the condition is met, false otherwise.
     * @private
     */
    _checkSingleAchievementCondition(achievementDef) {
        const { coreResourceManager, decimalUtility, loggingSystem, moduleLoader } = coreSystemsRef;
        const condition = achievementDef.condition;

        if (!condition) {
            return false; // Achievements must have a condition
        }

        switch (condition.type) {
            case "producerOwned":
                const studiesModule = moduleLoader.getModule(condition.moduleId);
                if (studiesModule && studiesModule.logic && typeof studiesModule.logic.getOwnedProducerCount === 'function') {
                    const ownedCount = studiesModule.logic.getOwnedProducerCount(condition.producerId);
                    const requiredCount = decimalUtility.new(condition.count);
                    return decimalUtility.gte(ownedCount, requiredCount);
                } else {
                    loggingSystem.warn("AchievementsLogic", `Module '${condition.moduleId}' or its logic not available for producerOwned condition for achievement ${achievementDef.id}.`);
                    return false;
                }
            case "resourceAmount":
                const currentResourceAmount = coreResourceManager.getAmount(condition.resourceId);
                const requiredResourceAmount = decimalUtility.new(condition.amount);
                return decimalUtility.gte(currentResourceAmount, requiredResourceAmount);
            case "totalClicks":
                const coreGameplayModule = moduleLoader.getModule(condition.moduleId);
                if (coreGameplayModule && coreGameplayModule.logic && typeof coreGameplayModule.logic.getTotalClicks === 'function') {
                    const totalClicks = coreGameplayModule.logic.getTotalClicks();
                    const requiredClicks = parseInt(condition.count);
                    return totalClicks >= requiredClicks;
                } else {
                    loggingSystem.warn("AchievementsLogic", `Module '${condition.moduleId}' or its logic not available for totalClicks condition for achievement ${achievementDef.id}.`);
                    return false;
                }
            case "skillLevel":
                const skillsModule = moduleLoader.getModule(condition.moduleId);
                if (skillsModule && skillsModule.logic && typeof skillsModule.logic.getSkillLevel === 'function') {
                    const skillLevel = skillsModule.logic.getSkillLevel(condition.skillId);
                    const requiredLevel = parseInt(condition.level);
                    return skillLevel >= requiredLevel;
                } else {
                    loggingSystem.warn("AchievementsLogic", `Module '${condition.moduleId}' or its logic not available for skillLevel condition for achievement ${achievementDef.id}.`);
                    return false;
                }
            default:
                loggingSystem.warn("AchievementsLogic", `Unknown achievement condition type for ${achievementDef.id}: ${condition.type}`);
                return false;
        }
    },

    /**
     * Unlocks an achievement, applies its reward, and updates the UI.
     * @param {string} achievementId - The ID of the achievement to unlock.
     */
    unlockAchievement(achievementId) {
        const { coreGameStateManager, coreUIManager, loggingSystem } = coreSystemsRef;
        const achievementDef = staticModuleData.achievements[achievementId];

        if (!achievementDef) {
            loggingSystem.error("AchievementsLogic", `Attempted to unlock unknown achievement: ${achievementId}`);
            return;
        }

        if (moduleState.unlockedAchievements[achievementId]) {
            loggingSystem.warn("AchievementsLogic", `Achievement ${achievementId} is already unlocked.`);
            return;
        }

        moduleState.unlockedAchievements[achievementId] = true;
        coreGameStateManager.setModuleState('achievements', { ...moduleState }); // Persist state

        loggingSystem.info("AchievementsLogic", `Achievement Unlocked: ${achievementDef.name}!`);
        coreUIManager.showNotification(`Achievement Unlocked: ${achievementDef.name}!`, 'success', 4000);

        this.applyAchievementReward(achievementId);
    },

    /**
     * Applies the reward of an unlocked achievement via CoreUpgradeManager or directly.
     * @param {string} achievementId - The ID of the achievement whose reward to apply.
     */
    applyAchievementReward(achievementId) {
        const { coreResourceManager, coreUpgradeManager, decimalUtility, loggingSystem } = coreSystemsRef;
        const achievementDef = staticModuleData.achievements[achievementId];

        if (!achievementDef || !achievementDef.reward) {
            loggingSystem.warn("AchievementsLogic", `No reward defined for achievement: ${achievementId}`);
            return;
        }

        const reward = achievementDef.reward;
        const sourceId = `achievements_module_${achievementId}`;
        const rewardValue = decimalUtility.new(reward.value);

        switch (reward.type) {
            case "productionMultiplier":
                // Register with CoreUpgradeManager
                coreUpgradeManager.registerEffect(
                    reward.targetType,
                    reward.type,
                    reward.targetId,
                    sourceId,
                    rewardValue
                );
                loggingSystem.debug("AchievementsLogic", `Applied production multiplier reward for ${achievementId}. Target: ${reward.targetId}, Value: ${rewardValue.toString()}`);
                break;
            case "resourceGain":
                // One-time resource gain
                coreResourceManager.addAmount(reward.resourceId, rewardValue);
                loggingSystem.debug("AchievementsLogic", `Applied resource gain reward for ${achievementId}. Gained ${rewardValue.toString()} ${reward.resourceId}.`);
                break;
            // Add other reward types as needed (e.g., cost reduction, global boost)
            default:
                loggingSystem.warn("AchievementsLogic", `Unknown achievement reward type for ${achievementId}: ${reward.type}`);
                break;
        }
    },

    /**
     * Re-applies all rewards for already unlocked achievements.
     * This is crucial on game load to ensure all active bonuses are registered.
     */
    applyAllUnlockedAchievementRewards() {
        const { loggingSystem } = coreSystemsRef;
        loggingSystem.info("AchievementsLogic", "Re-applying rewards for all unlocked achievements.");
        for (const achievementId in moduleState.unlockedAchievements) {
            if (moduleState.unlockedAchievements[achievementId]) {
                this.applyAchievementReward(achievementId);
            }
        }
    },

    /**
     * Gets the current progress towards an achievement.
     * @param {string} achievementId - The ID of the achievement.
     * @returns {{current: Decimal|number, required: Decimal|number}} Current and required values.
     */
    getAchievementProgress(achievementId) {
        const { coreResourceManager, decimalUtility, moduleLoader } = coreSystemsRef;
        const achievementDef = staticModuleData.achievements[achievementId];

        if (!achievementDef || !achievementDef.condition) {
            return { current: decimalUtility.ZERO, required: decimalUtility.ONE }; // Default for invalid
        }

        const condition = achievementDef.condition;
        let current = decimalUtility.ZERO;
        let required = decimalUtility.ONE; // Default to 1 to avoid division by zero

        switch (condition.type) {
            case "producerOwned":
                const studiesModule = moduleLoader.getModule(condition.moduleId);
                if (studiesModule && studiesModule.logic && typeof studiesModule.logic.getOwnedProducerCount === 'function') {
                    current = studiesModule.logic.getOwnedProducerCount(condition.producerId);
                    required = decimalUtility.new(condition.count);
                }
                break;
            case "resourceAmount":
                current = coreResourceManager.getAmount(condition.resourceId);
                required = decimalUtility.new(condition.amount);
                break;
            case "totalClicks":
                const coreGameplayModule = moduleLoader.getModule(condition.moduleId);
                if (coreGameplayModule && coreGameplayModule.logic && typeof coreGameplayModule.logic.getTotalClicks === 'function') {
                    current = decimalUtility.new(coreGameplayModule.logic.getTotalClicks());
                    required = decimalUtility.new(condition.count);
                }
                break;
            case "skillLevel":
                const skillsModule = moduleLoader.getModule(condition.moduleId);
                if (skillsModule && skillsModule.logic && typeof skillsModule.logic.getSkillLevel === 'function') {
                    current = decimalUtility.new(skillsModule.logic.getSkillLevel(condition.skillId));
                    required = decimalUtility.new(condition.level);
                }
                break;
        }
        return { current: current, required: required };
    },

    /**
     * Checks if the Achievements tab itself should be unlocked.
     * @returns {boolean}
     */
    isAchievementsTabUnlocked() {
        const { coreGameStateManager } = coreSystemsRef;
        const condition = staticModuleData.ui.achievementsTabUnlockCondition;

        if (!condition) {
            return false; // Must have a condition
        }

        if (condition.type === "globalFlag") {
            return coreGameStateManager.getGlobalFlag(condition.flag) === condition.value;
        }
        return false;
    },

    /**
     * Lifecycle method called when the game loads.
     * Ensures all achievement rewards are correctly applied based on loaded state.
     */
    onGameLoad() {
        coreSystemsRef.loggingSystem.info("AchievementsLogic", "onGameLoad: Re-applying all unlocked achievement rewards.");
        this.applyAllUnlockedAchievementRewards();
    },

    /**
     * Lifecycle method called when the game resets.
     * Resets module-specific state and removes effects.
     */
    onResetState() {
        coreSystemsRef.loggingSystem.info("AchievementsLogic", "onResetState: Resetting Achievements module logic state and removing effects.");
        // The moduleState will be re-initialized by the manifest, clearing unlockedAchievements.
        // We need to explicitly remove effects from CoreUpgradeManager for all achievements.
        for (const achievementId in staticModuleData.achievements) {
            const achievementDef = staticModuleData.achievements[achievementId];
            if (achievementDef.reward) {
                const sourceId = `achievements_module_${achievementId}`;
                // Only remove if it's a persistent effect (multiplier, not one-time gain)
                if (achievementDef.reward.type === 'productionMultiplier' || achievementDef.reward.type === 'costReduction') {
                    coreSystemsRef.coreUpgradeManager.removeEffect(
                        achievementDef.reward.targetType,
                        achievementDef.reward.type,
                        achievementDef.reward.targetId,
                        sourceId
                    );
                }
            }
        }
        // No need to re-apply, as state is reset and will be empty
    }
};
