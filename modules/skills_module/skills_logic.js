// modules/skills_module/skills_logic.js (v1.6 - Filtered Effect Registration & Special Effects)

/**
 * @file skills_logic.js
 * @description Business logic for the Skills module.
 * v1.6: Filters skill effects before registering with CoreUpgradeManager, handling special types internally.
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
        coreSystemsRef.loggingSystem.info("SkillsLogic", "Logic initialized (v1.6).");
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
            case "prestigeSkillLevel": // For cross-tree dependencies (e.g., regular skill unlocked by prestige skill)
                const prestigeSkillsCollection = staticModuleData.prestigeSkills;
                const prestigeRequiredSkillDef = prestigeSkillsCollection[requiredSkillId];
                if (!prestigeRequiredSkillDef) {
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

                    // Check if the effect type is one that CoreUpgradeManager can handle
                    if (!REGISTERABLE_EFFECT_TYPES.includes(effectDef.type)) {
                        loggingSystem.debug("SkillsLogic", `Skipping CoreUpgradeManager registration for special effect type: ${effectDef.type} on skill ${skillId}. This should be handled manually.`);
                        // The logic for these special effects will be in applySpecialSkillEffects
                        return;
                    }
                    
                    // Validate targetSystem and type for registerable effects
                    if (!effectDef.targetSystem || !effectDef.type || typeof effectDef.targetSystem !== 'string' || typeof effectDef.type !== 'string') {
                         loggingSystem.error("SkillsLogic", `Invalid targetSystem or type for skill ${skillId} effect. targetSystem: ${effectDef.targetSystem}, type: ${effectDef.type}`);
                         return; // Skip registration for invalid parameters
                    }

                    const valueProvider = () => {
                        const level = this.getSkillLevel(skillId, isPrestigeFlag);
                        if (level === 0) { 
                            return effectDef.type.includes("MULTIPLIER") ? decimalUtility.new(1) : decimalUtility.new(0);
                        }
                        // For MANUAL, KNOWLEDGE_BASED_SP_MULTIPLIER, etc., valuePerLevel might be undefined.
                        // Ensure it exists for registerable effects.
                        if (effectDef.valuePerLevel === undefined || effectDef.valuePerLevel === null) {
                            loggingSystem.warn("SkillsLogic", `Missing valuePerLevel for registerable effect type ${effectDef.type} on skill ${skillId}. Returning default.`);
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
     * Applies the logic for special skill effects (those not handled by CoreUpgradeManager).
     * This method should be called periodically in the game loop.
     */
    applySpecialSkillEffects(deltaTimeSeconds) {
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager, moduleLoader } = coreSystemsRef;

        // Helper to process effects for a given skill collection
        const processSpecialSkills = (skillsCollection, isPrestigeFlag) => {
            for (const skillId in skillsCollection) {
                const skillDef = skillsCollection[skillId];
                const level = this.getSkillLevel(skillId, isPrestigeFlag);
                if (level === 0) continue; // Skip if skill is not leveled up

                const effectsToProcess = skillDef.effect ? [skillDef.effect] : (skillDef.effects || []);

                effectsToProcess.forEach(effectDef => {
                    if (!effectDef || REGISTERABLE_EFFECT_TYPES.includes(effectDef.type)) {
                        // Skip if it's a registerable type or undefined
                        return;
                    }

                    switch (effectDef.type) {
                        case "MANUAL":
                            // These are purely descriptive effects or handled elsewhere (e.g., in UI for starting resources).
                            // No direct game loop logic here.
                            break;
                        case "KNOWLEDGE_BASED_SP_MULTIPLIER":
                            // Knowledge is Power skill (Regular Skill Tier 7)
                            // "Total Knowledge multiplies Study Point production. (+0.1% per magnitude)"
                            const knowledgeAmount = coreResourceManager.getAmount('knowledge');
                            if (decimalUtility.gt(knowledgeAmount, 0)) {
                                const magnitude = decimalUtility.log10(knowledgeAmount);
                                // The effect.valuePerLevel should be 0.001 for 0.1% per magnitude
                                const bonusFactor = decimalUtility.multiply(magnitude, decimalUtility.new(effectDef.valuePerLevel || '0.001'));
                                const totalMultiplier = decimalUtility.add(1, bonusFactor);

                                coreUpgradeManager.registerEffectSource(
                                    'skills', // Module ID
                                    `${skillId}_knowledge_multiplier`, // Unique source key
                                    'global_resource_production', // Target system
                                    'studyPoints', // Target resource
                                    'MULTIPLIER',
                                    () => totalMultiplier // Dynamic value provider
                                );
                            } else {
                                // If no knowledge, ensure the multiplier is reset to 1
                                coreUpgradeManager.unregisterEffectSource('skills', `${skillId}_knowledge_multiplier`, 'global_resource_production', 'studyPoints', 'MULTIPLIER');
                            }
                            break;
                        case "MANUAL_CLICK_KNOWLEDGE_GAIN":
                            // The Final Frontier skill (Regular Skill Tier 8)
                            // "Manual clicks also generate a small percentage of your Knowledge per second."
                            // This effect needs to be applied when a manual click occurs, not continuously.
                            // Its 'valuePerLevel' should represent the percentage.
                            // This would typically involve modifying the click handling in core_gameplay_logic.js
                            // For now, logging a warning if it's tried here.
                            // loggingSystem.warn("SkillsLogic", `Special effect ${skillId} (type: ${effectDef.type}) is not directly applied in game loop. Requires click handler modification.`);
                            // To actually implement this, you'd need to expose a way to get this skill's level/effect
                            // to the core_gameplay module's click handler. This is outside of the current scope
                            // of fixing the registration errors, but noted for future implementation.
                            break;
                        case "SSP_BASED_AP_MULTIPLIER":
                            // Synergistic Prestige skill (Prestige Skill Tier 6)
                            // "Total Study Skill Points spent boost Prestige Point gain."
                            const studiesModule = moduleLoader.getModule('studies');
                            if (studiesModule?.logic?.getOwnedProducerCount) { // Assuming SSP are spent on studies producers
                                // This requires tracking total SSP spent, which might be a new game state variable
                                // For now, let's assume `prestigeLogic.calculatePrestigeGain` already incorporates this,
                                // or this needs to be a new input to it.
                                loggingSystem.debug("SkillsLogic", `SSP_BASED_AP_MULTIPLIER for ${skillId} needs integration with Prestige Point gain calculation.`);
                            }
                            break;
                        case "AP_BASED_GLOBAL_MULTIPLIER":
                            // AP Overdrive skill (Prestige Skill Tier 7)
                            // "Total Prestige Points ever earned boost ALL production."
                            const prestigeModule = moduleLoader.getModule('prestige');
                            if (prestigeModule?.logic?.getTotalPrestigePointsEverEarned) {
                                const totalAP = decimalUtility.new(coreGameStateManager.getModuleState('prestige')?.totalPrestigePointsEverEarned || '0');
                                if (decimalUtility.gt(totalAP, 0)) {
                                    // Example: 1% bonus per 1000 AP
                                    const bonusFactor = decimalUtility.divide(totalAP, '1000');
                                    const totalMultiplier = decimalUtility.add(1, decimalUtility.multiply(bonusFactor, decimalUtility.new(effectDef.valuePerLevel || '0.01')));

                                    coreUpgradeManager.registerEffectSource(
                                        'skills',
                                        `${skillId}_ap_global_multiplier`,
                                        'global_production',
                                        'all',
                                        'MULTIPLIER',
                                        () => totalMultiplier
                                    );
                                } else {
                                    coreUpgradeManager.unregisterEffectSource('skills', `${skillId}_ap_global_multiplier`, 'global_production', 'all', 'MULTIPLIER');
                                }
                            }
                            break;
                        case "FIRST_PRODUCER_BOOST":
                            // Echoes of Power skill (Prestige Skill Tier 7)
                            // "The first of each Study Producer is 1000x more powerful per level."
                            // This needs a specific `targetSystem` and `targetId` for each "first" producer.
                            // This effect seems to be a fixed value and should likely be applied as a MULTIPLIER
                            // on the *base* production of the first unit of each studies producer.
                            // This would be complex to register dynamically for "first of each".
                            // It might be better modeled as a property in `studies_data.js` for the first unit
                            // that gets modified by this skill's level.
                            // For now, logging a warning that it's a complex case.
                            loggingSystem.warn("SkillsLogic", `Special effect ${skillId} (type: ${effectDef.type}) is complex and needs specific integration in target module's production calculation.`);
                            break;
                        case "SQUARE_SKILL_EFFECTS":
                            // Singularity skill (Prestige Skill Tier 8)
                            // "All multipliers from regular skills are squared."
                            // This is a meta-effect that modifies how other multipliers are calculated.
                            // This would require a very deep integration into `coreUpgradeManager` itself,
                            // or a post-processing step for its aggregated results.
                            // For now, it's noted as unimplemented in this system.
                            loggingSystem.warn("SkillsLogic", `Special effect ${skillId} (type: ${effectDef.type}) is a meta-effect and requires advanced integration.`);
                            break;
                        case "UNLOCK_SECRET_MECHANIC":
                            // Transcendence skill (Prestige Skill Tier 8)
                            // "Unlocks a new, secret game mechanic after the next prestige."
                            // This needs to set a global flag after a prestige.
                            // The `performPrestige` function in `prestige_logic.js` might need to check this skill's level.
                            loggingSystem.debug("SkillsLogic", `Special effect ${skillId} (type: ${effectDef.type}) should trigger global flag upon next prestige.`);
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
        // For MANUAL and other special effects, show their description
        if (!REGISTERABLE_EFFECT_TYPES.includes(effectDef.type)) {
            return effectDef.description || "Special Effect (details TBD)";
        }

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
        coreSystemsRef.loggingSystem.info("SkillsLogic", "onGameLoad triggered for Skills module (v1.6).");
        this.registerAllSkillEffects(); // Re-register all effects on load
        this.isSkillsTabUnlocked(); 
        // Apply special effects whose state might depend on loaded data immediately
        this.applySpecialSkillEffects(0); // Pass 0 delta time for initial application
    },

    onResetState() {
        coreSystemsRef.loggingSystem.info("SkillsLogic", "onResetState triggered for Skills module (v1.6).");
        this.registerAllSkillEffects(); // Re-register to effectively reset (as levels will be 0)
        // Reset effects of special skills by unregistering or setting to default
        coreSystemsRef.coreUpgradeManager.unregisterEffectSource('skills', 'knowledgeIsPower_knowledge_multiplier', 'global_resource_production', 'studyPoints', 'MULTIPLIER');
        coreSystemsRef.coreUpgradeManager.unregisterEffectSource('skills', 'apOverdrive_ap_global_multiplier', 'global_production', 'all', 'MULTIPLIER');

        if (coreSystemsRef.coreGameStateManager) { 
            coreSystemsRef.coreGameStateManager.setGlobalFlag('skillsTabPermanentlyUnlocked', false);
            coreSystemsRef.loggingSystem.info("SkillsLogic", "'skillsTabPermanentlyUnlocked' flag cleared.");
        }
    }
};
