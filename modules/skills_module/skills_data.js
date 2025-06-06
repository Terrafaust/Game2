// modules/skills_module/skills_data.js (v4.3 - Prestige Skill Points Currency)

/**
 * @file skills_data.js
 * @description Static data definitions for the Skills module.
 * v4.3: Changed prestige skill currency from 'prestigePoints' to 'prestigeSkillPoints'.
 * v4.2: Corrected unlock condition types and terminology (AP -> PP, Ascension -> Prestige).
 */

const skillCostsPerLevelByTier = {
    1: "1", 2: "2", 3: "3", 4: "5",
    5: "8", 6: "15", 7: "50", 8: "100"
};
const createSkillLevelCosts = (tier, maxLevel) => {
    const costPerLevel = skillCostsPerLevelByTier[tier];
    return Array(maxLevel).fill(costPerLevel);
};

// --- FIX: Changed comments from AP to PP ---
const prestigeSkillCostsPerLevelByTier = {
    1: "1",      // Tier 1: 1 PP per level
    2: "2",     // Tier 2: 2 PP per level
    3: "3",    // Tier 3: 3 PP per level
    4: "5",    // Tier 4: 5 PP per level
    5: "10",   // Tier 5: 10 PP per level
    6: "25",  // Tier 6: 25 PP per level
    7: "100",  // Tier 7: 100 PP per level
    8: "10000"  // Tier 8: 10,000 PP per level
};
const createPrestigeSkillLevelCosts = (tier, maxLevel) => {
    const costPerLevel = prestigeSkillCostsPerLevelByTier[tier];
    return Array(maxLevel).fill(costPerLevel);
};


export const staticModuleData = {
    skillPointResourceId: 'studySkillPoints',
    skills: {
        // Tiers 1-8 remain the same as your file
        basicLearning: { id: 'basicLearning', tier: 1, name: "Basic Learning Techniques", description: "Improves output of Students by +10% per level.", maxLevel: 5, costPerLevel: createSkillLevelCosts(1, 5), effect: { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "student", valuePerLevel: "0.10", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" }, unlockCondition: null },
        efficientNoteTaking: { id: 'efficientNoteTaking', tier: 1, name: "Efficient Note-Taking", description: "Reduces the cost of Classrooms by 3% per level.", maxLevel: 5, costPerLevel: createSkillLevelCosts(1, 5), effect: { type: "COST_REDUCTION_MULTIPLIER", targetSystem: "studies_producers", targetId: "classroom", valuePerLevel: "0.03", aggregation: "SUBTRACTIVE_FROM_BASE_FOR_MULTIPLIER" }, unlockCondition: { type: "skillLevel", skillId: "basicLearning", level: 1 } },
        kindergartenBoost: { id: 'kindergartenBoost', tier: 2, name: "Early Start", description: "Increases Kindergarten output by +15% per level.", maxLevel: 5, costPerLevel: createSkillLevelCosts(2, 5), effect: { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "kindergarten", valuePerLevel: "0.15", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" }, unlockCondition: { type: "allSkillsInTierLevel", tier: 1, level: 1 } },
        elementaryEfficiency: { id: 'elementaryEfficiency', tier: 2, name: "Primary Focus", description: "Increases Elementary School output by +15% per level and reduces their cost by 2% per level.", maxLevel: 5, costPerLevel: createSkillLevelCosts(2, 5), effects: [ { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "elementarySchool", valuePerLevel: "0.15", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" }, { type: "COST_REDUCTION_MULTIPLIER", targetSystem: "studies_producers", targetId: "elementarySchool", valuePerLevel: "0.02", aggregation: "SUBTRACTIVE_FROM_BASE_FOR_MULTIPLIER" } ], unlockCondition: { type: "skillLevel", skillId: "kindergartenBoost", level: 1 } },
        middleSchoolMastery: { id: 'middleSchoolMastery', tier: 3, name: "Middle Ground", description: "Boosts Middle School output by +20% per level.", maxLevel: 4, costPerLevel: createSkillLevelCosts(3, 4), effect: { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "middleSchool", valuePerLevel: "0.20", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" }, unlockCondition: { type: "allSkillsInTierLevel", tier: 2, level: 1 } },
        highSchoolAdvantage: { id: 'highSchoolAdvantage', tier: 3, name: "Higher Grades", description: "Boosts High School output by +20% per level.", maxLevel: 4, costPerLevel: createSkillLevelCosts(3, 4), effect: { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "highSchool", valuePerLevel: "0.20", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" }, unlockCondition: { type: "skillLevel", skillId: "middleSchoolMastery", level: 1 } },
        studyPointsSurge1: { id: 'studyPointsSurge1', tier: 3, name: "Academic Momentum", description: "Increases global Study Point production by +5% per level.", maxLevel: 4, costPerLevel: createSkillLevelCosts(3, 4), effect: { type: "MULTIPLIER", targetSystem: "global_resource_production", targetId: "studyPoints", valuePerLevel: "0.05", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" }, unlockCondition: { type: "skillLevel", skillId: "highSchoolAdvantage", level: 1 } },
        universityExcellence: { id: 'universityExcellence', tier: 4, name: "University Prestige", description: "Boosts University output by +25% per level and Professor (Knowledge) output by +10% per level.", maxLevel: 3, costPerLevel: createSkillLevelCosts(4, 3), effects: [ { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "university", valuePerLevel: "0.25", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" }, { type: "MULTIPLIER", targetSystem: "studies_producers_knowledge", targetId: "professor", valuePerLevel: "0.10", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" } ], unlockCondition: { type: "allSkillsInTierLevel", tier: 3, level: 1 } },
        knowledgeHoard: { id: 'knowledgeHoard', tier: 4, name: "Knowledge Accumulation", description: "Increases global Knowledge production by +10% per level.", maxLevel: 3, costPerLevel: createSkillLevelCosts(4, 3), effect: { type: "MULTIPLIER", targetSystem: "global_resource_production", targetId: "knowledge", valuePerLevel: "0.10", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" }, unlockCondition: { type: "skillLevel", skillId: "universityExcellence", level: 1 } },
        lowerTierBoost: { id: 'lowerTierBoost', tier: 5, name: "Foundational Support", description: "Boosts Student, Classroom, and Kindergarten output by +30% per level.", maxLevel: 3, costPerLevel: createSkillLevelCosts(5, 3), effects: [ { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "student", valuePerLevel: "0.30", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" }, { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "classroom", valuePerLevel: "0.30", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" }, { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "kindergarten", valuePerLevel: "0.30", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" } ], unlockCondition: { type: "allSkillsInTierLevel", tier: 4, level: 1 } },
        overallCostReduction: { id: 'overallCostReduction', tier: 5, name: "Economic Efficiency", description: "Reduces cost of ALL Study producers by 2% per level.", maxLevel: 3, costPerLevel: createSkillLevelCosts(5, 3), effect: { type: "COST_REDUCTION_MULTIPLIER", targetSystem: "studies_producers", targetId: "ALL", valuePerLevel: "0.02", aggregation: "SUBTRACTIVE_FROM_BASE_FOR_MULTIPLIER" }, unlockCondition: { type: "skillLevel", skillId: "lowerTierBoost", level: 1 } },
        synergisticStudies: { id: 'synergisticStudies', tier: 6, name: "Synergistic Studies", description: "All Study producers (Student to University) gain +50% production. Professor output +25%.", maxLevel: 2, costPerLevel: createSkillLevelCosts(6, 2), effects: [ { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "student", valuePerLevel: "0.50" }, { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "classroom", valuePerLevel: "0.50" }, { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "kindergarten", valuePerLevel: "0.50" }, { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "elementarySchool", valuePerLevel: "0.50" }, { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "middleSchool", valuePerLevel: "0.50" }, { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "highSchool", valuePerLevel: "0.50" }, { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "university", valuePerLevel: "0.50" }, { type: "MULTIPLIER", targetSystem: "studies_producers_knowledge", targetId: "professor", valuePerLevel: "0.25" } ], unlockCondition: { type: "allSkillsInTierLevel", tier: 5, level: 1 } },
        marketMastery: { id: 'marketMastery', tier: 6, name: "Market Mastery", description: "Items in the Market cost 10% less per level.", maxLevel: 5, costPerLevel: createSkillLevelCosts(6, 5), effect: { type: "COST_REDUCTION_MULTIPLIER", targetSystem: "market_items", targetId: "ALL", valuePerLevel: "0.10" }, unlockCondition: { type: "skillLevel", skillId: "synergisticStudies", level: 1 } },
        peakStudyEfficiency: { id: 'peakStudyEfficiency', tier: 7, name: "Peak Study Efficiency", description: "Massively boosts global Study Point production by +100% per level.", maxLevel: 1, costPerLevel: createSkillLevelCosts(7,1), effect: { type: "MULTIPLIER", targetSystem: "global_resource_production", targetId: "studyPoints", valuePerLevel: "1.00" }, unlockCondition: { type: "allSkillsInTierLevel", tier: 6, level: 1 } },
        knowledgeIsPower: { id: 'knowledgeIsPower', tier: 7, name: "Knowledge is Power", description: "Total Knowledge multiplies Study Point production. (+0.1% per magnitude)", maxLevel: 1, costPerLevel: createSkillLevelCosts(7,1), effect: { type: "KNOWLEDGE_BASED_SP_MULTIPLIER" }, unlockCondition: { type: "skillLevel", skillId: "peakStudyEfficiency", level: 1 } },
        ultimateKnowledgeSynthesis: { id: 'ultimateKnowledgeSynthesis', tier: 8, name: "Ultimate Knowledge Synthesis", description: "Dramatically increases global Knowledge production by +200% per level.", maxLevel: 1, costPerLevel: createSkillLevelCosts(8,1), effect: { type: "MULTIPLIER", targetSystem: "global_resource_production", targetId: "knowledge", valuePerLevel: "2.00" }, unlockCondition: { type: "allSkillsInTierLevel", tier: 7, level: 1 } },
        finalFrontier: { id: 'finalFrontier', tier: 8, name: "The Final Frontier", description: "Manual clicks also generate a small percentage of your Knowledge per second.", maxLevel: 1, costPerLevel: createSkillLevelCosts(8,1), effect: { type: "MANUAL_CLICK_KNOWLEDGE_GAIN" }, unlockCondition: { type: "skillLevel", skillId: "ultimateKnowledgeSynthesis", level: 1 } },
    },
    
    prestigeSkillPointResourceId: 'prestigeSkillPoints', // Changed from 'prestigePoints' to 'prestigeSkillPoints'
    prestigeSkills: {
        // --- FIX: Renamed apGain to ppGain and corrected unlock condition types ---
        prestigedInsight: { id: 'prestigedInsight', tier: 1, name: "Prestige Insight", description: "Increases Prestige Point gain from prestiging by 10% per level.", maxLevel: 10, costPerLevel: createPrestigeSkillLevelCosts(1, 10), effect: { type: "MULTIPLIER", targetSystem: "prestige_mechanics", targetId: "ppGain", valuePerLevel: "0.10" }, unlockCondition: null },
        enduringLegacy: { id: 'enduringLegacy', tier: 1, name: "Enduring Legacy", description: "The base Prestige Bonus multiplier is 2% stronger per level.", maxLevel: 10, costPerLevel: createPrestigeSkillLevelCosts(1, 10), effect: { type: "MULTIPLIER", targetSystem: "prestige_mechanics", targetId: "prestigeBonus", valuePerLevel: "0.02" }, unlockCondition: { type: "skillLevel", skillId: "prestigedInsight", level: 1 } },
        startingAdvantage: { id: 'startingAdvantage', tier: 2, name: "Starting Advantage", description: "Start each prestige with 10 free Students and 5 free Classrooms per level.", maxLevel: 5, costPerLevel: createPrestigeSkillLevelCosts(2, 5), effect: { type: "MANUAL", description: "Grants free producers on prestige." }, unlockCondition: { type: "allSkillsInTierLevel", tier: 1, level: 1 } },
        acceleratedLearning: { id: 'acceleratedLearning', tier: 2, name: "Accelerated Learning", description: "All Study Producers cost 5% less per level.", maxLevel: 10, costPerLevel: createPrestigeSkillLevelCosts(2, 10), effect: { type: "COST_REDUCTION_MULTIPLIER", targetSystem: "studies_producers", targetId: "ALL", valuePerLevel: "0.05" }, unlockCondition: { type: "skillLevel", skillId: "startingAdvantage", level: 1 } },
        licensedEfficiency: { id: 'licensedEfficiency', tier: 3, name: "Licensed Efficiency", description: "License prestige producers are 50% more effective per level.", maxLevel: 5, costPerLevel: createPrestigeSkillLevelCosts(3, 5), effect: { type: "MULTIPLIER", targetSystem: "prestige_producers", targetId: "license", valuePerLevel: "0.50" }, unlockCondition: { type: "allSkillsInTierLevel", tier: 2, level: 1 } },
        mastersProgram: { id: 'mastersProgram', tier: 3, name: "Master's Program", description: "Master's Degree I & II prestige producers are 50% more effective per level.", maxLevel: 5, costPerLevel: createPrestigeSkillLevelCosts(3, 5), effects: [{ type: "MULTIPLIER", targetSystem: "prestige_producers", targetId: "master1", valuePerLevel: "0.50" }, { type: "MULTIPLIER", targetSystem: "prestige_producers", targetId: "master2", valuePerLevel: "0.50" }], unlockCondition: { type: "skillLevel", skillId: "licensedEfficiency", level: 1 } },
        scholarlySynergy: { id: 'scholarlySynergy', tier: 4, name: "Scholarly Synergy", description: "PhD and Post-Doctorate prestige producers are 25% more effective per level.", maxLevel: 5, costPerLevel: createPrestigeSkillLevelCosts(4, 5), effects: [ { type: "MULTIPLIER", targetSystem: "prestige_producers", targetId: "phd", valuePerLevel: "0.25" }, { type: "MULTIPLIER", targetSystem: "prestige_producers", targetId: "postDoc", valuePerLevel: "0.25" } ], unlockCondition: { type: "allSkillsInTierLevel", tier: 3, level: 1 } },
        permanentKnowledge: { id: 'permanentKnowledge', tier: 4, name: "Permanent Knowledge", description: "Start each prestige with 1% of your previous prestige's Knowledge per level.", maxLevel: 10, costPerLevel: createPrestigeSkillLevelCosts(4, 10), effect: { type: "MANUAL", description: "Retain a percentage of Knowledge on prestige." }, unlockCondition: { type: "skillLevel", skillId: "scholarlySynergy", level: 1 } },
        prestigePower: { id: 'prestigePower', tier: 5, name: "Prestige Power", description: "The Prestige Bonus multiplier is boosted by a further 10% per level.", maxLevel: 5, costPerLevel: createPrestigeSkillLevelCosts(5, 5), effect: { type: "MULTIPLIER", targetSystem: "prestige_mechanics", targetId: "prestigeBonus", valuePerLevel: "0.10" }, unlockCondition: { type: "allSkillsInTierLevel", tier: 4, level: 1 } },
        prestigeEconomics: { id: 'prestigeEconomics', tier: 5, name: "Prestige Economics", description: "All Prestige Producers cost 5% less per level.", maxLevel: 10, costPerLevel: createPrestigeSkillLevelCosts(5, 10), effect: { type: "COST_REDUCTION_MULTIPLIER", targetSystem: "prestige_producers", targetId: "ALL", valuePerLevel: "0.05" }, unlockCondition: { type: "skillLevel", skillId: "prestigePower", level: 1 } },
        synergisticPrestige: { id: 'synergisticPrestige', tier: 6, name: "Synergistic Prestige", description: "Total Study Skill Points spent boost Prestige Point gain.", maxLevel: 1, costPerLevel: createPrestigeSkillLevelCosts(6, 1), effect: { type: "SSP_BASED_AP_MULTIPLIER" }, unlockCondition: { type: "allSkillsInTierLevel", tier: 5, level: 1 } },
        retainedSkills: { id: 'retainedSkills', tier: 6, name: "Retained Skills", description: "Keep 5% of your Study Skill Points on prestige per level.", maxLevel: 10, costPerLevel: createPrestigeSkillLevelCosts(6, 10), effect: { type: "MANUAL" }, unlockCondition: { type: "skillLevel", skillId: "synergisticPrestige", level: 1 } },
        apOverdrive: { id: 'apOverdrive', tier: 7, name: "PP Overdrive", description: "Total Prestige Points ever earned boost ALL production.", maxLevel: 1, costPerLevel: createPrestigeSkillLevelCosts(7, 1), effect: { type: "AP_BASED_GLOBAL_MULTIPLIER" }, unlockCondition: { type: "allSkillsInTierLevel", tier: 6, level: 1 } },
        echoesOfPower: { id: 'echoesOfPower', tier: 7, name: "Echoes of Power", description: "The first of each Study Producer is 1000x more powerful per level.", maxLevel: 3, costPerLevel: createPrestigeSkillLevelCosts(7, 3), effect: { type: "FIRST_PRODUCER_BOOST", value: "1000" }, unlockCondition: { type: "skillLevel", skillId: "apOverdrive", level: 1 } },
        singularity: { id: 'singularity', tier: 8, name: "Singularity", description: "All multipliers from regular skills are squared.", maxLevel: 1, costPerLevel: createPrestigeSkillLevelCosts(8, 1), effect: { type: "SQUARE_SKILL_EFFECTS" }, unlockCondition: { type: "allSkillsInTierLevel", tier: 7, level: 1 } },
        transcendence: { id: 'transcendence', tier: 8, name: "Transcendence", description: "Unlocks a new, secret game mechanic after the next prestige.", maxLevel: 1, costPerLevel: createPrestigeSkillLevelCosts(8, 1), effect: { type: "UNLOCK_SECRET_MECHANIC" }, unlockCondition: { type: "skillLevel", skillId: "singularity", level: 1 } },
    },

    ui: {
        skillsTabLabel: "Skills",
        skillPointDisplayLabel: "Study Skill Points Available:",
        prestigeSkillsTitle: "Prestige Skills",
        prestigeSkillPointDisplayLabel: "Prestige Points Available:",
        prestigeTierUnlockMessage: (tier) => `Unlock Tier ${tier} by leveling all Prestige skills in Tier ${tier - 1} to at least level 1.`,
        tierUnlockMessage: (tier) => `Unlock Tier ${tier} by leveling all skills in Tier ${tier - 1} to at least level 1.`
    }
};

