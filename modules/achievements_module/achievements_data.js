// modules/achievements_module/achievements_data.js (v1)

/**
 * @file achievements_data.js
 * @description Static data definitions for the Achievements module.
 * Defines achievements, their conditions, and rewards.
 */

export const staticModuleData = {
    // List of achievements
    // Each achievement has an id, name, description, condition, and reward.
    achievements: {
        // --- Studies Module Achievements ---
        // Student Achievements
        studentMilestone1: {
            id: 'studentMilestone1',
            name: "First Steps in Academia",
            description: "Own 10 Students.",
            icon: "🧑‍🎓", // Example emoji icon
            condition: {
                type: "producerOwned", // From studies_module
                moduleId: "studies",
                producerId: "student",
                count: 10
            },
            reward: {
                type: "MULTIPLIER",
                targetSystem: "studies_producers",
                targetId: "student",
                value: "0.05", // +5% production for Students (applied as 1.05 multiplier)
                description: "+5% Student Production"
            }
        },
        studentMilestone2: {
            id: 'studentMilestone2',
            name: "Student Body",
            description: "Own 50 Students.",
            icon: "🧑‍🎓",
            condition: { type: "producerOwned", moduleId: "studies", producerId: "student", count: 50 },
            reward: { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "student", value: "0.10", description: "+10% Student Production" }
        },
        // Classroom Achievements
        classroomMilestone1: {
            id: 'classroomMilestone1',
            name: "Expanding Horizons",
            description: "Own 10 Classrooms.",
            icon: "🏫",
            condition: { type: "producerOwned", moduleId: "studies", producerId: "classroom", count: 10 },
            reward: { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "classroom", value: "0.05", description: "+5% Classroom Production" }
        },
        // Professor Achievements
        professorMilestone1: {
            id: 'professorMilestone1',
            name: "Knowledge Vanguard",
            description: "Hire your first Professor.",
            icon: "👨‍🏫",
            condition: { type: "producerOwned", moduleId: "studies", producerId: "professor", count: 1 },
            reward: { type: "MULTIPLIER", targetSystem: "studies_producers", targetId: "professor", value: "0.10", description: "+10% Professor (Knowledge) Production" }
        },
        professorMilestone2: {
            id: 'professorMilestone2',
            name: "Esteemed Faculty",
            description: "Hire 10 Professors.",
            icon: "👨‍🏫",
            condition: { type: "producerOwned", moduleId: "studies", producerId: "professor", count: 10 },
            reward: { type: "MULTIPLIER", targetSystem: "global_resource_production", targetId: "knowledge", value: "0.05", description: "+5% Global Knowledge Production" }
        },

        // --- General Milestones ---
        studyPointsMillionaire: {
            id: 'studyPointsMillionaire',
            name: "Study Points Millionaire",
            description: "Accumulate 1,000,000 total Study Points (ever earned - placeholder, currently checks current amount).",
            icon: "💰",
            condition: {
                type: "resourceAmount",
                resourceId: "studyPoints",
                amount: "1000000" // 1M
            },
            reward: {
                type: "MULTIPLIER",
                targetSystem: "global_resource_production",
                targetId: "studyPoints", // Global SP production
                value: "0.01", // +1%
                description: "+1% Global Study Point Production"
            }
        }
        // More achievements can be added for other producers (Kindergarten, University, etc.)
        // and for other aspects (skills, market, etc.)
    },

    ui: {
        achievementsTabLabel: "Achievements",
        // Unlock condition for the Achievements tab is a global flag `achievementsTabUnlocked`
        // which is set by the Market module.
        completedText: "Completed!",
        lockedText: "Locked"
    }
};
