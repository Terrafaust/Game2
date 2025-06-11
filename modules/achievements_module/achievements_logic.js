// modules/achievements_module/achievements_logic.js (v3.0 - Complete & Refactored)
// Now uses constants and productionManager for checks.

import { staticModuleData } from './achievements_data.js';
import { moduleState } from './achievements_state.js';
// FIXED: Corrected the import path to include the 'js' directory.
import { RESOURCES, MODULES, GLOBAL_FLAGS, EFFECT_TYPES } from '../../js/core/constants.js';

let coreSystemsRef = null;

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("AchievementsLogic", "Logic initialized (v3.0).");
        this.applyAllCompletedAchievementRewards();
        this.registerGlobalAchievementBonus();
    },

    getCompletedAchievementCount() {
        return Object.keys(moduleState.completedAchievements).length;
    },

    registerGlobalAchievementBonus() {
        const { coreUpgradeManager, decimalUtility } = coreSystemsRef;
        const valueProvider = () => decimalUtility.add(1, decimalUtility.multiply(this.getCompletedAchievementCount(), 0.01));
        coreUpgradeManager.registerEffectSource('achievements', 'global_bonus_from_total_count', 'global_production', 'all', EFFECT_TYPES.MULTIPLIER, valueProvider);
    },

    isAchievementsTabUnlocked() {
        const { coreGameStateManager, coreUIManager } = coreSystemsRef;
        if (coreGameStateManager.getGlobalFlag(GLOBAL_FLAGS.ACHIEVEMENTS_TAB_UNLOCKED, false)) {
            // This flag is set by the market module. This function just checks it.
            return true;
        }
        return false;
    },

    isAchievementCompleted(achievementId) {
        return !!moduleState.completedAchievements[achievementId];
    },

    checkAchievementCondition(achievementId) {
        const { coreResourceManager, decimalUtility, moduleLoader } = coreSystemsRef;
        const achievementDef = staticModuleData.achievements[achievementId];
        if (!achievementDef) return false;

        const { type, moduleId, resourceId, producerId, amount, count, tier, skillId } = achievementDef.condition;
        const module = moduleId ? moduleLoader.getModule(moduleId) : null;

        switch (type) {
            case "producerOwned":
                return module?.logic?.getOwnedProducerCount ? decimalUtility.gte(module.logic.getOwnedProducerCount(producerId), count) : false;
            case "prestigeProducerOwned":
                return module?.logic?.getOwnedPrestigeProducerCount ? decimalUtility.gte(module.logic.getOwnedPrestigeProducerCount(producerId), count) : false;
            case "resourceAmount":
                return decimalUtility.gte(coreResourceManager.getAmount(resourceId), amount);
            case "totalClicks":
                return module?.logic?.getTotalClicks ? module.logic.getTotalClicks() >= count : false;
            case "skillTierUnlocked":
                return module?.logic?.isTierUnlocked ? module.logic.isTierUnlocked(tier) : false;
            case "skillMaxLevel":
                if (module?.logic?.getSkillLevel && module?.logic?.getSkillMaxLevel) {
                    return module.logic.getSkillLevel(skillId) >= module.logic.getSkillMaxLevel(skillId);
                }
                return false;
            case "totalAchievements":
                return this.getCompletedAchievementCount() >= count;
            default:
                return false;
        }
    },

    checkAndCompleteAchievements() {
        const { coreGameStateManager, loggingSystem, coreUIManager, coreUpgradeManager, decimalUtility, coreResourceManager, moduleLoader } = coreSystemsRef;
        let newAchievementsCompleted = false;

        for (const achievementId in staticModuleData.achievements) {
            if (!this.isAchievementCompleted(achievementId) && this.checkAchievementCondition(achievementId)) {
                moduleState.completedAchievements[achievementId] = true;
                newAchievementsCompleted = true;
                const achievementDef = staticModuleData.achievements[achievementId];
                loggingSystem.info("AchievementsLogic", `Achievement Unlocked: ${achievementDef.name}`);
                coreUIManager.showAchievementNotification(achievementDef.name, achievementDef.icon, achievementId);

                const { reward } = achievementDef;
                if (reward) {
                    if (reward.type === EFFECT_TYPES.RESOURCE_GAIN) { 
                        coreResourceManager.addAmount(reward.resourceId, reward.amount);
                    } else if (reward.type.includes("MULTIPLIER") || reward.type === EFFECT_TYPES.COST_GROWTH_REDUCTION) { 
                        const valueProvider = reward.type.includes("MULTIPLIER")
                            ? () => decimalUtility.add(1, reward.value)
                            : () => decimalUtility.new(reward.value);
                        coreUpgradeManager.registerEffectSource(MODULES.ACHIEVEMENTS, achievementId, reward.targetSystem, reward.targetId, reward.type, valueProvider);
                    } else if (reward.type === EFFECT_TYPES.UNLOCK_FEATURE) {
                        coreGameStateManager.setGlobalFlag(reward.flag, true);
                        coreUIManager.renderMenu();
                    }
                }
            }
        }

        if (newAchievementsCompleted) {
            coreGameStateManager.setModuleState(MODULES.ACHIEVEMENTS, { ...moduleState });
            coreSystemsRef.productionManager.recalculateTotalProduction(RESOURCES.STUDY_POINTS);
            coreSystemsRef.productionManager.recalculateTotalProduction(RESOURCES.KNOWLEDGE);
        }
    },
    
    applyAllCompletedAchievementRewards() {
        const { coreUpgradeManager, decimalUtility, coreGameStateManager } = coreSystemsRef;
        for (const achievementId in moduleState.completedAchievements) {
            if (this.isAchievementCompleted(achievementId)) {
                const achievementDef = staticModuleData.achievements[achievementId];
                if (!achievementDef?.reward) continue;
                const { reward } = achievementDef;

                if (reward.type.includes("MULTIPLIER") || reward.type === EFFECT_TYPES.COST_GROWTH_REDUCTION) {
                    const valueProvider = reward.type.includes("MULTIPLIER")
                        ? () => decimalUtility.add(1, reward.value)
                        : () => decimalUtility.new(reward.value);
                    coreUpgradeManager.registerEffectSource(MODULES.ACHIEVEMENTS, achievementId, reward.targetSystem, reward.targetId, reward.type, valueProvider);
                } else if (reward.type === EFFECT_TYPES.UNLOCK_FEATURE) {
                    coreGameStateManager.setGlobalFlag(reward.flag, true);
                }
            }
        }
    },

    onGameLoad() {
        this.applyAllCompletedAchievementRewards();
        this.registerGlobalAchievementBonus(); 
        this.checkAndCompleteAchievements();
    },

    onResetState() {
        Object.assign(moduleState, getInitialState());
    }
};
