// modules/studies_module/studies_data.js (v2)

/**
 * @file studies_data.js
 * @description Static data definitions for the Studies module.
 * Defines producers (Student, Classroom, etc.), their costs, production rates,
 * and unlock conditions. Also defines the "Knowledge" resource.
 * All numerical values that can grow large are represented as strings to be
 * converted to Decimal objects by the consuming system (e.g., coreResourceManager, moduleLogic).
 */

export const staticModuleData = {
    // Definition for the 'Knowledge' resource
    resources: {
        knowledge: {
            id: 'knowledge',
            name: "Knowledge",
            initialAmount: "0", // Changed to string for consistency
            isUnlocked: false, // Initially locked, unlocked by Professor production
            showInUI: false, // Hidden until unlocked
        }
    },

    // Definitions for various producers
    producers: {
        student: {
            id: 'student',
            name: "Student",
            description: "A diligent student, generating basic Study Points.",
            resourceId: "studyPoints", // What resource it produces
            baseProduction: "0.5", // SP/s per student
            baseCost: "10", // Initial cost in Study Points
            costResource: "studyPoints", // What resource is used to buy it
            costGrowthFactor: "1.07", // Multiplier for cost per purchase
            unlockCondition: {
                type: "resource", // Unlocked by having a certain amount of a resource
                resourceId: "studyPoints",
                amount: "0", // Student is available from the start (or very low SP)
            },
            ui: {
                buttonText: (cost) => `Hire Student: ${cost} SP`,
                tooltip: (prod, owned) => `Produces ${prod} Study Points/s. You own ${owned}.`
            }
        },
        classroom: {
            id: 'classroom',
            name: "Classroom",
            description: "A dedicated space for learning, boosting Study Point generation.",
            resourceId: "studyPoints",
            baseProduction: "5", // SP/s per classroom
            baseCost: "100",
            costResource: "studyPoints",
            costGrowthFactor: "1.08",
            unlockCondition: {
                type: "producerOwned", // Unlocked by owning a certain number of another producer
                producerId: "student",
                count: 10,
            },
            ui: {
                buttonText: (cost) => `Build Classroom: ${cost} SP`,
                tooltip: (prod, owned) => `Produces ${prod} Study Points/s. You own ${owned}.`
            }
        },
        kindergarten: {
            id: 'kindergarten',
            name: "Kindergarten",
            description: "Early education, laying the groundwork for future knowledge.",
            resourceId: "studyPoints",
            baseProduction: "25",
            baseCost: "1000",
            costResource: "studyPoints",
            costGrowthFactor: "1.09",
            unlockCondition: {
                type: "producerOwned",
                producerId: "classroom",
                count: 10,
            },
            ui: {
                buttonText: (cost) => `Open Kindergarten: ${cost} SP`,
                tooltip: (prod, owned) => `Produces ${prod} Study Points/s. You own ${owned}.`
            }
        },
        elementarySchool: {
            id: 'elementarySchool',
            name: "Elementary School",
            description: "Foundational learning, expanding your academic reach.",
            resourceId: "studyPoints",
            baseProduction: "100",
            baseCost: "10000",
            costResource: "studyPoints",
            costGrowthFactor: "1.10",
            unlockCondition: {
                type: "producerOwned",
                producerId: "kindergarten",
                count: 10,
            },
            ui: {
                buttonText: (cost) => `Establish Elementary School: ${cost} SP`,
                tooltip: (prod, owned) => `Produces ${prod} Study Points/s. You own ${owned}.`
            }
        },
        middleSchool: {
            id: 'middleSchool',
            name: "Middle School",
            description: "Developing deeper understanding and critical thinking.",
            resourceId: "studyPoints",
            baseProduction: "500",
            baseCost: "100000",
            costResource: "studyPoints",
            costGrowthFactor: "1.11",
            unlockCondition: {
                type: "producerOwned",
                producerId: "elementarySchool",
                count: 10,
            },
            ui: {
                buttonText: (cost) => `Found Middle School: ${cost} SP`,
                tooltip: (prod, owned) => `Produces ${prod} Study Points/s. You own ${owned}.`
            }
        },
        highSchool: {
            id: 'highSchool',
            name: "High School",
            description: "Advanced studies, preparing for higher education.",
            resourceId: "studyPoints",
            baseProduction: "2500",
            baseCost: "1000000", // 1M
            costResource: "studyPoints",
            costGrowthFactor: "1.12",
            unlockCondition: {
                type: "producerOwned",
                producerId: "middleSchool",
                count: 10,
            },
            ui: {
                buttonText: (cost) => `Build High School: ${cost} SP`,
                tooltip: (prod, owned) => `Produces ${prod} Study Points/s. You own ${owned}.`
            }
        },
        university: {
            id: 'university',
            name: "University",
            description: "The pinnacle of academic institutions, generating vast Study Points.",
            resourceId: "studyPoints",
            baseProduction: "12500",
            baseCost: "10000000", // 10M
            costResource: "studyPoints",
            costGrowthFactor: "1.13",
            unlockCondition: {
                type: "producerOwned",
                producerId: "highSchool",
                count: 10,
            },
            ui: {
                buttonText: (cost) => `Establish University: ${cost} SP`,
                tooltip: (prod, owned) => `Produces ${prod} Study Points/s. You own ${owned}.`
            }
        },
        professor: {
            id: 'professor',
            name: "Professor",
            description: "A wise mentor, producing valuable Knowledge.",
            resourceId: "knowledge", // This producer generates Knowledge
            baseProduction: "1", // Knowledge/s per professor
            baseCost: "1000000000", // 1 Billion SP
            costResource: "studyPoints",
            costGrowthFactor: "1.15", // Higher growth factor as it's a prestige producer
            unlockCondition: {
                type: "producerOwned",
                producerId: "university",
                count: 10,
            },
            ui: {
                buttonText: (cost) => `Hire Professor: ${cost} SP`,
                tooltip: (prod, owned) => `Produces ${prod} Knowledge/s. You own ${owned}.`
            }
        }
    },

    // Global flags to be set by this module to unlock other content
    globalFlagsToSet: {
        marketUnlocked: { // Changed from commerceUnlocked to marketUnlocked
            flag: "marketUnlocked",
            condition: {
                type: "producerOwned",
                producerId: "professor",
                count: 10, // Owning 10 Professors unlocks the Market
            },
            value: true
        },
        ascensionUnlocked: {
            flag: "ascensionUnlocked",
            condition: {
                type: "producerOwned",
                producerId: "professor",
                count: 10, // Also unlocked by 10 Professors (as per original roadmap)
            },
            value: true
        }
    },

    ui: {
        studiesTabLabel: "Studies",
        studiesTabUnlockCondition: {
            type: "resource",
            resourceId: "studyPoints",
            amount: "10"
        }
    }
};
