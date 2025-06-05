// modules/skills_module/skills_data.js (v2 - Expanded Tree)

/**
 * @file skills_data.js
 * @description Static data definitions for the Skills module.
 * v2: Expanded skill tree to 8 tiers, ~15 skills, with new cost structure.
 */

const skillCostsPerLevelByTier = {
    1: "1", 2: "2", 3: "3", 4: "5",
    5: "8", 6: "15", 7: "50", 8: "100"
};

const createSkillLevelCosts = (tier, maxLevel) => {
    const costPerLevel = skillCostsPerLevelByTier[tier];
    return Array(maxLevel).fill(costPerLevel);
};

export const staticModuleData = {
    skillPointResourceId: 'studySkillPoints',
    skills: {
        // --- Tier 1: Basic Study Enhancements (2 Skills) ---
        basicLearning: {
            id: 'basicLearning', tier: 1, name: "Basic Learning Techniques",
            description: "Improves output of Students by +10% per level.",
            maxLevel: 5, costPerLevel: createSkillLevelCosts(1, 5),
            effect: { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "student", valuePerLevel: "0.10", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" },
            unlockCondition: null
        },
        efficientNoteTaking: {
            id: 'efficientNoteTaking', tier: 1, name: "Efficient Note-Taking",
            description: "Reduces the cost of Classrooms by 3% per level.",
            maxLevel: 5, costPerLevel: createSkillLevelCosts(1, 5),
            effect: { type: "COST_REDUCTION_MULTIPLIER", targetSystem: "studies_producers", targetId: "classroom", valuePerLevel: "0.03", aggregation: "SUBTRACTIVE_FROM_BASE_FOR_MULTIPLIER" },
            unlockCondition: { type: "skillLevel", skillId: "basicLearning", level: 1 }
        },

        // --- Tier 2: Foundational Structures (2 Skills) ---
        kindergartenBoost: {
            id: 'kindergartenBoost', tier: 2, name: "Early Start",
            description: "Increases Kindergarten output by +15% per level.",
            maxLevel: 5, costPerLevel: createSkillLevelCosts(2, 5),
            effect: { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "kindergarten", valuePerLevel: "0.15", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" },
            unlockCondition: { type: "allSkillsInTierLevel", tier: 1, level: 1 }
        },
        elementaryEfficiency: {
            id: 'elementaryEfficiency', tier: 2, name: "Primary Focus",
            description: "Increases Elementary School output by +15% per level and reduces their cost by 2% per level.",
            maxLevel: 5, costPerLevel: createSkillLevelCosts(2, 5),
            effects: [
                { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "elementarySchool", valuePerLevel: "0.15", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" },
                { type: "COST_REDUCTION_MULTIPLIER", targetSystem: "studies_producers", targetId: "elementarySchool", valuePerLevel: "0.02", aggregation: "SUBTRACTIVE_FROM_BASE_FOR_MULTIPLIER" }
            ],
            unlockCondition: { type: "skillLevel", skillId: "kindergartenBoost", level: 1 }
        },

        // --- Tier 3: Secondary Education Expansion (3 Skills) ---
        middleSchoolMastery: {
            id: 'middleSchoolMastery', tier: 3, name: "Middle Ground",
            description: "Boosts Middle School output by +20% per level.",
            maxLevel: 4, costPerLevel: createSkillLevelCosts(3, 4),
            effect: { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "middleSchool", valuePerLevel: "0.20", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" },
            unlockCondition: { type: "allSkillsInTierLevel", tier: 2, level: 1 }
        },
        highSchoolAdvantage: {
            id: 'highSchoolAdvantage', tier: 3, name: "Higher Grades",
            description: "Boosts High School output by +20% per level.",
            maxLevel: 4, costPerLevel: createSkillLevelCosts(3, 4),
            effect: { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "highSchool", valuePerLevel: "0.20", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" },
            unlockCondition: { type: "skillLevel", skillId: "middleSchoolMastery", level: 1 }
        },
        studyPointsSurge1: {
            id: 'studyPointsSurge1', tier: 3, name: "Academic Momentum",
            description: "Increases global Study Point production by +5% per level.",
            maxLevel: 4, costPerLevel: createSkillLevelCosts(3, 4),
            effect: { type: "MULTIPLIER", targetSystem: "global_resource_production", targetId: "studyPoints", valuePerLevel: "0.05", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" },
            unlockCondition: { type: "skillLevel", skillId: "highSchoolAdvantage", level: 1 }
        },

        // --- Tier 4: University & Knowledge Focus (2 Skills) ---
        universityExcellence: {
            id: 'universityExcellence', tier: 4, name: "University Prestige",
            description: "Boosts University output by +25% per level and Professor (Knowledge) output by +10% per level.",
            maxLevel: 3, costPerLevel: createSkillLevelCosts(4, 3),
            effects: [
                 { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "university", valuePerLevel: "0.25", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" },
                 { type: "MULTIPLIER", targetSystem: "studies_producers_knowledge", targetId: "professor", valuePerLevel: "0.10", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" } // Assuming professor reward logic uses targetSystem "studies_producers_knowledge"
            ],
            unlockCondition: { type: "allSkillsInTierLevel", tier: 3, level: 1 }
        },
        knowledgeHoard: {
            id: 'knowledgeHoard', tier: 4, name: "Knowledge Accumulation",
            description: "Increases global Knowledge production by +10% per level.",
            maxLevel: 3, costPerLevel: createSkillLevelCosts(4, 3),
            effect: { type: "MULTIPLIER", targetSystem: "global_resource_production", targetId: "knowledge", valuePerLevel: "0.10", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" },
            unlockCondition: { type: "skillLevel", skillId: "universityExcellence", level: 1 }
        },

        // --- Tier 5: Broad Spectrum Enhancements (2 Skills) ---
        lowerTierBoost: {
            id: 'lowerTierBoost', tier: 5, name: "Foundational Support",
            description: "Boosts Student, Classroom, and Kindergarten output by +30% per level.",
            maxLevel: 3, costPerLevel: createSkillLevelCosts(5, 3),
            effects: [
                 { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "student", valuePerLevel: "0.30", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" },
                 { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "classroom", valuePerLevel: "0.30", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" },
                 { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "kindergarten", valuePerLevel: "0.30", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" }
            ],
            unlockCondition: { type: "allSkillsInTierLevel", tier: 4, level: 1 }
        },
        overallCostReduction: {
            id: 'overallCostReduction', tier: 5, name: "Economic Efficiency",
            description: "Reduces cost of ALL Study producers by 2% per level.",
            maxLevel: 3, costPerLevel: createSkillLevelCosts(5, 3),
            effect: { type: "COST_REDUCTION_MULTIPLIER", targetSystem: "studies_producers", targetId: "ALL", valuePerLevel: "0.02", aggregation: "SUBTRACTIVE_FROM_BASE_FOR_MULTIPLIER" }, // Target ALL producers
            unlockCondition: { type: "skillLevel", skillId: "lowerTierBoost", level: 1 }
        },

        // --- Tier 6: Advanced Synergies (1 Skill) ---
        synergisticStudies: {
            id: 'synergisticStudies', tier: 6, name: "Synergistic Studies",
            description: "All Study producers (Student to University) gain +50% production. Professor output +25%.",
            maxLevel: 2, costPerLevel: createSkillLevelCosts(6, 2),
            effects: [
                { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "student", valuePerLevel: "0.50", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" },
                { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "classroom", valuePerLevel: "0.50", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" },
                { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "kindergarten", valuePerLevel: "0.50", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" },
                { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "elementarySchool", valuePerLevel: "0.50", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" },
                { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "middleSchool", valuePerLevel: "0.50", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" },
                { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "highSchool", valuePerLevel: "0.50", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" },
                { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "university", valuePerLevel: "0.50", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" },
                { type: "MULTIPLIER", targetSystem: "studies_producers_knowledge", targetId: "professor", valuePerLevel: "0.25", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" }
            ],
            unlockCondition: { type: "allSkillsInTierLevel", tier: 5, level: 1 }
        },
        
        // --- Tier 7: Peak Efficiency (1 Skill) ---
        peakStudyEfficiency: {
            id: 'peakStudyEfficiency', tier: 7, name: "Peak Study Efficiency",
            description: "Massively boosts global Study Point production by +100% per level.",
            maxLevel: 1, costPerLevel: createSkillLevelCosts(7,1),
            effect: { type: "MULTIPLIER", targetSystem: "global_resource_production", targetId: "studyPoints", valuePerLevel: "1.00", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" },
            unlockCondition: { type: "allSkillsInTierLevel", tier: 6, level: 1 }
        },

        // --- Tier 8: Ultimate Knowledge (1 Skill) ---
        ultimateKnowledgeSynthesis: {
            id: 'ultimateKnowledgeSynthesis', tier: 8, name: "Ultimate Knowledge Synthesis",
            description: "Dramatically increases global Knowledge production by +200% per level.",
            maxLevel: 1, costPerLevel: createSkillLevelCosts(8,1),
            effect: { type: "MULTIPLIER", targetSystem: "global_resource_production", targetId: "knowledge", valuePerLevel: "2.00", aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" },
            unlockCondition: { type: "allSkillsInTierLevel", tier: 7, level: 1 }
        },
        // Total skills: 2+2+3+2+2+1+1+1 = 14 skills
    },
    ui: {
        skillsTabLabel: "Skills",
        skillPointDisplayLabel: "Study Skill Points Available:"
    },
    tierUnlockMessage: (tier) => `Unlock Tier ${tier} by leveling all skills in Tier ${tier - 1} to at least level 1.`
};
