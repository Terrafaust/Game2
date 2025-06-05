// modules/achievements_module/achievements_data.js (v3.1 - Modify Tier 1 Reward)

/**
 * @file achievements_data.js
 * @description Static data definitions for the Achievements module.
 * v3.1: Changed reward for 'skillTier1Unlocked' to not grant SSP.
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

const sspAchTierCounts = [1, 5, 10, 20, 30, 40, 50, 75, 100, 125, 150, 200, 250, 300];
const sspAchTierRewards = [ 
    { type: "MULTIPLIER", targetSystem: "global_resource_production", targetId: "studyPoints", value: "0.015" }, 
    { type: "RESOURCE_GAIN", resourceId: "studySkillPoints", amount: "2" }, 
    { type: "MULTIPLIER", targetSystem: "global_resource_production", targetId: "studyPoints", value: "0.015" },
    { type: "RESOURCE_GAIN", resourceId: "studySkillPoints", amount: "2" },
    { type: "MULTIPLIER", targetSystem: "global_resource_production", targetId: "studyPoints", value: "0.020" },  
    { type: "RESOURCE_GAIN", resourceId: "studySkillPoints", amount: "3" },
    { type: "MULTIPLIER", targetSystem: "global_resource_production", targetId: "studyPoints", value: "0.020" },
    { type: "RESOURCE_GAIN", resourceId: "studySkillPoints", amount: "3" },
    { type: "MULTIPLIER", targetSystem: "global_resource_production", targetId: "studyPoints", value: "0.035" }, 
    { type: "RESOURCE_GAIN", resourceId: "studySkillPoints", amount: "4" },
    { type: "MULTIPLIER", targetSystem: "global_resource_production", targetId: "studyPoints", value: "0.035" },
    { type: "RESOURCE_GAIN", resourceId: "studySkillPoints", amount: "4" },
    { type: "MULTIPLIER", targetSystem: "global_resource_production", targetId: "studyPoints", value: "0.050" },  
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
    const rewards = customRewards || resourceAchTierRewards; 

    counts.forEach((countStr, index) => {
        const achId = `${resourceId}_ach_${index + 1}`;
        const rewardValue = rewards[index]; // This can be a number (multiplier) or an object (specific reward)
        let rewardData;

        if (typeof rewardValue === 'object' && rewardValue.type === "RESOURCE_GAIN") {
            rewardData = { 
                type: "RESOURCE_GAIN", 
                resourceId: rewardValue.resourceId, 
                amount: rewardValue.amount, 
                description: `+${rewardValue.amount} ${rewardValue.resourceId === 'studySkillPoints' ? 'SSP' : rewardValue.resourceId}`
            };
        } else { 
            const valStr = (typeof rewardValue === 'object' && rewardValue.value) ? rewardValue.value : rewardValue.toString();
            const valNum = parseFloat(valStr);
            rewardData = { 
                type: "MULTIPLIER", 
                targetSystem: `global_resource_production`, 
                targetId: resourceId, 
                value: valStr, 
                description: `+${valNum * 100}% Global ${resourceName} Prod.`
            };
             if (resourceId === 'studySkillPoints' && rewardData.type === "MULTIPLIER") { 
                rewardData.description = `+${valNum * 100}% Global SP Prod.`; // SSP achievements boost SP by default
                rewardData.targetId = "studyPoints"; // Ensure it targets studyPoints if it's a multiplier from an SSP achievement
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
                targetSystem: "core_gameplay_click", 
                targetId: "studyPoints", 
                value: clickAchTierRewards[index].toString(),
                description: `+${clickAchTierRewards[index] * 100}% Manual Study Output`
            }
        };
    });
    return achievements;
};

const skillTierAchievements = {};
for (let i = 1; i <= 8; i++) {
    let rewardData;
    if (i === 1) { // Tier 1 achievement modified
        rewardData = { 
            type: "MULTIPLIER", 
            targetSystem: "global_resource_production", 
            targetId: "studyPoints", 
            value: "0.005", // +0.5% Global SP Production (very small, one-time effect application)
            description: "+0.5% Global SP Production (One time)" 
        };
    } else { // Tiers 2-8 still grant SSP
        rewardData = { 
            type: "RESOURCE_GAIN", 
            resourceId: "studySkillPoints", 
            amount: i.toString(), // Grant SSP equal to tier number for Tiers 2+
            description: `+${i} Study Skill Point${i > 1 ? 's' : ''} (One time)` 
        };
    }

    skillTierAchievements[`skillTier${i}Unlocked`] = {
        id: `skillTier${i}Unlocked`, name: `Adept Learner - Tier ${i}`,
        description: `Unlock Skill Tier ${i}.`, icon: "🛠️",
        condition: { type: "skillTierUnlocked", moduleId: "skills", tier: i },
        reward: rewardData
    };
}

const expandedSkillIds = [
    'basicLearning', 'efficientNoteTaking', 'kindergartenBoost', 'elementaryEfficiency',
    'middleSchoolMastery', 'highSchoolAdvantage', 'studyPointsSurge1', 'universityExcellence',
    'knowledgeHoard', 'lowerTierBoost', 'overallCostReduction', 'synergisticStudies',
    'peakStudyEfficiency', 'ultimateKnowledgeSynthesis'
];

const skillMaxedAchievements = {};
expandedSkillIds.forEach(skillId => {
    const skillName = skillId.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()); 
    skillMaxedAchievements[`skill_${skillId}_max`] = {
        id: `skill_${skillId}_max`, name: `Master of ${skillName}`,
        description: `Max out the '${skillName}' skill.`, icon: "🌟",
        condition: { type: "skillMaxLevel", moduleId: "skills", skillId: skillId },
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
