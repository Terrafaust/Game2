// modules/skills_module/skills_data.js (v1)

/**
 * @file skills_data.js
 * @description Static data definitions for the Skills module.
 * Defines skills, their tiers, costs, effects, and unlock conditions.
 */

export const staticModuleData = {
    // Resource used to purchase skills (defined by Market module)
    skillPointResourceId: 'studySkillPoints',

    skills: {
        // --- Tier 1: Basic Study Enhancements ---
        basicLearning: {
            id: 'basicLearning',
            tier: 1,
            name: "Basic Learning Techniques",
            description: "Improves the output of all Students by +10% per level.",
            maxLevel: 5,
            costPerLevel: ["1", "2", "3", "4", "5"], // Cost in Study Skill Points for each level
            effect: {
                type: "MULTIPLIER", // 'MULTIPLIER' or 'COST_REDUCTION_MULTIPLIER', etc.
                targetSystem: "studies_producers", // System to target (e.g., 'studies_producers')
                targetId: "student", // Specific producer ID, or 'ALL_STUDY_POINTS_PRODUCERS' or null for global
                valuePerLevel: "0.10", // 10% bonus, so multiplier is 1 + (level * 0.10)
                aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER" // How multiple levels contribute to the effect valueProvider
            },
            unlockCondition: null // No specific unlock for the first skill in tier 1
        },
        efficientNoteTaking: {
            id: 'efficientNoteTaking',
            tier: 1,
            name: "Efficient Note-Taking",
            description: "Reduces the cost of Classrooms by 5% per level.",
            maxLevel: 4,
            costPerLevel: ["1", "2", "3", "4"],
            effect: {
                type: "COST_REDUCTION_MULTIPLIER",
                targetSystem: "studies_producers",
                targetId: "classroom",
                valuePerLevel: "0.05", // 5% cost reduction, so multiplier is 1 - (level * 0.05)
                aggregation: "SUBTRACTIVE_FROM_BASE_FOR_MULTIPLIER"
            },
            unlockCondition: { type: "skillLevel", skillId: "basicLearning", level: 1 }
        },

        // --- Tier 2: Advanced Academic Boosts ---
        pedagogicalMethods: {
            id: 'pedagogicalMethods',
            tier: 2,
            name: "Advanced Pedagogical Methods",
            description: "Increases output of Kindergartens and Elementary Schools by +15% per level.",
            maxLevel: 3,
            costPerLevel: ["5", "10", "15"],
            effects: [ // This skill affects multiple targets
                {
                    type: "MULTIPLIER",
                    targetSystem: "studies_producers",
                    targetId: "kindergarten",
                    valuePerLevel: "0.15",
                    aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER"
                },
                {
                    type: "MULTIPLIER",
                    targetSystem: "studies_producers",
                    targetId: "elementarySchool",
                    valuePerLevel: "0.15",
                    aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER"
                }
            ],
            unlockCondition: { type: "allSkillsInTierLevel", tier: 1, level: 1 }
        },
        curriculumOptimization: {
            id: 'curriculumOptimization',
            tier: 2,
            name: "Curriculum Optimization",
            description: "Boosts global Study Point production by +5% per level.",
            maxLevel: 5,
            costPerLevel: ["3", "6", "9", "12", "15"],
            effect: {
                type: "MULTIPLIER",
                targetSystem: "global_resource_production",
                targetId: "studyPoints", // Target specific resource globally
                valuePerLevel: "0.05",
                aggregation: "ADDITIVE_TO_BASE_FOR_MULTIPLIER"
            },
            unlockCondition: { type: "skillLevel", skillId: "pedagogicalMethods", level: 1 }
        },
        // Add approx. 10 more skills across 3-4 tiers as per roadmap
        // For now, these provide a good base.
    },

    ui: {
        skillsTabLabel: "Skills",
        // Unlock condition for the Skills tab itself could be acquiring the first Study Skill Point.
        // This will be checked in the manifest.
        skillPointDisplayLabel: "Study Skill Points Available:"
    },

    tierUnlockMessage: (tier) => `Unlock Tier ${tier} by leveling all skills in Tier ${tier - 1} to at least level 1.`
};
