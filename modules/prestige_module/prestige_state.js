// /game/modules/prestige_module/prestige_state.js (v1.1 - Fix)

/**
 * @file prestige_state.js
 * @description Defines the dynamic, saveable state for the Prestige module.
 * v1.1: Correctly exports the moduleState object to prevent import errors.
 */

/**
 * The runtime state of the module. It's populated by the manifest on game load.
 * We export it so other files in the module can reference it directly.
 */
export let moduleState = {};

/**
 * @returns {object} The initial state for the prestige module when starting a new game or prestiging.
 */
export const getInitialState = () => ({
    totalPrestigeCount: '0',
    totalPrestigePointsEverEarned: '0',
    ownedProducers: {
        license: '0',
        master1: '0',
        master2: '0',
        phd: '0',
        postDoc: '0'
    }
});
