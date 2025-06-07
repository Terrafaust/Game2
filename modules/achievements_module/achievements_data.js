// modules/achievements_module/achievements_data.js (v4.1 - PP Terminology & PhD Icon Fix)

/**
 * @file achievements_data.js
 * @description Static data definitions for the Achievements module.
 * v4.1: Corrected 'AP' to 'PP' in total achievement milestones and fixed PhD icon.
 * v4.0: Adds massive number of achievements for Prestige producers and total completion.
 */

// --- Helper functions for generating achievement sets ---

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

// --- NEW IMAGE ACHIEVEMENTS ---
const createImageAchievements = () => {
    const achievements = {};
    const tiers = {
        1: { count: 1, reward: { type: "MULTIPLIER", targetSystem: "global_resource_production", targetId: "studyPoints", value: "0.01", description: "+1% Global SP Prod." } },
        2: { count: 100, reward: { type: "MULTIPLIER", targetSystem: "global_resource_production", targetId: "knowledge", value: "0.01", description: "+1% Global Knowledge Prod." } },
        3: { count: 500, reward: { type: "RESOURCE_GAIN", resourceId: "studySkillPoints", amount: "10", description: "+10 Free SSP." } },
        4: { count: 1000, reward: { type: "UNLOCK_FEATURE", flag: "prestigeUnlocked", description: "Unlocks the Prestige system." } },
        5: { count: 5000, reward: { type: "MULTIPLIER", targetSystem: "prestige_mechanics", targetId: "ppGain", value: "0.05", description: "+5% Prestige Point Gain." } },
        6: { count: 10000, reward: { type: "MULTIPLIER", targetSystem: "global_production", targetId: "all", value: "0.01", description: "+1% to ALL production." } }
    };

    for (const key in tiers) {
        const tier = tiers[key];
        const achId = `image_ach_${key}`;
        achievements[achId] = {
            id: achId,
            name: `Image Collector ${key}`,
            description: `Own a total of ${tier.count.toLocaleString()} Images.`,
            icon: "🖼️",
            condition: { type: "resourceAmount", resourceId: "images", amount: tier.count.toString() },
            reward: tier.reward
        };
    }
    return achievements;
};

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
        const rewardValue = rewards[index];
        let rewardData;
        if (typeof rewardValue === 'object' && rewardValue.type === "RESOURCE_GAIN") {
            rewardData = { type: "RESOURCE_GAIN", resourceId: rewardValue.resourceId, amount: rewardValue.amount, description: `+${rewardValue.amount} ${rewardValue.resourceId === 'studySkillPoints' ? 'SSP' : rewardValue.resourceId}` };
        } else { 
            const valStr = (typeof rewardValue === 'object' && rewardValue.value) ? rewardValue.value : rewardValue.toString();
            const valNum = parseFloat(valStr);
            rewardData = { type: "MULTIPLIER", targetSystem: `global_resource_production`, targetId: resourceId, value: valStr, description: `+${valNum * 100}% Global ${resourceName} Prod.` };
             if (resourceId === 'studySkillPoints' && rewardData.type === "MULTIPLIER") { 
                rewardData.description = `+${valNum * 100}% Global SP Prod.`;
                rewardData.targetId = "studyPoints";
            }
        }
        achievements[achId] = { id: achId, name: `${resourceName} Collector ${index + 1}`, description: `Accumulate ${parseFloat(countStr).toLocaleString()} ${resourceName}.`, icon: icon, condition: { type: "resourceAmount", resourceId: resourceId, amount: countStr }, reward: rewardData };
    });
    return achievements;
};

const createClickAchievements = () => { 
    let achievements = {};
    clickAchTierCounts.forEach((count, index) => {
        const achId = `click_ach_${index + 1}`;
        achievements[achId] = { id: achId, name: `Click Power ${index + 1}`, description: `Perform ${count.toLocaleString()} manual studies.`, icon: "🖱️", condition: { type: "totalClicks", moduleId: "core_gameplay", count: count }, reward: { type: "MULTIPLIER", targetSystem: "core_gameplay_click", targetId: "studyPoints", value: clickAchTierRewards[index].toString(), description: `+${clickAchTierRewards[index] * 100}% Manual Study Output` } };
    });
    return achievements;
};

const skillTierAchievements = {};
for (let i = 1; i <= 8; i++) {
    let rewardData;
    if (i === 1) {
        rewardData = { type: "MULTIPLIER", targetSystem: "global_resource_production", targetId: "studyPoints", value: "0.005", description: "+0.5% Global SP Production (One time)" };
    } else {
        rewardData = { type: "RESOURCE_GAIN", resourceId: "studySkillPoints", amount: i.toString(), description: `+${i} Study Skill Point${i > 1 ? 's' : ''} (One time)` };
    }
    skillTierAchievements[`skillTier${i}Unlocked`] = { id: `skillTier${i}Unlocked`, name: `Adept Learner - Tier ${i}`, description: `Unlock Skill Tier ${i}.`, icon: "🛠️", condition: { type: "skillTierUnlocked", moduleId: "skills", tier: i }, reward: rewardData };
}

const expandedSkillIds = [
    'basicLearning', 'efficientNoteTaking', 'kindergartenBoost', 'elementaryEfficiency', 'middleSchoolMastery', 'highSchoolAdvantage', 'studyPointsSurge1', 'universityExcellence', 'knowledgeHoard', 'lowerTierBoost', 'overallCostReduction', 'synergisticStudies', 'peakStudyEfficiency', 'ultimateKnowledgeSynthesis'
];

const skillMaxedAchievements = {};
expandedSkillIds.forEach(skillId => {
    const skillName = skillId.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()); 
    skillMaxedAchievements[`skill_${skillId}_max`] = { id: `skill_${skillId}_max`, name: `Master of ${skillName}`, description: `Max out the '${skillName}' skill.`, icon: "🌟", condition: { type: "skillMaxLevel", moduleId: "skills", skillId: skillId }, reward: { type: "MULTIPLIER", targetSystem: "global_resource_production", targetId: "studyPoints", value: "0.01", description: "+1% Global SP Production" } };
});

// --- NEW PRESTIGE ACHIEVEMENTS ---
const prestigeProducerAchCounts = [1, 5, 10, 25, 50, 75, 100, 150, 200, 250];
const prestigeProducerAchRewards = [0.05, 0.05, 0.05, 0.05, 0.05, 0.1, 0.1, 0.1, 0.1, 0.1]; // Flat 5% then 10% boost to self

const createPrestigeProducerAchievements = (producerId, producerName, icon) => {
    let achievements = {};
    prestigeProducerAchCounts.forEach((count, index) => {
        const achId = `prestige_${producerId}_ach_${index + 1}`;
        achievements[achId] = {
            id: achId, name: `${producerName} Holder ${index + 1}`,
            description: `Own ${count.toLocaleString()} ${producerName}${count > 1 ? 's' : ''}.`, icon: icon,
            condition: { type: "prestigeProducerOwned", moduleId: "prestige", producerId: producerId, count: count },
            reward: { type: "MULTIPLIER", targetSystem: `prestige_producers`, targetId: producerId, value: prestigeProducerAchRewards[index].toString(), description: `+${prestigeProducerAchRewards[index] * 100}% ${producerName} Prod.` }
        };
    });
    return achievements;
};

// --- NEW TOTAL ACHIEVEMENT MILESTONES ---
const totalAchievementMilestones = {
    ach_total_1:   { count: 1,   reward: { type: 'MULTIPLIER', targetSystem: 'core_gameplay_click', targetId: 'studyPoints', value: '0.10', description: "+10% Manual Click Power" } },
    ach_total_5:   { count: 5,   reward: { type: 'MULTIPLIER', targetSystem: 'global_resource_production', targetId: 'studyPoints', value: '0.05', description: "+5% Global SP Production" } },
    ach_total_10:  { count: 10,  reward: { type: 'RESOURCE_GAIN', resourceId: 'studySkillPoints', amount: '5', description: "+5 Free SSP" } },
    ach_total_15:  { count: 15,  reward: { type: 'MULTIPLIER', targetSystem: 'studies_producers', targetId: 'student', value: '0.25', description: "+25% Student Production" } },
    ach_total_20:  { count: 20,  reward: { type: 'MULTIPLIER', targetSystem: 'studies_producers', targetId: 'classroom', value: '0.25', description: "+25% Classroom Production" } },
    ach_total_25:  { count: 25,  reward: { type: 'MULTIPLIER', targetSystem: 'global_resource_production', targetId: 'knowledge', value: '0.10', description: "+10% Global Knowledge Production" } },
    ach_total_30:  { count: 30,  reward: { type: 'RESOURCE_GAIN', resourceId: 'studySkillPoints', amount: '10', description: "+10 Free SSP" } },
    ach_total_35:  { count: 35,  reward: { type: 'COST_REDUCTION_MULTIPLIER', targetSystem: 'studies_producers', targetId: 'ALL', value: '0.02', description: "-2% Cost for all Study Producers" } },
    ach_total_40:  { count: 40,  reward: { type: 'MULTIPLIER', targetSystem: 'studies_producers', targetId: 'university', value: '0.20', description: "+20% University Production" } },
    ach_total_45:  { count: 45,  reward: { type: 'MULTIPLIER', targetSystem: 'studies_producers_knowledge', targetId: 'professor', value: '0.20', description: "+20% Professor Production" } },
    ach_total_50:  { count: 50,  reward: { type: 'MULTIPLIER', targetSystem: 'global_production', targetId: 'all', value: '0.05', description: "+5% to ALL production (stacks with per-achievement bonus)" } },
    ach_total_60:  { count: 60,  reward: { type: 'RESOURCE_GAIN', resourceId: 'prestigePoints', amount: '100', description: "+100 Free Prestige Points" } },
    ach_total_70:  { count: 70,  reward: { type: 'MULTIPLIER', targetSystem: 'prestige_mechanics', targetId: 'ppGain', value: '0.10', description: "+10% Prestige Point Gain on Prestige" } },
    ach_total_80:  { count: 80,  reward: { type: 'COST_REDUCTION_MULTIPLIER', targetSystem: 'prestige_producers', targetId: 'ALL', value: '0.05', description: "-5% Cost for all Prestige Producers" } },
    ach_total_90:  { count: 90,  reward: { type: 'MULTIPLIER', targetSystem: 'prestige_producers', targetId: 'license', value: '0.20', description: "+20% License Production" } },
    ach_total_100: { count: 100, reward: { type: 'MULTIPLIER', targetSystem: 'global_production', targetId: 'all', value: '0.10', description: "+10% to ALL production (stacks)" } },
    ach_total_110: { count: 110, reward: { type: 'MULTIPLIER', targetSystem: 'prestige_producers', targetId: 'phd', value: '0.15', description: "+15% PhD Production" } },
    ach_total_120: { count: 120, reward: { type: 'RESOURCE_GAIN', resourceId: 'prestigePoints', amount: '1000', description: "+1000 Free Prestige Points" } },
    ach_total_130: { count: 130, reward: { type: 'MULTIPLIER', targetSystem: 'prestige_mechanics', targetId: 'prestigeBonus', value: '0.05', description: "Prestige Bonus Multiplier is 5% stronger" } },
    ach_total_140: { count: 140, reward: { type: 'MULTIPLIER', targetSystem: 'global_resource_production', targetId: 'knowledge', value: '0.50', description: "+50% Global Knowledge Production" } },
    ach_total_150: { count: 150, reward: { type: 'MULTIPLIER', targetSystem: 'global_resource_production', targetId: 'studyPoints', value: '0.50', description: "+50% Global SP Production" } },
    ach_total_160: { count: 160, reward: { type: 'MULTIPLIER', targetSystem: 'prestige_producers', targetId: 'postDoc', value: '0.10', description: "+10% Post-Doctorate effect" } },
    ach_total_170: { count: 170, reward: { type: 'RESOURCE_GAIN', resourceId: 'prestigePoints', amount: '10000', description: "+10,000 Free PP" } },
    ach_total_180: { count: 180, reward: { type: 'MULTIPLIER', targetSystem: 'prestige_mechanics', targetId: 'ppGain', value: '0.25', description: "+25% Prestige Point Gain on Prestige" } },
    ach_total_190: { count: 190, reward: { type: 'COST_REDUCTION_MULTIPLIER', targetSystem: 'skills', targetId: 'ALL', value: '0.10', description: "-10% Cost for all Skills (Normal and Prestige)" } },
    ach_total_200: { count: 200, reward: { type: 'MULTIPLIER', targetSystem: 'global_production', targetId: 'all', value: '0.20', description: "A final +20% to ALL production!" } },
};

const createTotalAchievementAchievements = () => {
    let achievements = {};
    for (const achId in totalAchievementMilestones) {
        const milestone = totalAchievementMilestones[achId];
        achievements[achId] = {
            id: achId,
            name: `Milestone: ${milestone.count} Achievements`,
            description: `Unlock a total of ${milestone.count} achievements. Reward: ${milestone.reward.description}`,
            icon: '🏆',
            condition: { type: "totalAchievements", count: milestone.count },
            reward: milestone.reward
        };
    }
    return achievements;
};

// --- Main Export ---

export const staticModuleData = {
    achievements: {
        // Original Achievements
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

        // New Prestige Achievements
        ...createPrestigeProducerAchievements("license", "License", "📜"),
        ...createPrestigeProducerAchievements("master1", "Master's Degree I", "🏅"),
        ...createPrestigeProducerAchievements("master2", "Master's Degree II", "🎖️"),
        // --- FIX: Corrected PhD icon ---
        ...createPrestigeProducerAchievements("phd", "PhD", "🎓"), 
        ...createPrestigeProducerAchievements("postDoc", "Post-Doctorate", "✨"),

        // **NEW** Image Achievements
        ...createImageAchievements(),
        // New Total Achievement Milestones
        ...createTotalAchievementAchievements(),
        
    },
    ui: {
        achievementsTabLabel: "Achievements",
        completedText: "Completed!",
        lockedText: "Locked"
    }
};

