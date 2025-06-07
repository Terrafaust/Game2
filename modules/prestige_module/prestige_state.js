// /game/modules/prestige_module/prestige_state.js (v1.3 - Full Passive Generation State)

/**
 * @file prestige_state.js
 * @description Defines the dynamic, saveable state for the Prestige module.
 * v1.3: Expands passive production state to all applicable producers.
 */

export let moduleState = {};

export const getInitialState = () => ({
    totalPrestigeCount: '0',
    totalPrestigePointsEverEarned: '0',
    ownedProducers: {
        license: '0',
        master1: '0',
        master2: '0',
        phd: '0',
        postDoc: '0'
    },
    // --- FEATURE: Expanded state to track all passive production progress ---
    passiveProductionProgress: {
        student: '0',
        classroom: '0',
        kindergarten: '0',
        elementarySchool: '0',
        middleSchool: '0',
        highSchool: '0',
        university: '0',
        professor: '0'
    }
});
