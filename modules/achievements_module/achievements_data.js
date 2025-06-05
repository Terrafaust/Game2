// modules/achievements_module/achievements_data.js (v3 - Skill Achievement Expansion)

/**
 * @file achievements_data.js
 * @description Static data definitions for the Achievements module.
 * v3: Fully expanded skill achievements and SSP achievements.
 */

const producerAchTierCounts = [10, 25, 50, 100, 250, 500, 750, 1000, 1500, 2500];
const producerAchTierRewards = [0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.10, 0.12, 0.15];

const resourceAchTierCounts = {
    studyPoints: ["1e3", "1e4", "1e5", "1e6", "1e7", "1e8", "1e9", "1e10", "1e11", "1e12","1e13", "1e14", "1e15"],
    knowledge:   ["1e1", "1e2", "1e3", "1e4", "1e5", "1e6", "1e7", "1e8", "1e9", "1e10","1e11", "1e12","1e13"]
};
const resourceAchTierRewards = [0.01, 0.01, 0.01, 0.02, 0.02, 0.02, 0.03, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08];

const clickAchTierCounts = [10, 50, 100, 500, 1000, 5000, 10000, 25000, 50000, 100000];
const clickAchTierRewards = [0.50, 0.70, 1.00, 1.20, 1.50, 1.80, 2.00, 2.20, 2.50, 3.00];

// New: Study Skill Points achievements
const sspAchTierCounts = [1, 5, 10, 20, 30, 40, 50, 75, 100, 125, 150, 200, 250, 300];
const sspAchTierRewards = [ // Example: Small global SP boosts or one-time SSP
    { type: "MULTIPLIER", targetSystem: "global_resource_production", targetId: "studyPoints", value: "0.015" }, // +1.5% SP
    { type: "RESOURCE_GAIN", resourceId: "studySkillPoints", amount: "2" }, // +2 SSP
    { type: "MULTIPLIER", targetSystem: "global_resource_production", targetId: "studyPoints", value: "0.015" },
    { type: "RESOURCE_GAIN", resourceId: "studySkillPoints", amount: "2" },
    { type: "MULTIPLIER", targetSystem: "global_resource_production", targetId: "studyPoints", value: "0.020" },  // +2% SP
    { type: "RESOURCE_GAIN", resourceId: "studySkillPoints", amount: "3" },
    { type: "MULTIPLIER", targetSystem: "global_resource_production", targetId: "studyPoints", value: "0.020" },
    { type: "RESOURCE_GAIN", resourceId: "studySkillPoints", amount: "3" },
    { type: "MULTIPLIER", targetSystem: "global_resource_production", targetId: "studyPoints", value: "0.035" }, // +3.5% SP
    { type: "RESOURCE_GAIN", resourceId: "studySkillPoints", amount: "4" },
    { type: "MULTIPLIER", targetSystem: "global_resource_production", targetId: "studyPoints", value: "0.035" },
    { type: "RESOURCE_GAIN", resourceId: "studySkillPoints", amount: "4" },
    { type: "MULTIPLIER", targetSystem: "global_resource_production", targetId: "studyPoints", value: "0.050" },  // +5% SP
    { type: "RESOURCE_GAIN", resourceId: "studySkillPoints", amount: "6" },
];


const createProducerAchievements = (producerId, producerName, icon, targetSystemSuffix = "") => {
    let achievements = {};
    producerAchTierCounts.forEach((count, index) => {
        const achId = `${producerId}_ach_${index + 1}`;
        achievements[achId] = {
            id: achId, name: `${producerName} Aficionado ${index + 1}`,
            description: `Own ${count.toLocaleString()} ${producerName}${count > 1 ? 's' : ''}.`, icon: icon,
            condition: { type: "producerOwned", moduleId: "studies", producerId: producerId, count: count },
            reward: { type: "MULTIPLIER", targetSystem: `studies_producers${targetSystemSuffix}`, targetId: producerId, value: producerAchTierRewards[index].toString(), description: `+${producerAchTierRewards[index] * 100}% ${producerName} Prod.` }
        };
    });
    return achievements;
};

const createResourceAchievements = (resourceId, resourceName, icon, customCounts = null, customRewards = null) => {
    let achievements = {};
    const counts = customCounts || resourceAchTierCounts[resourceId];
    const rewards = customRewards || resourceAchTierRewards; // Use generic resource rewards if no custom provided

    counts.forEach((countStr, index) => {
        const achId = `${resourceId}_ach_${index + 1}`;
        const rewardValue = rewards[index];
        let rewardData;

        if (typeof rewardValue === 'object' && rewardValue.type === "RESOURCE_GAIN") {
            rewardData = { 
                type: "RESOURCE_GAIN", 
                resourceId: rewardValue.resourceId, 
                amount: rewardValue.amount, 
                description: `+${rewardValue.amount} ${rewardValue.resourceId === 'studySkillPoints' ? 'SSP' : rewardValue.resourceId}`
            };
        } else { // Assume multiplier
            const val = typeof rewardValue === 'object' ? rewardValue.value : rewardValue;
            rewardData = { 
                type: "MULTIPLIER", 
                targetSystem: `global_resource_production`, 
                targetId: resourceId, 
                value: val.toString(), 
                description: `+${parseFloat(val) * 100}% Global ${resourceName} Prod.`
            };
             if (resourceId === 'studySkillPoints') { // Special case for SSP reward descriptions
                rewardData.description = `+${parseFloat(val) * 100}% Global SP Prod.`; // SSP achievements boost SP
            }
        }
        
        achievements[achId] = {
            id: achId, name: `${resourceName} Collector ${index + 1}`,
            description: `Accumulate ${parseFloat(countStr).toLocaleString()} ${resourceName}.`, icon: icon,
            condition: { type: "resourceAmount", resourceId: resourceId, amount: countStr },
            reward: rewardData
        };
    });
    return achievements;
};


const createClickAchievements = () => { /* ... same as before ... */ 
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
                targetSystem: "core_gameplay_click", 
                targetId: "studyPoints", 
                value: clickAchTierRewards[index].toString(),
                description: `+${clickAchTierRewards[index] * 100}% Manual Study Output`
            }
        };
    });
    return achievements;
};

// Skill related achievements - defined explicitly based on the new skill tree
const skillTierAchievements = {};
for (let i = 1; i <= 8; i++) {
    skillTierAchievements[`skillTier${i}Unlocked`] = {
        id: `skillTier${i}Unlocked`, name: `Adept Learner - Tier ${i}`,
        description: `Unlock Skill Tier ${i}.`, icon: "🛠️",
        condition: { type: "skillTierUnlocked", moduleId: "skills", tier: i },
        reward: { type: "RESOURCE_GAIN", resourceId: "studySkillPoints", amount: i.toString(), description: `+${i} Study Skill Point${i > 1 ? 's' : ''} (One time)` }
    };
}

// Get skill IDs from the expanded skills_data.js (this is illustrative, actual IDs need to be used)
// We'll use the actual IDs from the new skills_data.js:
const expandedSkillIds = [
    'basicLearning', 'efficientNoteTaking', 'kindergartenBoost', 'elementaryEfficiency',
    'middleSchoolMastery', 'highSchoolAdvantage', 'studyPointsSurge1', 'universityExcellence',
    'knowledgeHoard', 'lowerTierBoost', 'overallCostReduction', 'synergisticStudies',
    'peakStudyEfficiency', 'ultimateKnowledgeSynthesis'
];

const skillMaxedAchievements = {};
expandedSkillIds.forEach(skillId => {
    // We need the skill name and a generic reward.
    // This part needs skills_data.js to be accessible or skill names to be hardcoded/passed.
    // For now, using a generic name:
    const skillName = skillId.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()); // Simple name formatter
    skillMaxedAchievements[`skill_${skillId}_max`] = {
        id: `skill_${skillId}_max`, name: `Master of ${skillName}`,
        description: `Max out the '${skillName}' skill.`, icon: "🌟",
        condition: { type: "skillMaxLevel", moduleId: "skills", skillId: skillId },
        // Example reward: small global boost or specific boost if applicable
        reward: { type: "MULTIPLIER", targetSystem: "global_resource_production", targetId: "studyPoints", value: "0.01", description: "+1% Global SP Production" }
    };
});


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
        ...createProducerAchievements("professor", "Professor", "👨‍🏫", "_knowledge"),

        ...createResourceAchievements("studyPoints", "Study Points", "💰"),
        ...createResourceAchievements("knowledge", "Knowledge", "💡"),
        ...createResourceAchievements("studySkillPoints", "Study Skill Points", "🧠", sspAchTierCounts, sspAchTierRewards),

        ...skillTierAchievements,
        ...skillMaxedAchievements,
    },
    ui: {
        achievementsTabLabel: "Achievements",
        completedText: "Completed!",
        lockedText: "Locked"
    }
};
