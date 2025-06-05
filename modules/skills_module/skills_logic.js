// modules/skills_module/skills_logic.js (v1)

/**
 * @file skills_logic.js
 * @description Business logic for the Skills module.
 * Handles purchasing skills, checking unlock conditions, and managing skill effects.
 */

import { staticModuleData } from './skills_data.js';
import { moduleState } from './skills_state.js';

let coreSystemsRef = null;

export const moduleLogic = {
    /**
     * Initializes the logic component.
     * @param {object} coreSystems - References to core game systems.
     */
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("SkillsLogic", "Logic initialized (v1).");
        this.registerAllSkillEffects(); // Register effects on initialization/load
    },

    /**
     * Checks if the Skills tab itself should be unlocked.
     * Example: Unlocked when the player has at least 1 Study Skill Point.
     * @returns {boolean}
     */
    isSkillsTabUnlocked() {
        if (!coreSystemsRef) return false;
        const { coreResourceManager, decimalUtility } = coreSystemsRef;
        return decimalUtility.gte(coreResourceManager.getAmount(staticModuleData.skillPointResourceId), 1);
    },

    /**
     * Gets the current level of a skill.
     * @param {string} skillId
     * @returns {number} Current level (0 if not purchased).
     */
    getSkillLevel(skillId) {
        return moduleState.skillLevels[skillId] || 0;
    },

    /**
     * Checks if a skill is unlocked.
     * @param {string} skillId
     * @returns {boolean}
     */
    isSkillUnlocked(skillId) {
        const skillDef = staticModuleData.skills[skillId];
        if (!skillDef) return false;
        if (!skillDef.unlockCondition) return true; // No condition means unlocked

        const { type, skillId: requiredSkillId, level: requiredLevel, tier: requiredTier } = skillDef.unlockCondition;

        switch (type) {
            case "skillLevel":
                return this.getSkillLevel(requiredSkillId) >= requiredLevel;
            case "allSkillsInTierLevel":
                const skillsInTier = Object.values(staticModuleData.skills).filter(s => s.tier === requiredTier);
                return skillsInTier.every(s => this.getSkillLevel(s.id) >= requiredLevel);
            default:
                coreSystemsRef.loggingSystem.warn("SkillsLogic", `Unknown skill unlock condition type: ${type} for skill ${skillId}`);
                return false;
        }
    },

    /**
     * Calculates the cost for the next level of a skill.
     * @param {string} skillId
     * @returns {Decimal | null} Cost as Decimal, or null if max level reached or skill doesn't exist.
     */
    getSkillNextLevelCost(skillId) {
        const { decimalUtility } = coreSystemsRef;
        const skillDef = staticModuleData.skills[skillId];
        const currentLevel = this.getSkillLevel(skillId);

        if (!skillDef || currentLevel >= skillDef.maxLevel) {
            return null;
        }
        return decimalUtility.new(skillDef.costPerLevel[currentLevel]); // costPerLevel is 0-indexed for next level
    },

    /**
     * Purchases or levels up a skill.
     * @param {string} skillId
     * @returns {boolean} True if purchase was successful, false otherwise.
     */
    purchaseSkillLevel(skillId) {
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager, coreUIManager } = coreSystemsRef;
        const skillDef = staticModuleData.skills[skillId];

        if (!skillDef) {
            loggingSystem.error("SkillsLogic", `Attempted to purchase unknown skill: ${skillId}`);
            return false;
        }

        if (!this.isSkillUnlocked(skillId)) {
            loggingSystem.debug("SkillsLogic", `Skill ${skillId} is locked.`);
            coreUIManager.showNotification("This skill is currently locked.", "warning");
            return false;
        }

        const currentLevel = this.getSkillLevel(skillId);
        if (currentLevel >= skillDef.maxLevel) {
            loggingSystem.debug("SkillsLogic", `Skill ${skillId} is already at max level.`);
            coreUIManager.showNotification(`${skillDef.name} is at max level.`, "info");
            return false;
        }

        const cost = this.getSkillNextLevelCost(skillId);
        if (!cost) return false; // Should not happen if previous checks passed

        if (coreResourceManager.canAfford(staticModuleData.skillPointResourceId, cost)) {
            coreResourceManager.spendAmount(staticModuleData.skillPointResourceId, cost);
            moduleState.skillLevels[skillId] = currentLevel + 1;
            coreGameStateManager.setModuleState('skills', { ...moduleState });

            // Effect is automatically updated by valueProvider due to change in moduleState.skillLevels
            // No need to re-register, just make sure relevant systems re-query CoreUpgradeManager.
            // Studies module logic will query CoreUpgradeManager each tick or when costs are calculated.

            loggingSystem.info("SkillsLogic", `Purchased level ${moduleState.skillLevels[skillId]} of skill ${skillId} (${skillDef.name}).`);
            coreUIManager.showNotification(`${skillDef.name} leveled up to ${moduleState.skillLevels[skillId]}!`, 'success');

            // Check if this unlocks other skills or UI elements
            coreUIManager.renderMenu(); // Re-render menu in case Skills tab becomes unlocked now
            if (coreUIManager.isActiveTab('skills')) { // If skills tab is active, refresh its content
                const skillsUI = coreSystemsRef.moduleLoader.getModule('skills')?.ui;
                if (skillsUI) skillsUI.renderMainContent(document.getElementById('main-content'));
            }

            return true;
        } else {
            loggingSystem.debug("SkillsLogic", `Cannot afford skill ${skillId}. Need ${decimalUtility.format(cost, 0)} ${staticModuleData.skillPointResourceId}.`);
            coreUIManager.showNotification(`Not enough Study Skill Points for ${skillDef.name}.`, 'error');
            return false;
        }
    },

    /**
     * Registers all skill effects with the CoreUpgradeManager.
     * Called on initialize and game load.
     */
    registerAllSkillEffects() {
        const { coreUpgradeManager, loggingSystem, decimalUtility } = coreSystemsRef;
        if (!coreUpgradeManager) {
            loggingSystem.error("SkillsLogic", "CoreUpgradeManager not available for registering skill effects.");
            return;
        }

        for (const skillId in staticModuleData.skills) {
            const skillDef = staticModuleData.skills[skillId];

            const processEffect = (effectDef) => {
                if (!effectDef) return;
                // valueProvider captures skillId and effectDef in its closure
                const valueProvider = () => {
                    const level = this.getSkillLevel(skillId);
                    if (level === 0) { // Skill not purchased or level 0
                        return effectDef.type.includes("MULTIPLIER") ? decimalUtility.new(1) : decimalUtility.new(0);
                    }
                    const baseValuePerLevel = decimalUtility.new(effectDef.valuePerLevel);
                    let effectValue = decimalUtility.multiply(baseValuePerLevel, level);

                    if (effectDef.type.includes("MULTIPLIER")) {
                        if (effectDef.aggregation === "ADDITIVE_TO_BASE_FOR_MULTIPLIER") {
                            return decimalUtility.add(1, effectValue); // e.g., 1 + (level * 0.10)
                        } else if (effectDef.aggregation === "SUBTRACTIVE_FROM_BASE_FOR_MULTIPLIER") {
                            return decimalUtility.subtract(1, effectValue); // e.g., 1 - (level * 0.05) for cost reduction
                        }
                        // Potentially other aggregation types for multipliers if needed
                        return effectValue; // Should usually be 1 + bonus or 1 - reduction for multipliers
                    }
                    return effectValue; // For additive bonuses
                };

                coreUpgradeManager.registerEffectSource(
                    'skills', // moduleId
                    skillId + (effectDef.targetId ? `_${effectDef.targetId}` : ''), // sourceKey (make unique if one skill has multiple effects)
                    effectDef.targetSystem,
                    effectDef.targetId,
                    effectDef.type,
                    valueProvider
                );
            };
            
            if (skillDef.effect) { // Single effect
                processEffect(skillDef.effect);
            } else if (skillDef.effects && Array.isArray(skillDef.effects)) { // Multiple effects
                skillDef.effects.forEach(processEffect);
            }
        }
        loggingSystem.info("SkillsLogic", "All skill effects registered with CoreUpgradeManager.");
    },

    /**
     * Gets the current effect value of a skill for display purposes.
     * @param {string} skillId
     * @param {object} [specificEffectDef] - Optional: if a skill has multiple effects, specify which one.
     * @returns {string} Formatted effect string.
     */
    getFormattedSkillEffect(skillId, specificEffectDef = null) {
        const { decimalUtility } = coreSystemsRef;
        const skillDef = staticModuleData.skills[skillId];
        const effectDef = specificEffectDef || skillDef.effect || (skillDef.effects ? skillDef.effects[0] : null); // Default to first effect if multiple

        if (!skillDef || !effectDef) return "N/A";

        const level = this.getSkillLevel(skillId);
        if (level === 0 && !specificEffectDef) return "Not active"; // For main display if level 0

        const baseValuePerLevel = decimalUtility.new(effectDef.valuePerLevel);
        let currentEffectValue = decimalUtility.multiply(baseValuePerLevel, level);
        let effectText = "";

        switch (effectDef.type) {
            case "MULTIPLIER":
                // For display, usually show the percentage bonus
                effectText = `+${decimalUtility.format(decimalUtility.multiply(currentEffectValue, 100), 0)}%`;
                break;
            case "COST_REDUCTION_MULTIPLIER":
                effectText = `-${decimalUtility.format(decimalUtility.multiply(currentEffectValue, 100), 0)}% Cost`;
                break;
            // Add other types as needed
            default:
                effectText = decimalUtility.format(currentEffectValue, 2);
        }
        return effectText;
    },

    /**
     * Lifecycle method called when the game loads.
     */
    onGameLoad() {
        coreSystemsRef.loggingSystem.info("SkillsLogic", "onGameLoad triggered for Skills module.");
        // Ensure skill levels from loaded state are correct. The manifest handles loading state into moduleState.
        this.registerAllSkillEffects(); // Re-register effects in case of dynamic changes or ensuring registration
    },

    /**
     * Lifecycle method called when the game resets.
     */
    onResetState() {
        coreSystemsRef.loggingSystem.info("SkillsLogic", "onResetState triggered for Skills module.");
        // Module state (skillLevels) will be reset by the manifest.
        // Effects might need to be re-evaluated if they depend on state that isn't simply level 0.
        // For now, assuming registerAllSkillEffects on init/load is sufficient.
        this.registerAllSkillEffects();
    }
};
