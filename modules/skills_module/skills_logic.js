// modules/skills_module/skills_logic.js (v1.9 - Fixed Syntax Error in Notification)

/**
 * @file skills_logic.js
 * @description Business logic for the Skills module.
 * v1.9: Fixed syntax error in purchase success notification.
 * v1.8: Ensures prestige skill costs use 'prestigeSkillPoints' from staticData.
 * v1.7: Adds onPrestigeReset logic. Fixes tier unlock logic. Restores full file content.
 * v1.6: Filters skill effects before registering with CoreUpgradeManager.
 * v1.5: Adds validation for effectDef.targetSystem and effectDef.type before registering effects.
 * v1.4: Integrates logic for Prestige Skills, handling two distinct skill trees and currencies.
 * v1.3: Ensures 'skillsTabPermanentlyUnlocked' flag is cleared on reset.
 */

import { staticModuleData } from './skills_data.js';
import { moduleState } from './skills_state.js';

let coreSystemsRef = null;

// Define effect types that can be registered with CoreUpgradeManager
const REGISTERABLE_EFFECT_TYPES = [
    "MULTIPLIER",
    "ADDITIVE_BONUS",
    "PERCENTAGE_BONUS",
    "COST_REDUCTION_MULTIPLIER"
];

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("SkillsLogic", "Logic initialized (v1.9).");
        this.registerAllSkillEffects(); 
        // Register the update callback for special effects that need continuous evaluation
        coreSystemsRef.gameLoop.registerUpdateCallback('generalLogic', (deltaTime) => {
            this.applySpecialSkillEffects(deltaTime);
        });
    },

    isSkillsTabUnlocked() {
        if (!coreSystemsRef || !coreSystemsRef.coreResourceManager || !coreSystemsRef.decimalUtility || !coreSystemsRef.coreGameStateManager) {
            coreSystemsRef.loggingSystem.error("SkillsLogic_isSkillsTabUnlocked_CRITICAL: Core systems missing!", coreSystemsRef);
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
        // Ensure moduleState properties are initialized as objects before accessing
        if (isPrestige) {
            return moduleState.prestigeSkillLevels?.[skillId] || 0;
        }
        return moduleState.skillLevels?.[skillId] || 0;
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
     * Checks if a skill tier is unlocked.
     * @param {number} tierNum - The tier number.
     * @param {boolean} isPrestige - Whether to check the prestige skill tree.
     * @returns {boolean} True if the tier is unlocked.
     */
    isTierUnlocked(tierNum, isPrestige = false) {
        if (tierNum <= 1) return true; 
        const prevTier = tierNum - 1;
        const skillsCollection = isPrestige ? staticModuleData.prestigeSkills : staticModuleData.skills;
        const skillsInPrevTier = Object.values(skillsCollection).filter(s => s.tier === prevTier);
        if (skillsInPrevTier.length === 0 && prevTier > 0) { 
            return true;
        }
        return skillsInPrevTier.every(s => this.getSkillLevel(s.id, isPrestige) >= 1);
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

        // --- FIX: The primary check is whether the tier itself is unlocked ---
        if (!this.isTierUnlocked(skillDef.tier, isPrestige)) {
            return false;
        }
        
        // If the tier is unlocked and there's no further condition, the skill is available.
        if (!skillDef.unlockCondition) return true; 

        const { type, skillId: requiredSkillId, level: requiredLevel, tier: requiredTierNum } = skillDef.unlockCondition;

        switch (type) {
            case "skillLevel":
                // This condition checks for a skill level within the SAME tree.
                return this.getSkillLevel(requiredSkillId, isPrestige) >= requiredLevel;

            case "allSkillsInTierLevel":
                 // This condition also checks within the SAME tree.
                const skillsInTier = Object.values(skillsCollection).filter(s => s.tier === requiredTierNum);
                if (skillsInTier.length === 0) return true; 
                return skillsInTier.every(s => this.getSkillLevel(s.id, isPrestige) >= requiredLevel);

            case "prestigeSkillLevel": 
                // This condition is for a REGULAR skill that depends on a PRESTIGE skill.
                // It should only be found on non-prestige skills.
                const prestigeSkillsCollection = staticModuleData.prestigeSkills;
                if (!prestigeSkillsCollection[requiredSkillId]) {
                     coreSystemsRef.loggingSystem.warn("SkillsLogic", `Required prestige skill ${requiredSkillId} for ${skillId} not found.`);
                    return false;
                }
                return this.getSkillLevel(requiredSkillId, true) >= requiredLevel;

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
        if (cost === null) return false;

        // The resourceId is now correctly fetched from staticModuleData based on isPrestige
        const resourceId = isPrestige ? staticModuleData.prestigeSkillPointResourceId : staticModuleData.skillPointResourceId;

        if (coreResourceManager.canAfford(resourceId, cost)) {
            coreResourceManager.spendAmount(resourceId, cost);
            
            if (isPrestige) {
                if (!moduleState.prestigeSkillLevels) {
                    moduleState.prestigeSkillLevels = {};
                }
                moduleState.prestigeSkillLevels[skillId] = currentLevel + 1;
            } else {
                moduleState.skillLevels[skillId] = currentLevel + 1;
            }
            coreGameStateManager.setModuleState('skills', { ...moduleState });
            
            loggingSystem.info("SkillsLogic", `Purchased level ${this.getSkillLevel(skillId, isPrestige)} of ${isPrestige ? 'prestige skill' : 'skill'} ${skillId} (${skillDef.name}).`);
            coreUIManager.showNotification(`${skillDef.name} leveled up to ${this.getSkillLevel(skillId, isPrestige)}!`, 'success');
            
            this.isSkillsTabUnlocked();

            this.registerAllSkillEffects(); 

            if (coreUIManager.isActiveTab('skills')) { 
                const skillsUI = coreSystemsRef.moduleLoader.getModule('skills')?.ui;
                if (skillsUI) skillsUI.renderMainContent(document.getElementById('main-content'));
            }
            return true;
        } else {
            // The currency displayed here should match the resourceId
            const currency = isPrestige ? staticModuleData.ui.prestigeSkillPointDisplayLabel.replace(' Available:', '') : staticModuleData.ui.skillPointDisplayLabel.replace(' Available:', '');
            loggingSystem.debug("SkillsLogic", `Cannot afford skill ${skillId}. Have: ${coreResourceManager.getAmount(resourceId).toString()}. Need: ${decimalUtility.format(cost, 0)} ${currency}.`);
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

        const processSkills = (skillsCollection, isPrestigeFlag) => {
            for (const skillId in skillsCollection) {
                const skillDef = skillsCollection[skillId];
                const processEffect = (effectDef) => {
                    if (!effectDef) {
                        return;
                    }
                    if (!REGISTERABLE_EFFECT_TYPES.includes(effectDef.type)) {
                        return;
                    }
                    if (!effectDef.targetSystem || !effectDef.type || typeof effectDef.targetSystem !== 'string' || typeof effectDef.type !== 'string') {
                         loggingSystem.error("SkillsLogic", `Invalid targetSystem or type for skill ${skillId} effect.`);
                         return;
                    }

                    const valueProvider = () => {
                        const level = this.getSkillLevel(skillId, isPrestigeFlag);
                        if (level === 0) { 
                            return effectDef.type.includes("MULTIPLIER") ? decimalUtility.new(1) : decimalUtility.new(0);
                        }
                        if (effectDef.valuePerLevel === undefined || effectDef.valuePerLevel === null) {
                            loggingSystem.warn("SkillsLogic", `Missing valuePerLevel for registerable effect type ${effectDef.type} on skill ${skillId}.`);
                            return decimalUtility.new(effectDef.type.includes("MULTIPLIER") ? 1 : 0);
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

                    coreUpgradeManager.registerEffectSource('skills', `${isPrestigeFlag ? 'prestige_' : ''}${skillId}${effectDef.targetId ? `_${effectDef.targetId}` : ''}`, effectDef.targetSystem, effectDef.targetId, effectDef.type, valueProvider);
                };
                
                if (skillDef.effect) { 
                    processEffect(skillDef.effect);
                } else if (skillDef.effects && Array.isArray(skillDef.effects)) { 
                    skillDef.effects.forEach(processEffect);
                }
            }
        };

        processSkills(staticModuleData.skills, false);
        processSkills(staticModuleData.prestigeSkills, true);

        loggingSystem.info("SkillsLogic", "All regular and prestige skill effects registered/updated.");
    },

    applySpecialSkillEffects(deltaTimeSeconds) {
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager, moduleLoader, coreUpgradeManager } = coreSystemsRef;

        const processSpecialSkills = (skillsCollection, isPrestigeFlag) => {
            for (const skillId in skillsCollection) {
                const skillDef = skillsCollection[skillId];
                const level = this.getSkillLevel(skillId, isPrestigeFlag);
                if (level === 0) continue;

                const effectsToProcess = skillDef.effect ? [skillDef.effect] : (skillDef.effects || []);

                effectsToProcess.forEach(effectDef => {
                    if (!effectDef || REGISTERABLE_EFFECT_TYPES.includes(effectDef.type)) {
                        return;
                    }

                    switch (effectDef.type) {
                        case "MANUAL":
                            break;
                        case "KNOWLEDGE_BASED_SP_MULTIPLIER":
                            const knowledgeAmount = coreResourceManager.getAmount('knowledge');
                            if (decimalUtility.gt(knowledgeAmount, 0)) {
                                const magnitude = decimalUtility.log10(knowledgeAmount);
                                const bonusFactor = decimalUtility.multiply(magnitude, decimalUtility.new(effectDef.valuePerLevel || '0.001'));
                                const totalMultiplier = decimalUtility.add(1, bonusFactor);
                                coreUpgradeManager.registerEffectSource('skills', `${skillId}_knowledge_multiplier`, 'global_resource_production', 'studyPoints', 'MULTIPLIER', () => totalMultiplier);
                            } else {
                                coreUpgradeManager.unregisterEffectSource('skills', `${skillId}_knowledge_multiplier`, 'global_resource_production', 'studyPoints', 'MULTIPLIER');
                            }
                            break;
                        case "SSP_BASED_AP_MULTIPLIER":
                        case "AP_BASED_GLOBAL_MULTIPLIER":
                        case "FIRST_PRODUCER_BOOST":
                        case "SQUARE_SKILL_EFFECTS":
                        case "UNLOCK_SECRET_MECHANIC":
                            loggingSystem.debug("SkillsLogic", `Special effect ${skillId} (type: ${effectDef.type}) logic to be implemented.`);
                            break;
                        default:
                            loggingSystem.warn("SkillsLogic", `Unhandled special skill effect type: ${effectDef.type} for skill ${skillId}`);
                            break;
                    }
                });
            }
        };

        processSpecialSkills(staticModuleData.skills, false);
        processSpecialSkills(staticModuleData.prestigeSkills, true);
    },

    getFormattedSkillEffect(skillId, isPrestige = false, specificEffectDef = null) {
        const { decimalUtility } = coreSystemsRef;
        const skillsCollection = isPrestige ? staticModuleData.prestigeSkills : staticModuleData.skills;
        const skillDef = skillsCollection[skillId];
        const effectDef = specificEffectDef || skillDef.effect || (skillDef.effects ? skillDef.effects[0] : null); 

        if (!skillDef || !effectDef) return "N/A";

        const level = this.getSkillLevel(skillId, isPrestige);
        if (!REGISTERABLE_EFFECT_TYPES.includes(effectDef.type)) {
            return effectDef.description || "Special Effect (details TBD)";
        }

        if (level === 0 && !specificEffectDef) return "Not active"; 

        const baseValuePerLevel = decimalUtility.new(effectDef.valuePerLevel);
        let currentEffectValue = decimalUtility.multiply(baseValuePerLevel, level);
        let effectText = "";

        switch (effectDef.type) {
            case "MULTIPLIER":
                if (effectDef.aggregation === "ADDITIVE_TO_BASE_FOR_MULTIPLIER" || effectDef.aggregation === "SUBTRACTIVE_FROM_BASE_FOR_MULTIPLIER") {
                     effectText = `${effectDef.aggregation === "ADDITIVE_TO_BASE_FOR_MULTIPLIER" ? '+' : '-'}${decimalUtility.format(decimalUtility.multiply(currentEffectValue, 100), 0)}%`;
                } else {
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
        coreSystemsRef.loggingSystem.info("SkillsLogic", "onGameLoad triggered for Skills module (v1.9).");
        this.registerAllSkillEffects();
        this.isSkillsTabUnlocked(); 
        this.applySpecialSkillEffects(0);
    },

    // --- FEATURE: Added to handle selective reset on prestige ---
    onPrestigeReset() {
        coreSystemsRef.loggingSystem.info("SkillsLogic", "onPrestigeReset triggered. Resetting regular skills only.");
        moduleState.skillLevels = {}; // Reset regular skills
        // `prestigeSkillLevels` are intentionally not reset.
        this.registerAllSkillEffects();
    },

    onResetState() {
        coreSystemsRef.loggingSystem.info("SkillsLogic", "onResetState triggered. Resetting ALL skills and flags.");
        // Re-register to reset effects based on level 0
        this.registerAllSkillEffects();
        // Manually clean up special effects
        coreSystemsRef.coreUpgradeManager.unregisterEffectSource('skills', 'knowledgeIsPower_knowledge_multiplier', 'global_resource_production', 'studyPoints', 'MULTIPLIER');
        
        if (coreSystemsRef.coreGameStateManager) { 
            coreSystemsRef.coreGameStateManager.setGlobalFlag('skillsTabPermanentlyUnlocked', false);
            coreSystemsRef.loggingSystem.info("SkillsLogic", "'skillsTabPermanentlyUnlocked' flag cleared.");
        }
    }
};

