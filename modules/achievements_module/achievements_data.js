// modules/achievements_module/achievements_data.js 

/**
 * @file achievements_data.js
 * @description Static data definitions for the Achievements module.
 * Defines various achievements, their unlock conditions, and rewards.
 * All numerical values that can grow large are represented as strings to be
 * converted to Decimal objects by the consuming system.
 */

export const staticModuleData = {
    // Categories for achievements (optional, for UI grouping)
    categories: {
        studies: {
            id: 'studies',
            name: "Studies Achievements",
            description: "Achievements related to Study Points and academic progression."
        },
        // Add more categories as needed (e.g., commerce, skills, ascension)
    },

    // Definitions for various achievements
    achievements: {
        // Studies Achievements
        firstStudent: {
            id: 'firstStudent',
            name: "First Student",
            description: "Hire your very first Student.",
            category: "studies",
            condition: {
                type: "producerOwned",
                moduleId: "studies", // Module that owns the producer
                producerId: "student",
                count: "1",
            },
            reward: {
                type: "productionMultiplier",
                targetType: "producer",
                targetId: "student",
                value: "1.05", // +5% production for Students
            },
            ui: {
                progressText: (current, required) => `Owned ${current} / ${required} Students.`,
                rewardText: (value) => `Reward: Student production x${decimalUtility.format(value, 2)}.`
            }
        },
        tenStudents: {
            id: 'tenStudents',
            name: "Student Body",
            description: "Hire 10 Students.",
            category: "studies",
            condition: {
                type: "producerOwned",
                moduleId: "studies",
                producerId: "student",
                count: "10",
            },
            reward: {
                type: "productionMultiplier",
                targetType: "producer",
                targetId: "student",
                value: "1.10", // +10% production for Students
            },
            ui: {
                progressText: (current, required) => `Owned ${current} / ${required} Students.`,
                rewardText: (value) => `Reward: Student production x${decimalUtility.format(value, 2)}.`
            }
        },
        firstProfessor: {
            id: 'firstProfessor',
            name: "The Mentor",
            description: "Hire your first Professor.",
            category: "studies",
            condition: {
                type: "producerOwned",
                moduleId: "studies",
                producerId: "professor",
                count: "1",
            },
            reward: {
                type: "productionMultiplier",
                targetType: "producer",
                targetId: "professor",
                value: "1.10", // +10% production for Professors
            },
            ui: {
                progressText: (current, required) => `Owned ${current} / ${required} Professors.`,
                rewardText: (value) => `Reward: Professor production x${decimalUtility.format(value, 2)}.`
            }
        },
        millionStudyPoints: {
            id: 'millionStudyPoints',
            name: "Millionaire Scholar",
            description: "Accumulate 1 Million Study Points.",
            category: "studies",
            condition: {
                type: "resourceAmount",
                resourceId: "studyPoints",
                amount: "1000000",
            },
            reward: {
                type: "productionMultiplier",
                targetType: "resource",
                targetId: "studyPoints",
                value: "1.02", // +2% global SP production
            },
            ui: {
                progressText: (current, required) => `Have ${current} / ${required} SP.`,
                rewardText: (value) => `Reward: Global SP production x${decimalUtility.format(value, 2)}.`
            }
        },
        // Add more achievements as needed (e.g., for other producers, total clicks, skill levels)
        totalClicks100: {
            id: 'totalClicks100',
            name: "Clicking Prodigy",
            description: "Perform 100 manual study sessions.",
            category: "studies",
            condition: {
                type: "totalClicks",
                moduleId: "core_gameplay",
                count: "100",
            },
            reward: {
                type: "resourceGain",
                resourceId: "studyPoints",
                value: "1000", // One-time gain of 1000 SP
            },
            ui: {
                progressText: (current, required) => `Total clicks: ${current} / ${required}.`,
                rewardText: (value) => `Reward: Gain ${decimalUtility.format(value, 0)} Study Points (one-time).`
            }
        },
        focusedStudyLevel5: {
            id: 'focusedStudyLevel5',
            name: "Laser Focus",
            description: "Reach level 5 in Focused Study skill.",
            category: "studies", // Can be a shared category or new 'skills' category
            condition: {
                type: "skillLevel",
                moduleId: "skills",
                skillId: "focusedStudy",
                level: 5,
            },
            reward: {
                type: "productionMultiplier",
                targetType: "producer",
                targetId: "student",
                value: "1.15", // Additional +15% to student production
            },
            ui: {
                progressText: (current, required) => `Focused Study Level: ${current} / ${required}.`,
                rewardText: (value) => `Reward: Student production x${decimalUtility.format(value, 2)}.`
            }
        }
    },

    ui: {
        achievementsTabLabel: "Achievements",
        achievementsTabUnlockCondition: {
            type: "globalFlag",
            flag: "achievementsMenuUnlocked", // Unlocked by Commerce module
            value: true
        }
    }
};
