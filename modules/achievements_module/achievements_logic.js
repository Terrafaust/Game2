// modules/achievements_module/achievements_logic.js (v1)

/**
 * @file achievements_logic.js
 * @description Business logic for the Achievements module.
 * Handles checking achievement conditions and applying rewards.
 */

import { staticModuleData } from './achievements_data.js';
import { moduleState } from './achievements_state.js';

let coreSystemsRef = null;

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("AchievementsLogic", "Logic initialized (v1).");
        this.applyAllCompletedAchievementRewards(); // Apply rewards for already completed achievements on load
    },

    isAchievementsTabUnlocked() {
        if (!coreSystemsRef) return false;
        return coreSystemsRef.coreGameStateManager.getGlobalFlag('achievementsTabUnlocked', false);
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
                const studiesModule = moduleLoader.getModule(condition.moduleId); // e.g., 'studies'
                if (studiesModule && studiesModule.getProducerData) {
                    const producerData = studiesModule.getProducerData(condition.producerId);
                    return decimalUtility.gte(producerData.owned, decimalUtility.new(condition.count));
                }
                loggingSystem.warn("AchievementsLogic", `Module ${condition.moduleId} or getProducerData not found for achievement ${achievementId}`);
                return false;
            case "resourceAmount":
                const currentAmount = coreResourceManager.getAmount(condition.resourceId);
                return decimalUtility.gte(currentAmount, decimalUtility.new(condition.amount));
            // Add other condition types (e.g., total resources earned, skills leveled)
            default:
                loggingSystem.warn("AchievementsLogic", `Unknown condition type for achievement ${achievementId}: ${condition.type}`);
                return false;
        }
    },

    /**
     * Checks all achievements and updates their state if newly completed.
     * Applies rewards for newly completed achievements.
     */
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

                    // Apply reward via CoreUpgradeManager
                    if (achievementDef.reward) {
                        const reward = achievementDef.reward;
                        const valueProvider = () => {
                            // For MULTIPLIER, the 'value' is the bonus (e.g., 0.05 for +5%).
                            // The actual multiplier applied is 1 + value.
                            return decimalUtility.add(1, decimalUtility.new(reward.value));
                        };
                        coreUpgradeManager.registerEffectSource(
                            'achievements', // moduleId
                            achievementId,  // sourceKey (unique achievement ID)
                            reward.targetSystem,
                            reward.targetId,
                            reward.type,    // e.g., 'MULTIPLIER'
                            valueProvider
                        );
                        // After registering an effect, relevant systems (like studies_logic) need to re-evaluate their production/costs.
                        // This is typically handled by their own update loops or when an action triggers recalculation.
                        // For immediate effect, we might need to trigger a recalculation in studies module for example.
                        if (reward.targetSystem === "studies_producers" || reward.targetSystem === "global_resource_production") {
                             const studiesModule = coreSystemsRef.moduleLoader.getModule("studies");
                             if(studiesModule && studiesModule.logic && studiesModule.logic.updateAllProducerProductions){
                                studiesModule.logic.updateAllProducerProductions();
                             }
                        }

                    }
                }
            }
        }

        if (newAchievementsCompleted) {
            coreGameStateManager.setModuleState('achievements', { ...moduleState });
            // If UI is active, tell it to refresh
            if (coreUIManager.isActiveTab('achievements')) {
                const achievementsUI = coreSystemsRef.moduleLoader.getModule('achievements')?.ui;
                if (achievementsUI) achievementsUI.updateDynamicElements();
            }
        }
    },
    
    /**
     * Applies rewards for all achievements already marked as completed in the state.
     * Useful on game load.
     */
    applyAllCompletedAchievementRewards() {
        const { coreUpgradeManager, decimalUtility, loggingSystem } = coreSystemsRef;
        if (!coreUpgradeManager) {
            loggingSystem.error("AchievementsLogic", "CoreUpgradeManager not available.");
            return;
        }

        for (const achievementId in moduleState.completedAchievements) {
            if (moduleState.completedAchievements[achievementId]) {
                const achievementDef = staticModuleData.achievements[achievementId];
                if (achievementDef && achievementDef.reward) {
                    const reward = achievementDef.reward;
                     const valueProvider = () => decimalUtility.add(1, decimalUtility.new(reward.value));
                    coreUpgradeManager.registerEffectSource(
                        'achievements', achievementId, reward.targetSystem,
                        reward.targetId, reward.type, valueProvider
                    );
                }
            }
        }
        loggingSystem.info("AchievementsLogic", "Applied rewards for all previously completed achievements.");
    },

    onGameLoad() {
        coreSystemsRef.loggingSystem.info("AchievementsLogic", "onGameLoad triggered for Achievements module.");
        // State is loaded by manifest. Re-apply rewards for completed achievements.
        this.applyAllCompletedAchievementRewards();
        // Check all achievements in case conditions were met while game was closed (if offline progress were a thing)
        // or if new achievements were added that might be auto-completed by current state.
        this.checkAndCompleteAchievements();
    },

    onResetState() {
        coreSystemsRef.loggingSystem.info("AchievementsLogic", "onResetState triggered for Achievements module.");
        // Module state (completedAchievements) will be reset by the manifest.
        // Effects should be implicitly removed if CoreUpgradeManager clears sources from 'achievements' module,
        // or if we explicitly unregister them. For now, a full re-registration on load handles it.
        // On a fresh game, applyAllCompleted will do nothing, and checkAndComplete will handle new ones.
        // TODO: Consider a mechanism in CoreUpgradeManager to unregister all effects from a given moduleId.
    }
};
