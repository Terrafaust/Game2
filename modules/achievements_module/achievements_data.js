// modules/achievements_module/achievements_data.js (v2 - Expanded)

/**
 * @file achievements_data.js
 * @description Static data definitions for the Achievements module.
 * v2: Significantly expanded list of achievements.
 */

const producerAchTierCounts = [10, 25, 50, 100, 250, 500, 750, 1000, 1500, 2500];
const producerAchTierRewards = [0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.10, 0.12, 0.15]; // Example: +2% to +15%

const resourceAchTierCounts = {
    studyPoints: ["1e3", "1e4", "1e5", "1e6", "1e7", "1e8", "1e9", "1e10", "1e12", "1e15"],
    knowledge:   ["1e1", "1e2", "1e3", "1e4", "1e5", "1e6", "1e7", "1e8", "1e9", "1e10"]
};
const resourceAchTierRewards = [0.01, 0.01, 0.01, 0.02, 0.02, 0.02, 0.03, 0.03, 0.04, 0.05]; // +1% to +5% global for that resource

const clickAchTierCounts = [10, 50, 100, 500, 1000, 5000, 10000, 25000, 50000, 100000];
const clickAchTierRewards = [0.05, 0.07, 0.10, 0.12, 0.15, 0.18, 0.20, 0.22, 0.25, 0.30]; // +5% to +30% manual click power

const createProducerAchievements = (producerId, producerName, icon, targetSystemSuffix = "") => {
    let achievements = {};
    producerAchTierCounts.forEach((count, index) => {
        const achId = `${producerId}_ach_${index + 1}`;
        achievements[achId] = {
            id: achId,
            name: `${producerName} Enthusiast ${index + 1}`,
            description: `Own ${count.toLocaleString()} ${producerName}${count > 1 ? 's' : ''}.`,
            icon: icon,
            condition: { type: "producerOwned", moduleId: "studies", producerId: producerId, count: count },
            reward: {
                type: "MULTIPLIER",
                targetSystem: `studies_producers${targetSystemSuffix}`,
                targetId: producerId,
                value: producerAchTierRewards[index].toString(),
                description: `+${producerAchTierRewards[index] * 100}% ${producerName} Production`
            }
        };
    });
    return achievements;
};

const createResourceAchievements = (resourceId, resourceName, icon) => {
    let achievements = {};
    const counts = resourceAchTierCounts[resourceId];
    counts.forEach((countStr, index) => {
        const achId = `${resourceId}_ach_${index + 1}`;
        achievements[achId] = {
            id: achId,
            name: `${resourceName} Hoarder ${index + 1}`,
            description: `Accumulate ${parseFloat(countStr).toLocaleString()} ${resourceName}.`,
            icon: icon,
            condition: { type: "resourceAmount", resourceId: resourceId, amount: countStr },
            reward: {
                type: "MULTIPLIER",
                targetSystem: `global_resource_production`,
                targetId: resourceId,
                value: resourceAchTierRewards[index].toString(),
                description: `+${resourceAchTierRewards[index] * 100}% Global ${resourceName} Production`
            }
        };
    });
    return achievements;
};

const createClickAchievements = () => {
    let achievements = {};
    clickAchTierCounts.forEach((count, index) => {
        const achId = `click_ach_${index + 1}`;
        achievements[achId] = {
            id: achId,
            name: `Click Power ${index + 1}`,
            description: `Perform ${count.toLocaleString()} manual studies.`,
            icon: "🖱️",
            condition: { type: "totalClicks", moduleId: "core_gameplay", count: count },
            reward: {
                type: "MULTIPLIER",
                targetSystem: "core_gameplay_click", // Specific target system for click bonuses
                targetId: "studyPoints", // Assuming clicks grant studyPoints
                value: clickAchTierRewards[index].toString(),
                description: `+${clickAchTierRewards[index] * 100}% Manual Study Output`
            }
        };
    });
    return achievements;
};


export const staticModuleData = {
    achievements: {
        ...createClickAchievements(),

        ...createProducerAchievements("student", "Student", "🧑‍🎓"),
        ...createProducerAchievements("classroom", "Classroom", "🏫"),
        ...createProducerAchievements("kindergarten", "Kindergarten", "🧸"),
        ...createProducerAchievements("elementarySchool", "Elementary School", "📚"),
        ...createProducerAchievements("middleSchool", "Middle School", "🔬"),
        ...createProducerAchievements("highSchool", "High School", "🎓"),
        ...createProducerAchievements("university", "University", "🏛️"),
        ...createProducerAchievements("professor", "Professor", "👨‍🏫", "_knowledge"), // Special target for Professor reward if it specifically boosts Knowledge prod

        ...createResourceAchievements("studyPoints", "Study Points", "💰"),
        ...createResourceAchievements("knowledge", "Knowledge", "💡"),

        // --- Skill Milestones (using existing skill definitions from skills_data.js) ---
        // Assuming skills_data.js has: basicLearning, efficientNoteTaking, pedagogicalMethods, curriculumOptimization
        skillTier1Unlocked: {
            id: 'skillTier1Unlocked', name: "Skill Dabbler", description: "Unlock Skill Tier 1.", icon: "🛠️",
            condition: { type: "skillTierUnlocked", moduleId: "skills", tier: 1 },
            reward: { type: "RESOURCE_GAIN", resourceId: "studySkillPoints", amount: "1", description: "+1 Study Skill Point (One time)" }
        },
        skillTier2Unlocked: {
            id: 'skillTier2Unlocked', name: "Aspiring Scholar", description: "Unlock Skill Tier 2.", icon: "🛠️",
            condition: { type: "skillTierUnlocked", moduleId: "skills", tier: 2 },
            reward: { type: "RESOURCE_GAIN", resourceId: "studySkillPoints", amount: "2", description: "+2 Study Skill Points (One time)" }
        },
         skillTier3Unlocked: { // Assuming up to 3 tiers for now
            id: 'skillTier3Unlocked', name: "Skilled Tactician", description: "Unlock Skill Tier 3.", icon: "🛠️",
            condition: { type: "skillTierUnlocked", moduleId: "skills", tier: 3 },
            reward: { type: "RESOURCE_GAIN", resourceId: "studySkillPoints", amount: "3", description: "+3 Study Skill Points (One time)" }
        },

        skill_basicLearning_max: {
            id: 'skill_basicLearning_max', name: "Master of Basics", description: "Max out the 'Basic Learning Techniques' skill.", icon: "🌟",
            condition: { type: "skillMaxLevel", moduleId: "skills", skillId: "basicLearning" },
            reward: { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "student", value: "0.25", description: "Further +25% Student Production" }
        },
        skill_efficientNoteTaking_max: {
            id: 'skill_efficientNoteTaking_max', name: "Cost Cutter Supreme", description: "Max out 'Efficient Note-Taking'.", icon: "📉",
            condition: { type: "skillMaxLevel", moduleId: "skills", skillId: "efficientNoteTaking" },
            reward: { type: "COST_REDUCTION_MULTIPLIER", targetSystem: "studies_producers", targetId: "classroom", value: "0.10", description: "Further -10% Classroom Cost" } // Note: value is reduction, e.g., 0.1 for 10% off
        },
        skill_pedagogicalMethods_max: {
            id: 'skill_pedagogicalMethods_max', name: "Teaching Guru", description: "Max out 'Advanced Pedagogical Methods'.", icon: "👨‍🏫✨",
            condition: { type: "skillMaxLevel", moduleId: "skills", skillId: "pedagogicalMethods" },
            reward: { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "kindergarten", value: "0.20", description: "Further +20% Kindergarten & Elementary Prod." } // Example: apply to one or make it global
        },
        skill_curriculumOptimization_max: {
            id: 'skill_curriculumOptimization_max', name: "Syllabus Saint", description: "Max out 'Curriculum Optimization'.", icon: "📜✨",
            condition: { type: "skillMaxLevel", moduleId: "skills", skillId: "curriculumOptimization" },
            reward: { type: "MULTIPLIER", targetSystem: "global_resource_production", targetId: "studyPoints", value: "0.10", description: "Further +10% Global SP Production" }
        },
    },

    ui: {
        achievementsTabLabel: "Achievements",
        completedText: "Completed!",
        lockedText: "Locked"
    }
};
