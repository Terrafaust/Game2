// modules/skills_module/skills_logic.js (v4.6 - Final Production Fix)

/**
 * @file skills_logic.js
 * @description Business logic for the Skills module.
 * v4.6: Corrected the valueProvider to restore original MULTIPLIER logic, fixing the zero-gain bug, while correctly applying exponential COST_REDUCTION_MULTIPLIER as per the roadmap.
 * v4.5: Reverted MULTIPLIER logic to original state and applied correct exponential formula for COST_REDUCTION_MULTIPLIER.
 * v4.4: Fixed critical bug in MULTIPLIER effect calculation that was reducing production to zero.
 */

import { staticModuleData } from './skills_data.js';
import { moduleState, getInitialState as getSkillsInitialState } from './skills_state.js';

let coreSystemsRef = null;

const REGISTERABLE_EFFECT_TYPES = [
    "MULTIPLIER",
    "ADDITIVE_BONUS",
    "PERCENTAGE_BONUS",
    "COST_REDUCTION_MULTIPLIER"
];

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("SkillsLogic", "Logic initialized (v4.6).");
        this.registerAllSkillEffects();
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

    getKnowledgeRetentionPercentage() {
        if (!coreSystemsRef) return new coreSystemsRef.decimalUtility.new(0);
        const { decimalUtility, loggingSystem } = coreSystemsRef;
        const skillId = 'permanentKnowledge';
        const level = this.getSkillLevel(skillId, true);
        if (level > 0) {
            const retentionPerLevel = decimalUtility.new('0.01');
            const totalRetention = decimalUtility.multiply(level, retentionPerLevel);
            loggingSystem.info("SkillsLogic_Retention", `Skill '${skillId}' is level ${level}. Retaining ${totalRetention.toExponential(2)} of Knowledge.`);
            return totalRetention;
        }
        return decimalUtility.new(0);
    },

    getSspRetentionPercentage() {
        const { decimalUtility } = coreSystemsRef;
        const level = this.getSkillLevel('retainedSkills', true);
        return decimalUtility.multiply(level, 0.05);
    },
    
    getStartingProducers() {
        const { decimalUtility } = coreSystemsRef;
        const level = this.getSkillLevel('startingAdvantage', true);
        if (level === 0) return {};
        return {
            student: decimalUtility.multiply(level, 10),
            classroom: decimalUtility.multiply(level, 5)
        };
    },
    
    getManualKnowledgeGainPercent() {
        const skillId = 'finalFrontier';
        const level = this.getSkillLevel(skillId, false);
        if (level > 0) {
            const skillDef = staticModuleData.skills[skillId];
            return coreSystemsRef.decimalUtility.new(skillDef.effect.value || '0');
        }
        return coreSystemsRef.decimalUtility.new('0');
    },

    getSkillLevel(skillId, isPrestige = false) {
        if (isPrestige) {
            return moduleState.prestigeSkillLevels?.[skillId] || 0;
        }
        return moduleState.skillLevels?.[skillId] || 0;
    },

    getSkillMaxLevel(skillId, isPrestige = false) {
        const skillsCollection = isPrestige ? staticModuleData.prestigeSkills : staticModuleData.skills;
        return skillsCollection[skillId]?.maxLevel || 0;
    },

    isTierUnlocked(tierNum, isPrestige = false) {
        if (tierNum <= 1) return true; 
        const prevTier = tierNum - 1;
        const skillsCollection = isPrestige ? staticModuleData.prestigeSkills : staticModuleData.skills;
        const skillsInPrevTier = Object.values(skillsCollection).filter(s => s.tier === prevTier);
        if (skillsInPrevTier.length === 0 && prevTier > 0) return true;
        return skillsInPrevTier.every(s => this.getSkillLevel(s.id, isPrestige) >= 1);
    },

    isSkillUnlocked(skillId, isPrestige = false) {
        const skillsCollection = isPrestige ? staticModuleData.prestigeSkills : staticModuleData.skills;
        const skillDef = skillsCollection[skillId];
        if (!skillDef || !this.isTierUnlocked(skillDef.tier, isPrestige)) return false;
        if (!skillDef.unlockCondition) return true; 

        const { type, skillId: requiredSkillId, level: requiredLevel, tier: requiredTierNum } = skillDef.unlockCondition;
        switch (type) {
            case "skillLevel": return this.getSkillLevel(requiredSkillId, isPrestige) >= requiredLevel;
            case "allSkillsInTierLevel":
                const skillsInTier = Object.values(skillsCollection).filter(s => s.tier === requiredTierNum);
                if (skillsInTier.length === 0) return true; 
                return skillsInTier.every(s => this.getSkillLevel(s.id, isPrestige) >= requiredLevel);
            case "prestigeSkillLevel": 
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

    getSkillNextLevelCost(skillId, isPrestige = false) {
        const { decimalUtility } = coreSystemsRef;
        const skillsCollection = isPrestige ? staticModuleData.prestigeSkills : staticModuleData.skills;
        const skillDef = skillsCollection[skillId];
        const currentLevel = this.getSkillLevel(skillId, isPrestige);
        if (!skillDef || currentLevel >= skillDef.maxLevel) return null;
        return decimalUtility.new(skillDef.costPerLevel[currentLevel]);
    },

    purchaseSkillLevel(skillId, isPrestige = false) {
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager, coreUIManager, moduleLoader } = coreSystemsRef;
        const skillsCollection = isPrestige ? staticModuleData.prestigeSkills : staticModuleData.skills;
        const skillDef = skillsCollection[skillId];

        if (!skillDef || !this.isSkillUnlocked(skillId, isPrestige) || this.getSkillLevel(skillId, isPrestige) >= skillDef.maxLevel) {
            coreUIManager.showNotification("Cannot purchase skill.", "warning");
            return false;
        }

        const cost = this.getSkillNextLevelCost(skillId, isPrestige);
        const resourceId = isPrestige ? staticModuleData.prestigeSkillPointResourceId : staticModuleData.skillPointResourceId;

        if (cost && coreResourceManager.canAfford(resourceId, cost)) {
            coreResourceManager.spendAmount(resourceId, cost);
            
            if (!isPrestige) {
                const currentSpent = decimalUtility.new(moduleState.studySkillPointsSpentThisPrestige || '0');
                moduleState.studySkillPointsSpentThisPrestige = decimalUtility.add(currentSpent, cost).toString();
            }

            const levelObject = isPrestige ? (moduleState.prestigeSkillLevels ??= {}) : (moduleState.skillLevels ??= {});
            levelObject[skillId] = (levelObject[skillId] || 0) + 1;
            
            coreGameStateManager.setModuleState('skills', { ...moduleState });
            loggingSystem.info("SkillsLogic", `Purchased level ${levelObject[skillId]} of ${skillDef.name}.`);
            coreUIManager.showNotification(`${skillDef.name} leveled up to ${levelObject[skillId]}!`, 'success');
            
            this.registerAllSkillEffects(); 
            this.isSkillsTabUnlocked();

            if (coreUIManager.isActiveTab('skills')) { 
                moduleLoader.getModule('skills')?.ui?.renderMainContent(document.getElementById('main-content'));
            }
            return true;
        } else {
            const currency = coreResourceManager.getResource(resourceId)?.name || 'currency';
            coreUIManager.showNotification(`Not enough ${currency}.`, 'error');
            return false;
        }
    },

    getSingularityPower() {
        return this.getSkillLevel('singularity', true) > 0 ? 2 : 1;
    },

    registerAllSkillEffects() {
        const { coreUpgradeManager, loggingSystem, decimalUtility } = coreSystemsRef;
        if (!coreUpgradeManager) return;

        const processSkills = (skillsCollection, isPrestigeFlag) => {
            for (const skillId in skillsCollection) {
                const skillDef = skillsCollection[skillId];
                
                let effectsToProcess = [];
                if (skillDef.effect && typeof skillDef.effect === 'object') {
                    effectsToProcess = [skillDef.effect];
                } else if (Array.isArray(skillDef.effects)) {
                    effectsToProcess = skillDef.effects;
                }

                effectsToProcess.forEach(effectDef => {
                    if (!effectDef || !REGISTERABLE_EFFECT_TYPES.includes(effectDef.type)) return;

                    const valueProvider = () => {
                        const level = this.getSkillLevel(skillId, isPrestigeFlag);
                        if (level === 0) return effectDef.type.includes("MULTIPLIER") ? decimalUtility.new(1) : decimalUtility.new(0);

                        const baseValuePerLevel = decimalUtility.new(effectDef.valuePerLevel || 0);
                        let effectValue = decimalUtility.multiply(baseValuePerLevel, level);
                        
                        let finalMultiplier;
                        if (effectDef.type === "MULTIPLIER") {
                             finalMultiplier = effectDef.aggregation === "ADDITIVE_TO_BASE_FOR_MULTIPLIER" 
                                ? decimalUtility.add(1, effectValue) 
                                : effectValue;
                        } else if (effectDef.type === "COST_REDUCTION_MULTIPLIER") {
                             const baseReductionMultiplier = decimalUtility.subtract(1, baseValuePerLevel);
                             finalMultiplier = decimalUtility.power(baseReductionMultiplier, level);
                        } else {
                            return effectValue;
                        }

                        if (!isPrestigeFlag && finalMultiplier.gt(0)) {
                            const power = this.getSingularityPower();
                            if (power > 1) finalMultiplier = decimalUtility.power(finalMultiplier, power);
                        }
                        return finalMultiplier;
                    };
                    const sourceKey = `${isPrestigeFlag ? 'p_' : 's_'}${skillId}_${effectDef.targetSystem}_${effectDef.targetId || 'ALL'}`;
                    coreUpgradeManager.registerEffectSource('skills', sourceKey, effectDef.targetSystem, effectDef.targetId, effectDef.type, valueProvider);
                });
            }
        };

        processSkills(staticModuleData.skills, false);
        processSkills(staticModuleData.prestigeSkills, true);
        loggingSystem.info("SkillsLogic", "All skill effects registered/updated.");
    },

    applySpecialSkillEffects(deltaTimeSeconds) {
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager, moduleLoader, coreUpgradeManager } = coreSystemsRef;
        
        const processSpecialSkills = (skillsCollection, isPrestigeFlag) => {
            for (const skillId in skillsCollection) {
                const skillDef = skillsCollection[skillId];
                const level = this.getSkillLevel(skillId, isPrestigeFlag);

                if (level === 0) {
                     if (skillDef.effect && !REGISTERABLE_EFFECT_TYPES.includes(skillDef.effect.type)) {
                        coreUpgradeManager.unregisterEffectSource('skills', `${skillId}_special`, skillDef.effect.targetSystem, skillDef.effect.targetId, 'MULTIPLIER');
                     }
                     continue;
                };

                let effectsToProcess = [];
                if (skillDef.effect && typeof skillDef.effect === 'object') {
                    effectsToProcess = [skillDef.effect];
                } else if (Array.isArray(skillDef.effects)) {
                    effectsToProcess = skillDef.effects;
                }

                effectsToProcess.forEach(effectDef => {
                    if (!effectDef || REGISTERABLE_EFFECT_TYPES.includes(effectDef.type)) return;

                    switch (effectDef.type) {
                        case "KNOWLEDGE_BASED_SP_MULTIPLIER":
                            const knowledgeAmount = coreResourceManager.getAmount('knowledge');
                            const mult = decimalUtility.gt(knowledgeAmount, 1) ? decimalUtility.add(1, decimalUtility.multiply(decimalUtility.log10(knowledgeAmount), '0.001')) : decimalUtility.new(1);
                            coreUpgradeManager.registerEffectSource('skills', 'knowledgeIsPower_special', 'global_resource_production', 'studyPoints', 'MULTIPLIER', () => mult);
                            break;
                        
                        case "SSP_BASED_PP_MULTIPLIER":
                            const sspSpent = decimalUtility.new(moduleState.studySkillPointsSpentThisPrestige || '0');
                            const ppBonus = decimalUtility.add(1, decimalUtility.multiply(sspSpent, 0.01));
                            coreUpgradeManager.registerEffectSource('skills', 'synergisticPrestige_special', 'prestige_mechanics', 'ppGain', 'MULTIPLIER', () => ppBonus);
                            break;

                        case "TOTAL_PP_BASED_GLOBAL_MULTIPLIER":
                            const prestigeModule = moduleLoader.getModule('prestige');
                            const totalPPEarned = prestigeModule?.logic?.getTotalPPEarned ? prestigeModule.logic.getTotalPPEarned() : decimalUtility.new(0);
                            const globalBonus = totalPPEarned.gt(1) ? decimalUtility.add(1, decimalUtility.multiply(decimalUtility.log10(totalPPEarned), effectDef.valuePerMagnitude || '0.1')) : decimalUtility.new(1);
                            coreUpgradeManager.registerEffectSource('skills', 'ppOverdrive_special', 'global_production', 'all', 'MULTIPLIER', () => globalBonus);
                            break;

                        case "MANUAL_CLICK_KNOWLEDGE_GAIN":
                        case "SQUARE_STUDY_SKILL_MULTIPLIERS":
                        case "MANUAL":
                        case "UNLOCK_SECRET_MECHANIC":
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
        const { decimalUtility, loggingSystem } = coreSystemsRef;
        const skillsCollection = isPrestige ? staticModuleData.prestigeSkills : staticModuleData.skills;
        const skillDef = skillsCollection[skillId];

        if (!skillDef) {
            loggingSystem.warn("SkillsLogic_getFormattedSkillEffect", `Could not find skill definition for ID: ${skillId}.`);
            return "Invalid Skill";
        }
        
        const effectDef = specificEffectDef || skillDef.effect || (skillDef.effects ? skillDef.effects[0] : null); 
        
        if (!effectDef) return "No Effect";

        const level = this.getSkillLevel(skillId, isPrestige);
        if (!REGISTERABLE_EFFECT_TYPES.includes(effectDef.type)) return effectDef.description || "Special Effect";
        if (level === 0) return "Not active"; 

        if (effectDef.type === "COST_REDUCTION_MULTIPLIER") {
            const baseValuePerLevel = decimalUtility.new(effectDef.valuePerLevel || 0);
            const baseReductionMultiplier = decimalUtility.subtract(1, baseValuePerLevel);
            const finalMultiplier = decimalUtility.power(baseReductionMultiplier, level);
            const reductionPercent = decimalUtility.multiply(decimalUtility.subtract(1, finalMultiplier), 100);
            return `-${decimalUtility.format(reductionPercent, 2)}% Cost`;
        }

        const baseValuePerLevel = decimalUtility.new(effectDef.valuePerLevel || 0);
        let effectValue = decimalUtility.multiply(baseValuePerLevel, level);

        if (effectDef.type === "MULTIPLIER") {
            let multiplier = effectDef.aggregation === "ADDITIVE_TO_BASE_FOR_MULTIPLIER" 
                                ? decimalUtility.add(1, effectValue) 
                                : effectValue;

            if (!isPrestige) {
                const power = this.getSingularityPower();
                if (power > 1) multiplier = decimalUtility.power(multiplier, power);
            }
            return `x${decimalUtility.format(multiplier, 2)}`;
        }
        
        if(effectDef.type === "ADDITIVE_BONUS" || effectDef.type === "PERCENTAGE_BONUS") {
            return `+${decimalUtility.format(effectValue, 2)}`;
        }

        return "Effect";
    },

    onGameLoad() {
        coreSystemsRef.loggingSystem.info("SkillsLogic", "onGameLoad triggered for Skills module (v4.6).");
        Object.assign(moduleState, {
            ...getSkillsInitialState(),
            ...coreSystemsRef.coreGameStateManager.getModuleState('skills'),
        });
        this.registerAllSkillEffects();
        this.isSkillsTabUnlocked(); 
        this.applySpecialSkillEffects(0);
    },

    onPrestigeReset() {
        coreSystemsRef.loggingSystem.info("SkillsLogic", "onPrestigeReset triggered. Resetting regular skills and SSP tracker.");
        moduleState.skillLevels = {}; 
        moduleState.studySkillPointsSpentThisPrestige = '0';
        this.registerAllSkillEffects();
    },

    onResetState() {
        coreSystemsRef.loggingSystem.info("SkillsLogic", "onResetState triggered. Resetting ALL skills and flags.");
        Object.assign(moduleState, getInitialState());
        this.registerAllSkillEffects();
        
        coreSystemsRef.coreUpgradeManager.unregisterEffectSource('skills', 'knowledgeIsPower_special', 'global_resource_production', 'studyPoints', 'MULTIPLIER');
        coreSystemsRef.coreUpgradeManager.unregisterEffectSource('skills', 'synergisticPrestige_special', 'prestige_mechanics', 'ppGain', 'MULTIPLIER');
        coreSystemsRef.coreUpgradeManager.unregisterEffectSource('skills', 'ppOverdrive_special', 'global_production', 'all', 'MULTIPLIER');
        
        if (coreSystemsRef.coreGameStateManager) { 
            coreSystemsRef.coreGameStateManager.setGlobalFlag('skillsTabPermanentlyUnlocked', false);
        }
    }
};
