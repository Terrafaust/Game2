// /game/modules/prestige_module/prestige_state.js
/**
 * @returns {object} The initial state for the prestige module.
 */
export const getInitialState = () => ({
    totalAscensionCount: '0',
    totalAscensionPointsEverEarned: '0',
    ownedProducers: {
        license: '0',
        mastersDegree: '0',
        phd: '0',
        doctoralThesis: '0',
        postDoc: '0'
    }
});
