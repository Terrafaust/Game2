// /game/modules/prestige_module/prestige_data.js (v2.6 - Post-Doc Rework)

export const prestigeData = {
    resources: {
        prestigePoints: {
            id: 'prestigePoints',
            name: 'Prestige Points',
            description: 'Points earned by resetting progress, used for powerful upgrades.',
            resetsOnPrestige: false
        },
        prestigeSkillPoints: {
            id: 'prestigeSkillPoints',
            name: 'Prestige Skill Points',
            description: 'Special points used to unlock and upgrade permanent Prestige Skills.',
            resetsOnPrestige: false,
            showInUI: false,
            isUnlocked: true
        }
    },

    producers: {
        license: {
            id: 'license',
            name: 'License',
            description: 'A professional teaching license. Each one passively generates 1 Student, 1 Classroom, and 1 Kindergarten per second for free.',
            costResource: 'prestigePoints',
            baseCost: '25',
            costGrowthFactor: '1.05',
            passiveProduction: [
                { producerId: 'student', baseRate: '1' },
                { producerId: 'classroom', baseRate: '1' },
                { producerId: 'kindergarten', baseRate: '1' }
            ]
        },
        master1: {
            id: 'master1',
            name: "Master's Degree I",
            description: 'Each one passively generates 1 Elementary, Middle, and High School per second.',
            costResource: 'prestigePoints',
            baseCost: '1000',
            costGrowthFactor: '1.05',
            passiveProduction: [
                { producerId: 'elementarySchool', baseRate: '1' },
                { producerId: 'middleSchool', baseRate: '1' },
                { producerId: 'highSchool', baseRate: '1' }
            ]
        },
        master2: {
            id: 'master2',
            name: "Master's Degree II",
            description: 'Each one passively generates 1 University per second.',
            costResource: 'prestigePoints',
            baseCost: '25000',
            costGrowthFactor: '1.05',
            passiveProduction: [
                { producerId: 'university', baseRate: '1' }
            ]
        },
        phd: {
            id: 'phd',
            name: 'PhD',
            description: 'Each one passively generates 0.1 Professors per second.',
            costResource: 'prestigePoints',
            baseCost: '1e7',
            costGrowthFactor: '1.05',
            passiveProduction: [
                { producerId: 'professor', baseRate: '0.1' }
            ]
        },
        postDoc: {
            id: 'postDoc',
            name: 'Post-Doctorate',
            // --- MODIFICATION: Updated description and removed old effect block ---
            description: 'Multiplies the passive generation of all other Prestige producers by 1.08x for each level, stacking multiplicatively.',
            costResource: 'prestigePoints',
            baseCost: '1e9',
            costGrowthFactor: '1.05',
            // The effect is now handled directly in prestige_logic.js
        },
        // --- END MODIFICATION ---
        adr: {
            id: 'adr',
            name: 'ADR (Authorization to Direct Research)',
            description: 'Each level multiplies the total production of Knowledge by x10.',
            costResource: 'prestigePoints',
            baseCost: '1e10',
            costGrowthFactor: '12', // Cost increases significantly
            effect: {
                type: 'MULTIPLIER',
                targetSystem: 'global_resource_production',
                targetId: 'knowledge',
                valuePerLevel: '9' // Adds 9 to a base of 1 for a 10x multiplier
            }
        }
    },
    
    ui: {
        tabLabel: "Prestige",
        prestigeButtonText: "Prestige",
    }
};
