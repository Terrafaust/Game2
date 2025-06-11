// modules/skills_module/skills_logic.js (v6.0 - Complete & Refactored)

import { staticModuleData } from './skills_data.js';
import { moduleState, getInitialState as getSkillsInitialState } from './skills_state.js';
import { RESOURCES, UPGRADE_TARGETS, GLOBAL_FLAGS, EFFECT_TYPES, MODULES } from '../../js/core/constants.js';

let coreSystemsRef = null;

const REGISTERABLE_EFFECT_TYPES = [
    EFFECT_TYPES.MULTIPLIER,
    EFFECT_TYPES.ADDITIVE_BONUS,
    EFFECT_TYPES.COST_REDUCTION_MULTIPLIER
];

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("SkillsLogic", "Logic initialized (v6.0).");
        this.registerAllSkillEffects();
        coreSystemsRef.gameLoop.registerUpdateCallback('generalLogic', () => this.applySpecialSkillEffects());
    },

    // --- Core Purchase Logic ---

    purchaseSkillLevel(skillId, isPrestige = false) {
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager, coreUIManager, moduleLoader } = coreSystemsRef;
        const skillsCollection = isPrestige ? staticModuleData.prestigeSkills : staticModuleData.skills;
        const skillDef = skillsCollection[skillId];

        if (!skillDef || !this.isSkillUnlocked(skillId, isPrestige) || this.getSkillLevel(skillId, isPrestige) >= skillDef.maxLevel) {
            coreUIManager.showNotification("Cannot purchase skill.", "warning"); return false;
        }

        const cost = this.getSkillNextLevelCost(skillId, isPrestige);
        const resourceId = isPrestige ? staticModuleData.prestigeSkillPointResourceId : staticModuleData.skillPointResourceId;

        if (cost && coreResourceManager.canAfford(resourceId, cost)) {
            coreResourceManager.spendAmount(resourceId, cost);
            
            const levelObject = isPrestige ? (moduleState.prestigeSkillLevels ??= {}) : (moduleState.skillLevels ??= {});
            levelObject[skillId] = (levelObject[skillId] || 0) + 1;
            
            if (!isPrestige) {
                const currentSpent = coreSystemsRef.decimalUtility.new(moduleState.studySkillPointsSpentThisPrestige || '0');
                moduleState.studySkillPointsSpentThisPrestige = coreSystemsRef.decimalUtility.add(currentSpent, cost).toString();
            }

            if(skillDef.effect?.type === 'UNLOCK_SECRET_MECHANIC') {
                 coreGameStateManager.setGlobalFlag(GLOBAL_FLAGS.SECRET_MECHANIC_UNLOCKED, true);
                 loggingSystem.info("SkillsLogic", "Secret mechanic flag set due to Transcendence skill.");
            }

            coreGameStateManager.setModuleState(MODULES.SKILLS, { ...moduleState });
            loggingSystem.info("SkillsLogic", `Purchased level ${levelObject[skillId]} of ${skillDef.name}.`);
            
            this.registerAllSkillEffects(); 
            this.isSkillsTabUnlocked();

            if (coreUIManager.isActiveTab(MODULES.SKILLS)) { 
                moduleLoader.getModule(MODULES.SKILLS)?.ui?.renderMainContent(document.getElementById('main-content'));
            }
            return true;
        }
        return false;
    },

    // --- Getter and State Checkers ---

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
                return skillsInTier.length === 0 || skillsInTier.every(s => this.getSkillLevel(s.id, isPrestige) >= requiredLevel);
            case "prestigeSkillLevel": 
                return this.getSkillLevel(requiredSkillId, true) >= requiredLevel;
            default: return false;
        }
    },

    isSkillsTabUnlocked() {
        const { coreResourceManager, decimalUtility, coreGameStateManager, coreUIManager } = coreSystemsRef;
        if (coreGameStateManager.getGlobalFlag(GLOBAL_FLAGS.SKILLS_TAB_UNLOCKED, false)) return true;
        
        if (decimalUtility.gte(coreResourceManager.getAmount(RESOURCES.STUDY_SKILL_POINTS), 1)) {
            coreGameStateManager.setGlobalFlag(GLOBAL_FLAGS.SKILLS_TAB_UNLOCKED, true);
            if(coreUIManager) coreUIManager.renderMenu();
            return true;
        }
        return false;
    },
    
    getSkillNextLevelCost(skillId, isPrestige = false) {
        const { decimalUtility } = coreSystemsRef;
        const skillsCollection = isPrestige ? staticModuleData.prestigeSkills : staticModuleData.skills;
        const skillDef = skillsCollection[skillId];
        const currentLevel = this.getSkillLevel(skillId, isPrestige);
        if (!skillDef || currentLevel >= skillDef.maxLevel) return null;
        return decimalUtility.new(skillDef.costPerLevel[currentLevel]);
    },

    // --- Effect Application and Calculation ---

    registerAllSkillEffects() {
        const { coreUpgradeManager, loggingSystem, decimalUtility } = coreSystemsRef;
        if (!coreUpgradeManager) return;

        const processSkills = (skillsCollection, isPrestigeFlag) => {
            for (const skillId in skillsCollection) {
                const skillDef = skillsCollection[skillId];
                let effectsToProcess = skillDef.effect ? [skillDef.effect] : (skillDef.effects || []);
                effectsToProcess.forEach(effectDef => {
                    if (!effectDef || !REGISTERABLE_EFFECT_TYPES.includes(effectDef.type)) return;

                    const valueProvider = () => {
                        const level = this.getSkillLevel(skillId, isPrestigeFlag);
                        if (level === 0) return effectDef.type.includes("MULTIPLIER") ? decimalUtility.ONE : decimalUtility.ZERO;
                        const baseValuePerLevel = decimalUtility.new(effectDef.valuePerLevel || 0);
                        
                        let finalValue;
                        if (effectDef.type === EFFECT_TYPES.MULTIPLIER) {
                             let effectValue = decimalUtility.multiply(baseValuePerLevel, level);
                             finalValue = effectDef.aggregation === "ADDITIVE_TO_BASE_FOR_MULTIPLIER" 
                                ? decimalUtility.add(1, effectValue) 
                                : effectValue;
                        } else if (effectDef.type === EFFECT_TYPES.COST_REDUCTION_MULTIPLIER) {
                            const singleLevelMultiplier = decimalUtility.subtract(1, baseValuePerLevel);
                            finalValue = decimalUtility.power(singleLevelMultiplier, level);
                        } else {
                            return decimalUtility.multiply(baseValuePerLevel, level);
                        }
                        if (!isPrestigeFlag && this.getSingularityPower() > 1) {
                             finalValue = decimalUtility.power(finalValue, this.getSingularityPower());
                        }
                        return finalValue;
                    };
                    const sourceKey = `${isPrestigeFlag ? 'p' : 's'}_${skillId}_${effectDef.targetSystem}_${effectDef.targetId || 'ALL'}`;
                    coreUpgradeManager.registerEffectSource(MODULES.SKILLS, sourceKey, effectDef.targetSystem, effectDef.targetId, effectDef.type, valueProvider);
                });
            }
        };

        processSkills(staticModuleData.skills, false);
        processSkills(staticModuleData.prestigeSkills, true);
    },

    applySpecialSkillEffects() {
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager, moduleLoader, coreUpgradeManager } = coreSystemsRef;
        
        // Dynamic effect for Knowledge is Power
        const kipLevel = this.getSkillLevel('knowledgeIsPower', false);
        if (kipLevel > 0) {
            const knowledgeAmount = coreResourceManager.getAmount(RESOURCES.KNOWLEDGE);
            const mult = decimalUtility.gt(knowledgeAmount, 1) ? decimalUtility.add(1, decimalUtility.multiply(decimalUtility.log10(knowledgeAmount), '0.001')) : decimalUtility.ONE;
            coreUpgradeManager.registerEffectSource(MODULES.SKILLS, 'knowledgeIsPower_special', UPGRADE_TARGETS.GLOBAL_RESOURCE_PRODUCTION, RESOURCES.STUDY_POINTS, EFFECT_TYPES.MULTIPLIER, () => mult);
        }
    },
    
    getFormattedSkillEffect(skillId, isPrestige = false) {
        // This function is for UI display and its logic remains sound.
        const { decimalUtility, loggingSystem } = coreSystemsRef;
        const skillsCollection = isPrestige ? staticModuleData.prestigeSkills : staticModuleData.skills;
        const skillDef = skillsCollection[skillId];
        if (!skillDef) return "Invalid Skill";
        
        const effectDef = skillDef.effect || (skillDef.effects ? skillDef.effects[0] : null); 
        if (!effectDef) return "No Effect";

        const level = this.getSkillLevel(skillId, isPrestige);
        if (!REGISTERABLE_EFFECT_TYPES.includes(effectDef.type)) return effectDef.description || "Special Effect";
        if (level === 0) return "Not active"; 

        const baseValuePerLevel = decimalUtility.new(effectDef.valuePerLevel || 0);
        
        let multiplier;
        if (effectDef.type === EFFECT_TYPES.MULTIPLIER) {
            let currentEffectValue = decimalUtility.multiply(baseValuePerLevel, level);
            multiplier = effectDef.aggregation === "ADDITIVE_TO_BASE_FOR_MULTIPLIER" ? decimalUtility.add(1, currentEffectValue) : currentEffectValue;
        } else if (effectDef.type === EFFECT_TYPES.COST_REDUCTION_MULTIPLIER) {
             const singleLevelMultiplier = decimalUtility.subtract(1, baseValuePerLevel);
             multiplier = decimalUtility.power(singleLevelMultiplier, level);
        } else {
             let currentEffectValue = decimalUtility.multiply(baseValuePerLevel, level);
             return `+${decimalUtility.format(currentEffectValue, 2)}`;
        }

        if (!isPrestige) {
            const power = this.getSingularityPower();
            if (power > 1) multiplier = decimalUtility.power(multiplier, power);
        }

        if (effectDef.type === EFFECT_TYPES.MULTIPLIER) return `x${decimalUtility.format(multiplier, 2)}`;
        if (effectDef.type === EFFECT_TYPES.COST_REDUCTION_MULTIPLIER) {
            const reduction = decimalUtility.subtract(1, multiplier);
            return `-${decimalUtility.format(decimalUtility.multiply(reduction, 100), 2)}% Cost`;
        }
        return "Effect";
    },

    // --- Specific Skill Effect Getters ---
    getKnowledgeRetentionPercentage() {
        const { decimalUtility } = coreSystemsRef;
        const level = this.getSkillLevel('permanentKnowledge', true);
        return decimalUtility.multiply(level, 0.01);
    },
    getSspRetentionPercentage() {
        const { decimalUtility } = coreSystemsRef;
        const level = this.getSkillLevel('retainedSkills', true);
        return decimalUtility.multiply(level, 0.05);
    },
    getStartingProducers() {
        const { decimalUtility } = coreSystemsRef;
        const level = this.getSkillLevel('startingAdvantage', true);
        return level > 0 ? { student: decimalUtility.multiply(level, 10), classroom: decimalUtility.multiply(level, 5) } : {};
    },
    getManualKnowledgeGainPercent() {
        const { decimalUtility } = coreSystemsRef;
        const level = this.getSkillLevel('finalFrontier', false);
        return level > 0 ? decimalUtility.new(staticModuleData.skills.finalFrontier.effect.value || '0') : decimalUtility.ZERO;
    },
    getSingularityPower() {
        return this.getSkillLevel('singularity', true) > 0 ? 2 : 1;
    },

    // --- Lifecycle Callbacks ---
    onGameLoad() {
        Object.assign(moduleState, {
            ...getSkillsInitialState(),
            ...coreSystemsRef.coreGameStateManager.getModuleState(MODULES.SKILLS),
        });
        this.registerAllSkillEffects();
        this.isSkillsTabUnlocked(); 
        this.applySpecialSkillEffects();
    },

    onPrestigeReset() {
        moduleState.skillLevels = {}; 
        moduleState.studySkillPointsSpentThisPrestige = '0';
        this.registerAllSkillEffects();
    },

    onResetState() {
        Object.assign(moduleState, getSkillsInitialState());
        this.registerAllSkillEffects();
        coreSystemsRef.coreGameStateManager.setGlobalFlag(GLOBAL_FLAGS.SKILLS_TAB_UNLOCKED, false);
        coreSystemsRef.coreGameStateManager.setGlobalFlag(GLOBAL_FLAGS.SECRET_MECHANIC_UNLOCKED, false);
    }
};
