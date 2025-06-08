// /game/modules/prestige_module/prestige_state.js (v2.1 - Added ADR)

/**
 * @file prestige_state.js
 * @description Defines the dynamic, saveable state for the Prestige module.
 * v2.1: Added ADR to the initial state.
 * v2.0: Added state for prestige history, run time, and stat snapshots.
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
        postDoc: '0',
        // --- MODIFICATION: Added adr to state ---
        adr: '0'
    },
    passiveProductionProgress: {
        student: '0', classroom: '0', kindergarten: '0', elementarySchool: '0',
        middleSchool: '0', highSchool: '0', university: '0', professor: '0'
    },
    currentPrestigeRunTime: 0, 
    lastTenPrestiges: [],
    statsSnapshotAtPrestige: { 
        totalStudyPointsProduced: '0',
        totalKnowledgeProduced: '0',
    }
});
