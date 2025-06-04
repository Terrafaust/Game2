// game/js/modules/studies_module/studies_data.js

/**
 * @fileoverview Static data definitions for the Studies module.
 * This file defines all the fixed data such as producers, their base costs,
 * production rates, unlock conditions, and UI text.
 */

/**
 * StudiesData object contains all static configuration for the Studies module.
 */
const StudiesData = {
    // Defines resources introduced or primarily managed by this module.
    // 'knowledge' is a new resource introduced in this module.
    resources: {
        knowledge: {
            id: 'knowledge',
            name: 'Knowledge',
            description: 'Accumulated wisdom from extensive studies.',
            // Initial amount for Knowledge. It starts at 0.
            initialAmount: '0',
            // Indicates if this resource should be displayed in the global resource bar.
            displayInResourceBar: true
        }
    },

    // Defines the producers within the Studies module.
    // Each producer has properties like base cost, production, and unlock conditions.
    producers: {
        // The "Student" producer.
        student: {
            id: 'student',
            name: 'Student',
            description: 'A diligent student, generating Study Points.',
            // The resource required to purchase this producer.
            costResource: 'studyPoints',
            // Base cost for the first unit. This will be a Decimal string.
            baseCost: '10',
            // Factor by which the cost increases for each subsequent purchase.
            // This is a crucial balancing parameter.
            costIncreaseFactor: '1.07', // As per roadmap: 1.07 to 1.15 initially
            // Base production rate per second.
            // This student produces 0.5 Study Points per second.
            production: {
                resourceId: 'studyPoints',
                amount: '0.5' // Decimal string
            },
            // Unlock condition for this producer.
            // 'always' means it's available from the start of the module.
            unlockCondition: 'always',
            // Tooltip text for when the producer is locked (not applicable for 'always').
            lockedTooltip: ''
        },

        // The "Classroom" producer.
        classroom: {
            id: 'classroom',
            name: 'Classroom',
            description: 'A dedicated space for learning, boosting Study Point generation.',
            costResource: 'studyPoints',
            baseCost: '100',
            costIncreaseFactor: '1.10', // Slightly higher increase factor
            production: {
                resourceId: 'studyPoints',
                amount: '5'
            },
            // Unlocks when the player owns 10 "Students".
            unlockCondition: {
                type: 'producerOwned',
                producerId: 'student',
                amount: 10
            },
            lockedTooltip: 'Own 10 Students to unlock Classrooms.'
        },

        // The "Kindergarten" producer.
        kindergarten: {
            id: 'kindergarten',
            name: 'Kindergarten',
            description: 'Early education, laying the groundwork for future knowledge.',
            costResource: 'studyPoints',
            baseCost: '1000',
            costIncreaseFactor: '1.12',
            production: {
                resourceId: 'studyPoints',
                amount: '50'
            },
            unlockCondition: {
                type: 'producerOwned',
                producerId: 'classroom',
                amount: 10
            },
            lockedTooltip: 'Own 10 Classrooms to unlock Kindergartens.'
        },

        // The "Elementary School" producer.
        elementarySchool: {
            id: 'elementarySchool',
            name: 'Elementary School',
            description: 'Fundamental learning, expanding the reach of education.',
            costResource: 'studyPoints',
            baseCost: '10000',
            costIncreaseFactor: '1.13',
            production: {
                resourceId: 'studyPoints',
                amount: '500'
            },
            unlockCondition: {
                type: 'producerOwned',
                producerId: 'kindergarten',
                amount: 10
            },
            lockedTooltip: 'Own 10 Kindergartens to unlock Elementary Schools.'
        },

        // The "Middle School" producer.
        middleSchool: {
            id: 'middleSchool',
            name: 'Middle School',
            description: 'Developing critical thinking and specialized skills.',
            costResource: 'studyPoints',
            baseCost: '100000',
            costIncreaseFactor: '1.14',
            production: {
                resourceId: 'studyPoints',
                amount: '5000'
            },
            unlockCondition: {
                type: 'producerOwned',
                producerId: 'elementarySchool',
                amount: 10
            },
            lockedTooltip: 'Own 10 Elementary Schools to unlock Middle Schools.'
        },

        // The "High School" producer.
        highSchool: {
            id: 'highSchool',
            name: 'High School',
            description: 'Advanced studies, preparing for higher education.',
            costResource: 'studyPoints',
            baseCost: '1000000', // 1 Million SP
            costIncreaseFactor: '1.15',
            production: {
                resourceId: 'studyPoints',
                amount: '50000'
            },
            unlockCondition: {
                type: 'producerOwned',
                producerId: 'middleSchool',
                amount: 10
            },
            lockedTooltip: 'Own 10 Middle Schools to unlock High Schools.'
        },

        // The "University" producer.
        university: {
            id: 'university',
            name: 'University',
            description: 'Pinnacle of academic pursuit, generating vast Study Points.',
            costResource: 'studyPoints',
            baseCost: '100000000', // 100 Million SP
            costIncreaseFactor: '1.16',
            production: {
                resourceId: 'studyPoints',
                amount: '500000'
            },
            unlockCondition: {
                type: 'producerOwned',
                producerId: 'highSchool',
                amount: 10
            },
            lockedTooltip: 'Own 10 High Schools to unlock Universities.'
        },

        // The "Professor" producer, which generates Knowledge.
        professor: {
            id: 'professor',
            name: 'Professor',
            description: 'An esteemed academic, generating valuable Knowledge.',
            costResource: 'studyPoints',
            baseCost: '1000000000', // 1 Billion SP
            costIncreaseFactor: '1.20', // Higher increase factor for a high-tier producer
            production: {
                resourceId: 'knowledge', // This producer generates Knowledge
                amount: '10' // 10 Knowledge per second
            },
            // Unlocks when the player owns 10 "Universities".
            unlockCondition: {
                type: 'producerOwned',
                producerId: 'university',
                amount: 10
            },
            lockedTooltip: 'Own 10 Universities to unlock Professors.'
        }
    },

    // Global flags that can be set by this module to unlock content in other modules.
    // These flags are set by the logic when certain conditions are met (e.g., owning 10 Professors).
    globalUnlockFlags: {
        commerceUnlocked: {
            flagName: 'commerceUnlocked',
            unlockCondition: {
                type: 'producerOwned',
                producerId: 'professor',
                amount: 10
            }
        },
        ascensionUnlocked: {
            flagName: 'ascensionUnlocked',
            unlockCondition: {
                type: 'producerOwned',
                producerId: 'professor',
                amount: 10
            }
        }
    }
};

// Make StudiesData globally accessible for other modules/core services.
if (typeof window !== 'undefined') {
    window.StudiesData = StudiesData;
}
