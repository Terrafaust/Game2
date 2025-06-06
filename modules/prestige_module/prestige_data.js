// /game/modules/prestige_module/prestige_data.js (v2.0 - User Specs)

export const prestigeData = {
    resources: {
        ascensionPoints: {
            id: 'ascensionPoints',
            name: 'Ascension Points',
            description: 'Points earned by resetting progress, used for powerful upgrades.',
            resetsOnPrestige: false
        }
    },

    producers: {
        license: {
            id: 'license',
            name: 'License',
            description: 'Automatically produces Students, Classrooms, and Kindergartens.',
            costResource: 'ascensionPoints',
            baseCost: '100',
            costGrowthFactor: '1.05',
            production: [
                { moduleId: 'studies', producerId: 'student', base: '1' },
                { moduleId: 'studies', producerId: 'classroom', base: '1' },
                { moduleId: 'studies', producerId: 'kindergarten', base: '1' }
            ]
        },
        master1: {
            id: 'master1',
            name: "Master's Degree I",
            description: 'Automatically produces Elementary, Middle, and High Schools.',
            costResource: 'ascensionPoints',
            baseCost: '10000',
            costGrowthFactor: '1.05',
            production: [
                { moduleId: 'studies', producerId: 'elementarySchool', base: '1' },
                { moduleId: 'studies', producerId: 'middleSchool', base: '1' },
                { moduleId: 'studies', producerId: 'highSchool', base: '1' }
            ]
        },
        master2: {
            id: 'master2',
            name: "Master's Degree II",
            description: 'Automatically produces Universities.',
            costResource: 'ascensionPoints',
            baseCost: '100000',
            costGrowthFactor: '1.05',
            production: [
                { moduleId: 'studies', producerId: 'university', base: '1' }
            ]
        },
        phd: {
            id: 'phd',
            name: 'PhD',
            description: 'Automatically produces Professors.',
            costResource: 'ascensionPoints',
            baseCost: '1e10', // 10e9 is 1e10
            costGrowthFactor: '1.05',
            production: [
                { moduleId: 'studies', producerId: 'professor', base: '0.1' }
            ]
        },
        postDoc: {
            id: 'postDoc',
            name: 'Post-Doctorate',
            description: 'Multiplies the production of all other Ascension producers.',
            costResource: 'ascensionPoints',
            baseCost: '1e13', // 10e12 is 1e13
            costGrowthFactor: '1.05',
            // This producer has no direct production, its effect is calculated in logic
            effect: {
                type: 'MULTIPLIER',
                target: ['license', 'master1', 'master2', 'phd'],
                valuePer: '0.1' // Each Post-Doc adds a +10% multiplier
            }
        }
    },
    
    ui: {
        tabLabel: "Ascension",
        ascendButtonText: "Ascend",
    }
};
