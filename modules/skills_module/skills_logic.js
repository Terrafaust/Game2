// modules/skills_module/skills_logic.js 

/**
 * @file skills_logic.js
 * @description Contains the business logic for the Skills module,
 * primarily handling skill purchases, level management, and effect application.
 */

import { staticModuleData } from './skills_data.js';
import { moduleState } from './skills_state.js';

let coreSystemsRef = null; // To store references to core game systems

export const moduleLogic = {
    /**
     * Initializes the logic component with core system references.
     * @param {object} coreSystems - References to core game systems.
     */
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.debug("SkillsLogic", "Logic initialized.");
    },

    /**
     * Calculates the current cost to level up a skill.
     * Formula: baseCost * (costGrowthFactor ^ currentLevel)
     * @param {string} skillId - The ID of the skill.
     * @returns {Decimal} The current cost to level up.
     */
    calculateSkillCost(skillId) {
        const { decimalUtility, loggingSystem } = coreSystemsRef;
        const skillDef = staticModuleData.skills[skillId];

        if (!skillDef) {
            loggingSystem.error("SkillsLogic", `Skill definition not found for ID: ${skillId}`);
            return decimalUtility.new(Infinity); // Return a very high cost if not found
        }

        const baseCost = decimalUtility.new(skillDef.baseCost);
        const costGrowthFactor = decimalUtility.new(skillDef.costGrowthFactor);
        const currentLevel = decimalUtility.new(moduleState.skillLevels[skillId] || 0);

        // Cost = baseCost * (costGrowthFactor ^ currentLevel)
        const currentCost = decimalUtility.multiply(
            baseCost,
            decimalUtility.power(costGrowthFactor, currentLevel)
        );

        return currentCost;
    },

    /**
     * Handles the purchase of a skill level.
     * @param {string} skillId - The ID of the skill to level up.
     * @returns {boolean} True if purchase was successful, false otherwise.
     */
    purchaseSkillLevel(skillId) {
        if (!coreSystemsRef) {
            console.error("SkillsLogic: Core systems not initialized.");
            return false;
        }

        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager, coreUIManager, coreUpgradeManager } = coreSystemsRef;
        const skillDef = staticModuleData.skills[skillId];

        if (!skillDef) {
            loggingSystem.error("SkillsLogic", `Attempted to purchase unknown skill: ${skillId}`);
            return false;
        }

        const currentLevel = moduleState.skillLevels[skillId] || 0;
        if (currentLevel >= skillDef.maxLevel) {
            loggingSystem.warn("SkillsLogic", `Skill ${skillId} is already at max level.`);
            coreUIManager.showNotification(`${skillDef.name} is already at max level!`, 'info', 2000);
            return false;
        }

        const cost = this.calculateSkillCost(skillId);
        const costResource = skillDef.costResource;

        if (coreResourceManager.canAfford(costResource, cost)) {
            coreResourceManager.spendAmount(costResource, cost);

            moduleState.skillLevels[skillId]++; // Increment skill level
            loggingSystem.info("SkillsLogic", `Leveled up ${skillDef.name} to level ${moduleState.skillLevels[skillId]}. Cost: ${decimalUtility.format(cost)} ${costResource}.`);

            // Apply the skill effect via CoreUpgradeManager
            this.applySkillEffect(skillId);

            // Persist the updated module state to the global game state
            coreGameStateManager.setModuleState('skills', { ...moduleState });

            // Check for tier unlocks if this was the last skill to reach level 1 in its tier
            this.checkTierUnlocks();

            return true;
        } else {
            loggingSystem.debug("SkillsLogic", `Cannot afford ${skillDef.name}. Need ${decimalUtility.format(cost)} ${costResource}. Have ${decimalUtility.format(coreResourceManager.getAmount(costResource))}`);
            return false;
        }
    },

    /**
     * Applies the effect of a skill to the game via CoreUpgradeManager.
     * This should be called after a skill level is purchased or on game load.
     * @param {string} skillId - The ID of the skill.
     */
    applySkillEffect(skillId) {
        const { coreUpgradeManager, decimalUtility, loggingSystem } = coreSystemsRef;
        const skillDef = staticModuleData.skills[skillId];
        const currentLevel = moduleState.skillLevels[skillId];

        if (!skillDef || !skillDef.effect) {
            loggingSystem.warn("SkillsLogic", `No effect defined for skill: ${skillId}`);
            return;
        }

        // Remove previous effect from this skill level to re-register the new one
        // This ensures effects are correctly updated when a skill levels up.
        // For simplicity, we'll remove the old effect and add the new one.
        // A more granular update might be possible if effects are truly additive.
        const sourceId = `skills_module_${skillId}`;
        coreUpgradeManager.removeEffect(skillDef.effect.targetType, skillDef.effect.type, skillDef.effect.targetId, sourceId);

        if (currentLevel > 0) {
            let effectValue = decimalUtility.multiply(decimalUtility.new(skillDef.effect.baseValue), currentLevel);

            // If it's a production multiplier, the base value is the percentage increase (e.g., 0.05 for 5%)
            // We need to convert this to a multiplier factor (1 + 0.05*level).
            if (skillDef.effect.type === 'productionMultiplier') {
                effectValue = decimalUtility.add(decimalUtility.ONE, effectValue);
            }
            // If it's a cost reduction, the base value is the percentage reduction (e.g., 0.02 for 2%)
            // The coreUpgradeManager expects the reduction factor (e.g., 0.98 for 2% reduction)
            // The `getAggregatedModifier` for costReduction will handle `(1 - sumOfReductions)`.
            // So here, we just register the baseValue * currentLevel.

            coreUpgradeManager.registerEffect(
                skillDef.effect.targetType,
                skillDef.effect.type,
                skillDef.effect.targetId,
                sourceId,
                effectValue
            );
            loggingSystem.debug("SkillsLogic", `Applied effect for skill '${skillId}' at level ${currentLevel}. Value: ${decimalUtility.format(effectValue)}`);
        } else {
            loggingSystem.debug("SkillsLogic", `Skill '${skillId}' at level 0. No effect applied.`);
        }
    },

    /**
     * Applies effects for all owned skills.
     * This should be called on game load and potentially after a reset.
     */
    applyAllSkillEffects() {
        for (const skillId in moduleState.skillLevels) {
            this.applySkillEffect(skillId);
        }
        coreSystemsRef.loggingSystem.debug("SkillsLogic", "All skill effects applied.");
    },

    /**
     * Checks if a skill is unlocked based on its tier's unlock condition.
     * @param {string} skillId - The ID of the skill.
     * @returns {boolean} True if unlocked, false otherwise.
     */
    isSkillUnlocked(skillId) {
        const { loggingSystem } = coreSystemsRef;
        const skillDef = staticModuleData.skills[skillId];

        if (!skillDef) {
            loggingSystem.error("SkillsLogic", `Skill definition not found for ID: ${skillId}`);
            return false;
        }

        if (skillDef.tier === 1) {
            return true; // Tier 1 skills are always unlocked by default (or when the tab is unlocked)
        }

        const condition = skillDef.unlockCondition;
        if (!condition) {
            return true; // No specific condition, assume unlocked if not tier 1
        }

        switch (condition.type) {
            case "allSkillsAtLevel":
                const targetTier = condition.tier;
                const requiredLevel = condition.level;
                for (const otherSkillId in staticModuleData.skills) {
                    const otherSkillDef = staticModuleData.skills[otherSkillId];
                    if (otherSkillDef.tier === targetTier) {
                        if ((moduleState.skillLevels[otherSkillId] || 0) < requiredLevel) {
                            return false; // Not all skills in the target tier are at the required level
                        }
                    }
                }
                return true; // All skills in the target tier are at or above the required level
            default:
                loggingSystem.warn("SkillsLogic", `Unknown unlock condition type for skill ${skillId}: ${condition.type}`);
                return false;
        }
    },

    /**
     * Checks for and applies any new tier unlocks.
     */
    checkTierUnlocks() {
        const { coreUIManager, loggingSystem } = coreSystemsRef;
        // Iterate through all skills to find tiers and check their unlock conditions
        const tiers = new Set(Object.values(staticModuleData.skills).map(s => s.tier));
        tiers.forEach(tier => {
            // Skip Tier 1 as it's always available
            if (tier === 1) return;

            // Find a skill in this tier to check its unlock condition (assuming all skills in a tier have the same condition)
            const skillInTier = Object.values(staticModuleData.skills).find(s => s.tier === tier);
            if (skillInTier && skillInTier.unlockCondition) {
                const condition = skillInTier.unlockCondition;
                let tierUnlocked = false;

                switch (condition.type) {
                    case "allSkillsAtLevel":
                        const targetTier = condition.tier;
                        const requiredLevel = condition.level;
                        let allPreviousTierSkillsMet = true;
                        for (const previousSkillId in staticModuleData.skills) {
                            const previousSkillDef = staticModuleData.skills[previousSkillId];
                            if (previousSkillDef.tier === targetTier) {
                                if ((moduleState.skillLevels[previousSkillId] || 0) < requiredLevel) {
                                    allPreviousTierSkillsMet = false;
                                    break;
                                }
                            }
                        }
                        tierUnlocked = allPreviousTierSkillsMet;
                        break;
                    default:
                        loggingSystem.warn("SkillsLogic", `Unhandled tier unlock condition type: ${condition.type}`);
                        break;
                }

                if (tierUnlocked && !coreGameStateManager.getGlobalFlag(`skillsTier${tier}Unlocked`)) {
                    coreGameStateManager.setGlobalFlag(`skillsTier${tier}Unlocked`, true);
                    coreUIManager.showNotification(`New Skill Tier ${tier} Unlocked!`, 'info', 3000);
                    coreUIManager.renderMenu(); // Re-render menu if new skills tab is unlocked
                }
            }
        });
    },

    /**
     * Gets the current level of a skill.
     * @param {string} skillId - The ID of the skill.
     * @returns {number} The current level.
     */
    getSkillLevel(skillId) {
        return moduleState.skillLevels[skillId] || 0;
    },

    /**
     * Checks if the Skills tab itself should be unlocked.
     * @returns {boolean}
     */
    isSkillsTabUnlocked() {
        const { coreResourceManager, decimalUtility } = coreSystemsRef;
        const condition = staticModuleData.ui.skillsTabUnlockCondition;

        if (!condition) {
            return false; // Must have a condition
        }

        switch (condition.type) {
            case "resource":
                const currentResourceAmount = coreResourceManager.getAmount(condition.resourceId);
                const requiredResourceAmount = decimalUtility.new(condition.amount);
                return decimalUtility.gte(currentResourceAmount, requiredResourceAmount);
            default:
                return false;
        }
    },

    /**
     * Lifecycle method called when the game loads.
     * Ensures all skill effects are correctly applied based on loaded state.
     */
    onGameLoad() {
        coreSystemsRef.loggingSystem.info("SkillsLogic", "onGameLoad: Applying all skill effects.");
        this.applyAllSkillEffects();
        this.checkTierUnlocks(); // Re-check tier unlocks on load
    },

    /**
     * Lifecycle method called when the game resets.
     * Resets module-specific state and removes effects.
     */
    onResetState() {
        coreSystemsRef.loggingSystem.info("SkillsLogic", "onResetState: Resetting Skills module logic state and removing effects.");
        // The moduleState will be re-initialized by the manifest, clearing skillLevels.
        // We need to explicitly remove effects from CoreUpgradeManager.
        for (const skillId in staticModuleData.skills) {
            const skillDef = staticModuleData.skills[skillId];
            if (skillDef.effect) {
                const sourceId = `skills_module_${skillId}`;
                coreSystemsRef.coreUpgradeManager.removeEffect(skillDef.effect.targetType, skillDef.effect.type, skillDef.effect.targetId, sourceId);
            }
        }
        this.applyAllSkillEffects(); // Re-apply (which will be level 0, so no effects)
    }
};
