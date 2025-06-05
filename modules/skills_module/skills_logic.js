// modules/skills_module/skills_logic.js (v1.2 - Achievement Support)

/**
 * @file skills_logic.js
 * @description Business logic for the Skills module.
 * v1.2: Adds methods for achievement system to query skill states.
 */

import { staticModuleData } from './skills_data.js';
import { moduleState } from './skills_state.js';

let coreSystemsRef = null;

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("SkillsLogic", "Logic initialized (v1.2).");
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

    getSkillLevel(skillId) {
        return moduleState.skillLevels[skillId] || 0;
    },

    // New method for achievements
    getSkillMaxLevel(skillId) {
        const skillDef = staticModuleData.skills[skillId];
        return skillDef ? skillDef.maxLevel : 0;
    },

    // New method for achievements
    isTierUnlocked(tierNum) {
        if (tierNum <= 1) return true; // Tier 1 is always unlocked
        // Check if all skills in the previous tier (tierNum - 1) are at least level 1
        const prevTier = tierNum - 1;
        const skillsInPrevTier = Object.values(staticModuleData.skills).filter(s => s.tier === prevTier);
        if (skillsInPrevTier.length === 0 && prevTier > 0) { // No skills defined for previous tier implies current tier isn't locked by it
            return true;
        }
        return skillsInPrevTier.every(s => this.getSkillLevel(s.id) >= 1);
    },


    isSkillUnlocked(skillId) {
        const skillDef = staticModuleData.skills[skillId];
        if (!skillDef) return false;
        if (!skillDef.unlockCondition) return true; 

        const { type, skillId: requiredSkillId, level: requiredLevel, tier: requiredTierNum } = skillDef.unlockCondition;

        switch (type) {
            case "skillLevel":
                return this.getSkillLevel(requiredSkillId) >= requiredLevel;
            case "allSkillsInTierLevel": // This condition means all skills in 'requiredTierNum' must be at 'requiredLevel'
                const skillsInRequiredTier = Object.values(staticModuleData.skills).filter(s => s.tier === requiredTierNum);
                if (skillsInRequiredTier.length === 0) return true; // No skills in target tier, so condition met
                return skillsInRequiredTier.every(s => this.getSkillLevel(s.id) >= requiredLevel);
            default:
                coreSystemsRef.loggingSystem.warn("SkillsLogic", `Unknown skill unlock condition type: ${type} for skill ${skillId}`);
                return false;
        }
    },

    getSkillNextLevelCost(skillId) {
        const { decimalUtility } = coreSystemsRef;
        const skillDef = staticModuleData.skills[skillId];
        const currentLevel = this.getSkillLevel(skillId);

        if (!skillDef || currentLevel >= skillDef.maxLevel) {
            return null;
        }
        return decimalUtility.new(skillDef.costPerLevel[currentLevel]);
    },

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
        if (!cost) return false; 

        if (coreResourceManager.canAfford(staticModuleData.skillPointResourceId, cost)) {
            coreResourceManager.spendAmount(staticModuleData.skillPointResourceId, cost);
            moduleState.skillLevels[skillId] = currentLevel + 1;
            coreGameStateManager.setModuleState('skills', { ...moduleState });
            
            loggingSystem.info("SkillsLogic", `Purchased level ${moduleState.skillLevels[skillId]} of skill ${skillId} (${skillDef.name}).`);
            coreUIManager.showNotification(`${skillDef.name} leveled up to ${moduleState.skillLevels[skillId]}!`, 'success');
            
            this.isSkillsTabUnlocked(); 

            if (coreUIManager.isActiveTab('skills')) { 
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
                const valueProvider = () => {
                    const level = this.getSkillLevel(skillId);
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
                    'skills', 
                    skillId + (effectDef.targetId ? `_${effectDef.targetId}` : ''), 
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
        loggingSystem.info("SkillsLogic", "All skill effects registered with CoreUpgradeManager.");
    },

    getFormattedSkillEffect(skillId, specificEffectDef = null) {
        const { decimalUtility } = coreSystemsRef;
        const skillDef = staticModuleData.skills[skillId];
        const effectDef = specificEffectDef || skillDef.effect || (skillDef.effects ? skillDef.effects[0] : null); 

        if (!skillDef || !effectDef) return "N/A";

        const level = this.getSkillLevel(skillId);
        if (level === 0 && !specificEffectDef) return "Not active"; 

        const baseValuePerLevel = decimalUtility.new(effectDef.valuePerLevel);
        let currentEffectValue = decimalUtility.multiply(baseValuePerLevel, level);
        let effectText = "";

        switch (effectDef.type) {
            case "MULTIPLIER":
                effectText = `+${decimalUtility.format(decimalUtility.multiply(currentEffectValue, 100), 0)}%`;
                break;
            case "COST_REDUCTION_MULTIPLIER":
                effectText = `-${decimalUtility.format(decimalUtility.multiply(currentEffectValue, 100), 0)}% Cost`;
                break;
            default:
                effectText = decimalUtility.format(currentEffectValue, 2);
        }
        return effectText;
    },

    onGameLoad() {
        coreSystemsRef.loggingSystem.info("SkillsLogic", "onGameLoad triggered for Skills module (v1.2).");
        this.registerAllSkillEffects(); 
        this.isSkillsTabUnlocked(); 
    },

    onResetState() {
        coreSystemsRef.loggingSystem.info("SkillsLogic", "onResetState triggered for Skills module (v1.2).");
        this.registerAllSkillEffects();
        if (coreSystemsRef.coreGameStateManager) { // Ensure coreGameStateManager is available
            coreSystemsRef.coreGameStateManager.setGlobalFlag('skillsTabPermanentlyUnlocked', false);
        }
    }
};
