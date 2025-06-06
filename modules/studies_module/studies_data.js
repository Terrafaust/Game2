// modules/studies_module/studies_data.js (v3)

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
            initialAmount: "0",
            isUnlocked: false, // Initially locked
            showInUI: false,   // Initially hidden
            hasProductionRate: true // Explicitly set for UI to show /s
        }
    },

    // Definitions for various producers
    producers: {
        student: {
            id: 'student',
            name: "Student",
            description: "A diligent student, generating basic Study Points.",
            resourceId: "studyPoints", 
            baseProduction: "1", 
            baseCost: "10", 
            costResource: "studyPoints", 
            costGrowthFactor: "1.03", 
            unlockCondition: {
                type: "resource", 
                resourceId: "studyPoints",
                amount: "0", 
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
            baseProduction: "10", 
            baseCost: "100",
            costResource: "studyPoints",
            costGrowthFactor: "1.03",
            unlockCondition: {
                type: "producerOwned", 
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
            baseProduction: "50",
            baseCost: "1000",
            costResource: "studyPoints",
            costGrowthFactor: "1.03",
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
            baseProduction: "500",
            baseCost: "10000",
            costResource: "studyPoints",
            costGrowthFactor: "1.03",
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
            baseProduction: "5000",
            baseCost: "100000",
            costResource: "studyPoints",
            costGrowthFactor: "1.03",
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
            baseProduction: "25000",
            baseCost: "1000000", // 1M
            costResource: "studyPoints",
            costGrowthFactor: "1.03",
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
            baseProduction: "125000",
            baseCost: "10000000", // 10M
            costResource: "studyPoints",
            costGrowthFactor: "1.03",
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
            resourceId: "knowledge", 
            baseProduction: "1", 
            baseCost: "1000000000", 
            costResource: "studyPoints",
            costGrowthFactor: "1.03", 
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

    globalFlagsToSet: {
        marketUnlocked: { 
            flag: "marketUnlocked",
            condition: {
                type: "producerOwned",
                producerId: "professor",
                count: 10, 
            },
            value: true
        },
        ascensionUnlocked: {
            flag: "ascensionUnlocked",
            condition: {
                type: "producerOwned",
                producerId: "professor",
                count: 10, 
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
