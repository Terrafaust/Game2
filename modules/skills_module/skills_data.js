// modules/skills_module/skills_data.js 

/**
 * @file skills_data.js
 * @description Static data definitions for the Skills module.
 * Defines the "Study Skills" tree, including each skill's levels, costs,
 * and effects (e.g., production multipliers, cost reductions for Studies structures).
 * All numerical values that can grow large are represented as strings to be
 * converted to Decimal objects by the consuming system.
 */

export const staticModuleData = {
    // Definition for the 'Study Skill Points' resource (already defined in Commerce, but referenced here)
    resourceId: "studySkillPoints",

    // Definitions for various Study Skills
    skills: {
        // Tier 1 Skills
        focusedStudy: {
            id: 'focusedStudy',
            name: "Focused Study",
            description: "Increases Study Point production from Students.",
            tier: 1,
            maxLevel: 10,
            costResource: "studySkillPoints",
            baseCost: "1", // Initial cost per level
            costGrowthFactor: "1.1", // Cost increases per level
            effect: {
                type: "productionMultiplier",
                targetType: "producer",
                targetId: "student",
                baseValue: "0.05", // +5% per level (e.g., 1.05, 1.10, 1.15...)
                // Total multiplier for a skill at level N will be (1 + baseValue * N)
            },
            ui: {
                costText: (cost) => `Cost: ${cost} SSP`,
                effectText: (level, effectValue) => `+${decimalUtility.format(decimalUtility.multiply(effectValue, 100), 0)}% Student SP production.`,
                nextLevelText: (nextEffectValue) => `Next Level: +${decimalUtility.format(decimalUtility.multiply(nextEffectValue, 100), 0)}% Student SP production.`
            }
        },
        efficientLearning: {
            id: 'efficientLearning',
            name: "Efficient Learning",
            description: "Reduces the cost of Classrooms.",
            tier: 1,
            maxLevel: 5,
            costResource: "studySkillPoints",
            baseCost: "2",
            costGrowthFactor: "1.2",
            effect: {
                type: "costReduction",
                targetType: "producer",
                targetId: "classroom",
                baseValue: "0.02", // -2% cost per level (e.g., 0.98, 0.96...)
                // Total reduction for a skill at level N will be (1 - baseValue * N)
            },
            ui: {
                costText: (cost) => `Cost: ${cost} SSP`,
                effectText: (level, effectValue) => `-${decimalUtility.format(decimalUtility.multiply(effectValue, 100), 0)}% Classroom cost.`,
                nextLevelText: (nextEffectValue) => `Next Level: -${decimalUtility.format(decimalUtility.multiply(nextEffectValue, 100), 0)}% Classroom cost.`
            }
        },
        // Add more skills for Tier 1, 2, 3, etc. as per roadmap (approx. 15 skills)
        // Example for Tier 2 (unlocked when all Tier 1 skills are level 1)
        advancedCurriculum: {
            id: 'advancedCurriculum',
            name: "Advanced Curriculum",
            description: "Significantly boosts production from Kindergartens.",
            tier: 2,
            maxLevel: 5,
            costResource: "studySkillPoints",
            baseCost: "10",
            costGrowthFactor: "1.3",
            unlockCondition: {
                type: "allSkillsAtLevel",
                tier: 1,
                level: 1
            },
            effect: {
                type: "productionMultiplier",
                targetType: "producer",
                targetId: "kindergarten",
                baseValue: "0.1", // +10% per level
            },
            ui: {
                costText: (cost) => `Cost: ${cost} SSP`,
                effectText: (level, effectValue) => `+${decimalUtility.format(decimalUtility.multiply(effectValue, 100), 0)}% Kindergarten SP production.`,
                nextLevelText: (nextEffectValue) => `Next Level: +${decimalUtility.format(decimalUtility.multiply(nextEffectValue, 100), 0)}% Kindergarten SP production.`
            }
        },
        // Placeholder for more skills...
        // researchMethodology: { ... tier 2 ... },
        // academicNetworking: { ... tier 3 ... },
        // knowledgeSynthesis: { ... tier 3 ... },
    },

    ui: {
        skillsTabLabel: "Skills",
        skillsTabUnlockCondition: {
            type: "resource",
            resourceId: "studySkillPoints",
            amount: "1" // Unlocked after acquiring the first Study Skill Point
        }
    }
};
