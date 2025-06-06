// modules/skills_module/skills_logic.js (v1.5 - Fix registerEffectSource parameters)

/**
 * @file skills_logic.js
 * @description Business logic for the Skills module.
 * v1.5: Adds validation for effectDef.targetSystem and effectDef.type before registering effects.
 * v1.4: Integrates logic for Prestige Skills, handling two distinct skill trees and currencies.
 * v1.3: Ensures 'skillsTabPermanentlyUnlocked' flag is cleared on reset.
 */

import { staticModuleData } from './skills_data.js';
import { moduleState } from './skills_state.js';

let coreSystemsRef = null;

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("SkillsLogic", "Logic initialized (v1.5).");
        this.registerAllSkillEffects(); 
    },

    isSkillsTabUnlocked() {
        if (!coreSystemsRef || !coreSystemsRef.coreResourceManager || !coreSystemsRef.decimalUtility || !coreSystemsRef.coreGameStateManager) {
            console.error("SkillsLogic_isSkillsTabUnlocked_CRITICAL: Core systems missing!", coreSystemsRef);
            return true; 
        }
        const { coreResourceManager, decimalUtility, coreGameStateManager, coreUIManager } = coreSystemsRef;
        if (coreGameStateManager.getGlobalFlag('skillsTabPermanentlyUnlocked', false)) {
            return true;
        }
        const conditionMet = decimalUtility.gte(coreResourceManager.getAmount(staticModuleData.skillPointResourceId), 1);
        if (conditionMet) {
            coreGameStateManager.setGlobalFlag('skillsTabPermanentlyUnlocked', true);
            if(coreUIManager) coreUIManager.renderMenu(); 
            coreSystemsRef.loggingSystem.info("SkillsLogic", "Skills tab permanently unlocked.");
            return true;
        }
        return false;
    },

    /**
     * Gets the current level of a skill.
     * @param {string} skillId - The ID of the skill.
     * @param {boolean} [isPrestige=false] - True if it's a prestige skill.
     * @returns {number} The current level of the skill.
     */
    getSkillLevel(skillId, isPrestige = false) {
        if (isPrestige) {
            return moduleState.prestigeSkillLevels[skillId] || 0;
        }
        return moduleState.skillLevels[skillId] || 0;
    },

    /**
     * Gets the maximum level of a skill.
     * @param {string} skillId - The ID of the skill.
     * @param {boolean} [isPrestige=false] - True if it's a prestige skill.
     * @returns {number} The maximum level of the skill.
     */
    getSkillMaxLevel(skillId, isPrestige = false) {
        const skillsCollection = isPrestige ? staticModuleData.prestigeSkills : staticModuleData.skills;
        const skillDef = skillsCollection[skillId];
        return skillDef ? skillDef.maxLevel : 0;
    },

    /**
     * Checks if a regular skill tier is unlocked.
     * @param {number} tierNum - The tier number.
     * @returns {boolean} True if the tier is unlocked.
     */
    isTierUnlocked(tierNum) {
        if (tierNum <= 1) return true; 
        const prevTier = tierNum - 1;
        const skillsInPrevTier = Object.values(staticModuleData.skills).filter(s => s.tier === prevTier);
        if (skillsInPrevTier.length === 0 && prevTier > 0) { 
            return true; // If a previous tier has no skills defined, consider it unlocked if it's not tier 0
        }
        // A tier is unlocked if at least one level of every skill in the previous tier has been purchased.
        return skillsInPrevTier.every(s => this.getSkillLevel(s.id, false) >= 1);
    },

    /**
     * Checks if a prestige skill tier is unlocked.
     * @param {number} tierNum - The tier number.
     * @returns {boolean} True if the prestige tier is unlocked.
     */
    isPrestigeTierUnlocked(tierNum) {
        if (tierNum <= 1) return true; // Tier 1 is always unlocked for prestige skills
        const prevTier = tierNum - 1;
        const skillsInPrevTier = Object.values(staticModuleData.prestigeSkills).filter(s => s.tier === prevTier);
        if (skillsInPrevTier.length === 0 && prevTier > 0) { 
            return true; 
        }
        // A prestige tier is unlocked if at least one level of every skill in the previous prestige tier has been purchased.
        return skillsInPrevTier.every(s => this.getSkillLevel(s.id, true) >= 1);
    },

    /**
     * Checks if a skill is unlocked based on its conditions.
     * @param {string} skillId - The ID of the skill.
     * @param {boolean} [isPrestige=false] - True if it's a prestige skill.
     * @returns {boolean} True if the skill is unlocked.
     */
    isSkillUnlocked(skillId, isPrestige = false) {
        const skillsCollection = isPrestige ? staticModuleData.prestigeSkills : staticModuleData.skills;
        const skillDef = skillsCollection[skillId];
        if (!skillDef) return false;
        if (!skillDef.unlockCondition) return true; 

        const { type, skillId: requiredSkillId, level: requiredLevel, tier: requiredTierNum } = skillDef.unlockCondition;

        switch (type) {
            case "skillLevel":
                // Check if a specific skill (either regular or prestige) has reached a certain level.
                // We assume requiredSkillId implicitly refers to the same type (prestige/regular) as the current skill.
                const requiredSkillCollection = skillsCollection; // Use current collection for required skill lookup
                const requiredSkillDef = requiredSkillCollection[requiredSkillId];
                if (!requiredSkillDef) {
                    coreSystemsRef.loggingSystem.warn("SkillsLogic", `Required skill ${requiredSkillId} for ${skillId} not found in its collection.`);
                    return false;
                }
                return this.getSkillLevel(requiredSkillId, isPrestige) >= requiredLevel;
            case "allSkillsInTierLevel": 
                // Check if all skills in a specific tier (either regular or prestige) have reached a certain level.
                const skillsInRequiredTier = Object.values(skillsCollection).filter(s => s.tier === requiredTierNum);
                if (skillsInRequiredTier.length === 0) return true; 
                return skillsInRequiredTier.every(s => this.getSkillLevel(s.id, isPrestige) >= requiredLevel);
            default:
                coreSystemsRef.loggingSystem.warn("SkillsLogic", `Unknown skill unlock condition type: ${type} for skill ${skillId}`);
                return false;
        }
    },

    /**
     * Calculates the cost to level up a skill to its next level.
     * @param {string} skillId - The ID of the skill.
     * @param {boolean} [isPrestige=false] - True if it's a prestige skill.
     * @returns {Decimal|null} The cost as a Decimal, or null if at max level.
     */
    getSkillNextLevelCost(skillId, isPrestige = false) {
        const { decimalUtility } = coreSystemsRef;
        const skillsCollection = isPrestige ? staticModuleData.prestigeSkills : staticModuleData.skills;
        const skillDef = skillsCollection[skillId];
        const currentLevel = this.getSkillLevel(skillId, isPrestige);

        if (!skillDef || currentLevel >= skillDef.maxLevel) {
            return null;
        }
        // Access the cost array based on the current level
        return decimalUtility.new(skillDef.costPerLevel[currentLevel]);
    },

    /**
     * Attempts to purchase the next level of a skill.
     * @param {string} skillId - The ID of the skill.
     * @param {boolean} [isPrestige=false] - True if it's a prestige skill.
     * @returns {boolean} True if the purchase was successful, false otherwise.
     */
    purchaseSkillLevel(skillId, isPrestige = false) {
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager, coreUIManager } = coreSystemsRef;
        const skillsCollection = isPrestige ? staticModuleData.prestigeSkills : staticModuleData.skills;
        const skillDef = skillsCollection[skillId];

        if (!skillDef) {
            loggingSystem.error("SkillsLogic", `Attempted to purchase unknown skill: ${skillId}`);
            return false;
        }

        if (!this.isSkillUnlocked(skillId, isPrestige)) {
            loggingSystem.debug("SkillsLogic", `Skill ${skillId} is locked.`);
            coreUIManager.showNotification("This skill is currently locked.", "warning");
            return false;
        }

        const currentLevel = this.getSkillLevel(skillId, isPrestige);
        if (currentLevel >= skillDef.maxLevel) {
            loggingSystem.debug("SkillsLogic", `Skill ${skillId} is already at max level.`);
            coreUIManager.showNotification(`${skillDef.name} is at max level.`, "info");
            return false;
        }

        const cost = this.getSkillNextLevelCost(skillId, isPrestige);
        if (cost === null) return false; // Already at max level, getSkillNextLevelCost returned null

        const resourceId = isPrestige ? staticModuleData.prestigeSkillPointResourceId : staticModuleData.skillPointResourceId;

        if (coreResourceManager.canAfford(resourceId, cost)) {
            coreResourceManager.spendAmount(resourceId, cost);
            
            if (isPrestige) {
                moduleState.prestigeSkillLevels[skillId] = currentLevel + 1;
            } else {
                moduleState.skillLevels[skillId] = currentLevel + 1;
            }
            coreGameStateManager.setModuleState('skills', { ...moduleState });
            
            loggingSystem.info("SkillsLogic", `Purchased level ${this.getSkillLevel(skillId, isPrestige)} of ${isPrestige ? 'prestige skill' : 'skill'} ${skillId} (${skillDef.name}).`);
            coreUIManager.showNotification(`${skillDef.name} leveled up to ${this.getSkillLevel(skillId, isPrestige)}!`, 'success');
            
            this.isSkillsTabUnlocked(); // Re-check if main skills tab is unlocked

            // Re-register effects after a skill level changes
            this.registerAllSkillEffects(); 

            // Force a re-render of the skills UI if active, to update all card states
            if (coreUIManager.isActiveTab('skills')) { 
                const skillsUI = coreSystemsRef.moduleLoader.getModule('skills')?.ui;
                if (skillsUI) skillsUI.renderMainContent(document.getElementById('main-content'));
            }
            return true;
        } else {
            const currency = isPrestige ? 'Prestige Skill Points' : 'Study Skill Points';
            loggingSystem.debug("SkillsLogic", `Cannot afford skill ${skillId}. Need ${decimalUtility.format(cost, 0)} ${currency}.`);
            coreUIManager.showNotification(`Not enough ${currency} for ${skillDef.name}.`, 'error');
            return false;
        }
    },

    registerAllSkillEffects() {
        const { coreUpgradeManager, loggingSystem, decimalUtility } = coreSystemsRef;
        if (!coreUpgradeManager) {
            loggingSystem.error("SkillsLogic", "CoreUpgradeManager not available for registering skill effects.");
            return;
        }

        // Helper function to process and register effects for a given skill type
        const processSkills = (skillsCollection, isPrestigeFlag) => {
            for (const skillId in skillsCollection) {
                const skillDef = skillsCollection[skillId];
                const processEffect = (effectDef) => {
                    // Check if effectDef is valid before proceeding
                    if (!effectDef) {
                        loggingSystem.warn("SkillsLogic", `Skipping effect registration for skill ${skillId}: effectDef is null or undefined.`);
                        return;
                    }
                    if (!effectDef.targetSystem || !effectDef.type || typeof effectDef.targetSystem !== 'string' || typeof effectDef.type !== 'string') {
                         loggingSystem.error("SkillsLogic", `Invalid targetSystem or type for skill ${skillId} effect. targetSystem: ${effectDef.targetSystem}, type: ${effectDef.type}`);
                         return;
                    }

                    const valueProvider = () => {
                        const level = this.getSkillLevel(skillId, isPrestigeFlag);
                        if (level === 0) { 
                            return effectDef.type.includes("MULTIPLIER") ? decimalUtility.new(1) : decimalUtility.new(0);
                        }
                        const baseValuePerLevel = decimalUtility.new(effectDef.valuePerLevel);
                        let effectValue = decimalUtility.multiply(baseValuePerLevel, level);

                        if (effectDef.type.includes("MULTIPLIER")) {
                            if (effectDef.aggregation === "ADDITIVE_TO_BASE_FOR_MULTIPLIER") {
                                return decimalUtility.add(1, effectValue); 
                            } else if (effectDef.aggregation === "SUBTRACTIVE_FROM_BASE_FOR_MULTIPLIER") {
                                return decimalUtility.subtract(1, effectValue); 
                            }
                            return effectValue; 
                        }
                        return effectValue; 
                    };

                    coreUpgradeManager.registerEffectSource(
                        'skills', // Module ID remains 'skills' as both are handled by this module
                        `${isPrestigeFlag ? 'prestige_' : ''}${skillId}${effectDef.targetId ? `_${effectDef.targetId}` : ''}`, // Unique source key
                        effectDef.targetSystem,
                        effectDef.targetId,
                        effectDef.type,
                        valueProvider
                    );
                };
                
                if (skillDef.effect) { 
                    processEffect(skillDef.effect);
                } else if (skillDef.effects && Array.isArray(skillDef.effects)) { 
                    skillDef.effects.forEach(processEffect);
                }
            }
        };

        // Register effects for regular skills
        processSkills(staticModuleData.skills, false);
        // Register effects for prestige skills
        processSkills(staticModuleData.prestigeSkills, true);

        loggingSystem.info("SkillsLogic", "All regular and prestige skill effects registered with CoreUpgradeManager.");
    },

    /**
     * Gets the formatted effect description for a skill at its current level.
     * @param {string} skillId - The ID of the skill.
     * @param {boolean} [isPrestige=false] - True if it's a prestige skill.
     * @param {object} [specificEffectDef=null] - Optional: A specific effect definition to format if multiple effects.
     * @returns {string} The formatted effect string.
     */
    getFormattedSkillEffect(skillId, isPrestige = false, specificEffectDef = null) {
        const { decimalUtility } = coreSystemsRef;
        const skillsCollection = isPrestige ? staticModuleData.prestigeSkills : staticModuleData.skills;
        const skillDef = skillsCollection[skillId];
        const effectDef = specificEffectDef || skillDef.effect || (skillDef.effects ? skillDef.effects[0] : null); 

        if (!skillDef || !effectDef) return "N/A";

        const level = this.getSkillLevel(skillId, isPrestige); // Pass isPrestige
        if (level === 0 && !specificEffectDef) return "Not active"; 

        const baseValuePerLevel = decimalUtility.new(effectDef.valuePerLevel);
        let currentEffectValue = decimalUtility.multiply(baseValuePerLevel, level);
        let effectText = "";

        switch (effectDef.type) {
            case "MULTIPLIER":
                // If it's an additive multiplier (e.g., +20% -> 1.2x), display as percentage
                if (effectDef.aggregation === "ADDITIVE_TO_BASE_FOR_MULTIPLIER" || effectDef.aggregation === "SUBTRACTIVE_FROM_BASE_FOR_MULTIPLIER") {
                     effectText = `${effectDef.aggregation === "ADDITIVE_TO_BASE_FOR_MULTIPLIER" ? '+' : '-'}${decimalUtility.format(decimalUtility.multiply(currentEffectValue, 100), 0)}%`;
                } else {
                    // For direct multipliers, just show the value as is.
                    effectText = `${decimalUtility.format(currentEffectValue, 2)}x`;
                }
                break;
            case "COST_REDUCTION_MULTIPLIER":
                effectText = `-${decimalUtility.format(decimalUtility.multiply(currentEffectValue, 100), 0)}% Cost`;
                break;
            case "ADDITIVE_BONUS":
                effectText = `+${decimalUtility.format(currentEffectValue, 2)}`;
                break;
            default:
                effectText = decimalUtility.format(currentEffectValue, 2);
        }
        return effectText;
    },

    onGameLoad() {
        coreSystemsRef.loggingSystem.info("SkillsLogic", "onGameLoad triggered for Skills module (v1.4).");
        this.registerAllSkillEffects(); 
        this.isSkillsTabUnlocked(); 
    },

    onResetState() {
        coreSystemsRef.loggingSystem.info("SkillsLogic", "onResetState triggered for Skills module (v1.4).");
        this.registerAllSkillEffects(); // Re-register to effectively reset (as levels will be 0)
        if (coreSystemsRef.coreGameStateManager) { 
            coreSystemsRef.coreGameStateManager.setGlobalFlag('skillsTabPermanentlyUnlocked', false);
            coreSystemsRef.loggingSystem.info("SkillsLogic", "'skillsTabPermanentlyUnlocked' flag cleared.");
        }
    }
};
