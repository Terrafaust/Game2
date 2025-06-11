// /game/modules/prestige_module/prestige_manifest.js (v2.0 - Hard Reset & UI Fix)
import { prestigeData } from './prestige_data.js';
import { getInitialState, moduleState } from './prestige_state.js';
// FIXED: Changed import to get the exported moduleLogic object directly.
import { moduleLogic } from './prestige_logic.js';
import { ui } from './prestige_ui.js';

export const manifest = {
    id: 'prestige',
    name: 'Prestige',
    version: '2.0.0', // Version bump
    description: 'The Prestige system, now with passive producer generation.',
    dependencies: ['studies'], 

    initialize: (coreSystems) => {
        const { staticDataAggregator, coreResourceManager, coreGameStateManager, coreUpgradeManager, loggingSystem, gameLoop, coreUIManager } = coreSystems;

        loggingSystem.info('PrestigeManifest', `Initializing ${manifest.name} v${manifest.version}...`);
        
        // FIXED: Correctly call the initialize function on the imported logic object.
        moduleLogic.initialize(coreSystems);

        staticDataAggregator.registerStaticData(manifest.id, prestigeData);

        const ppResource = prestigeData.resources?.prestigePoints;
        if (ppResource && ppResource.id) {
            coreResourceManager.defineResource(
                ppResource.id, ppResource.name, '0',
                false, true, false, ppResource.resetsOnPrestige
            );
        } else {
            loggingSystem.error('PrestigeManifest', 'CRITICAL: prestigePoints resource data not found in prestige_data.js. Cannot define resource.');
        }
        
        // --- FIX: Set showInUI to true so it appears in the resource bar ---
        coreResourceManager.defineResource(
            'prestigeCount', 'Prestige Count', '0',
            true, true, false, false
        );

        let currentModuleState = coreGameStateManager.getModuleState(manifest.id) || getInitialState();
        
        const initialState = getInitialState();
        if(!currentModuleState.passiveProductionProgress) {
             currentModuleState.passiveProductionProgress = initialState.passiveProductionProgress
        } else {
             for(const key in initialState.passiveProductionProgress) {
                if (!currentModuleState.passiveProductionProgress[key]) {
                    currentModuleState.passiveProductionProgress[key] = initialState.passiveProductionProgress[key];
                }
            }
        }
       

        Object.assign(moduleState, currentModuleState);
        coreGameStateManager.setModuleState(manifest.id, { ...moduleState });

        coreUpgradeManager.registerEffectSource(
            manifest.id, 'global_bonus_from_prestige', 'global_production', 'all', 'MULTIPLIER',
            // FIXED: Correctly call the function on the imported logic object.
            () => moduleLogic.getPrestigeBonusMultiplier()
        );
        
        // FIXED: Correctly call the function on the imported logic object.
        moduleLogic.updatePrestigeProducerEffects();


        coreUIManager.registerMenuTab(
            manifest.id,
            prestigeData.ui.tabLabel,
            (parentElement) => ui.renderMainContent(parentElement),
            () => {
                return coreGameStateManager.getGlobalFlag('prestigeUnlocked', false);
            },
            () => ui.onShow(),
            () => {}
        );
        
        gameLoop.registerUpdateCallback('generalLogic', (deltaTime) => {
            // FIXED: Correctly call the function on the imported logic object.
            moduleLogic.processPassiveProducerGeneration(deltaTime);
        });

        // FIXED: Pass the logic object itself, not the module namespace.
        ui.initialize(coreSystems, moduleLogic);

        loggingSystem.info('PrestigeManifest', `${manifest.name} initialized successfully.`);

        return {
            id: manifest.id,
            // FIXED: Return the actual logic object.
            logic: moduleLogic,
            ui: ui,
            onPrestigeReset: () => {
                loggingSystem.info(manifest.name, `onPrestigeReset called for ${manifest.name}. Keeping producers.`);
                const currentState = coreGameStateManager.getModuleState(manifest.id) || getInitialState();
                currentState.passiveProductionProgress = getInitialState().passiveProductionProgress;
                Object.assign(moduleState, currentState);
                coreGameStateManager.setModuleState(manifest.id, currentState);
                moduleLogic.updatePrestigeProducerEffects();
            },
            onGameLoad: () => {
                loggingSystem.info(manifest.name, `onGameLoad called for ${manifest.name}. Re-evaluating effects.`);
                let loadedState = coreGameStateManager.getModuleState(manifest.id);
                if (!loadedState) loadedState = getInitialState();
                
                const initialState = getInitialState();
                if (!loadedState.passiveProductionProgress) {
                    loadedState.passiveProductionProgress = initialState.passiveProductionProgress;
                } else {
                     for(const key in initialState.passiveProductionProgress) {
                        if (!loadedState.passiveProductionProgress[key]) {
                            loadedState.passiveProductionProgress[key] = initialState.passiveProductionProgress[key];
                        }
                    }
                }

                Object.assign(moduleState, loadedState);
                moduleLogic.updatePrestigeProducerEffects();
            },
            // --- MODIFICATION: Added to handle a full wipe ---
            onResetState: () => {
                loggingSystem.info(manifest.name, `onResetState called for ${manifest.name}. Wiping all data.`);
                const initialState = getInitialState();
                Object.assign(moduleState, initialState);
                coreGameStateManager.setModuleState(manifest.id, initialState);
                moduleLogic.updatePrestigeProducerEffects(); 
            }
        };
    }
};

export default manifest;
