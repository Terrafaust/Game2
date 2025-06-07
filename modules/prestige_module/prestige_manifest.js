// /game/modules/prestige_module/prestige_manifest.js (v1.9 - Fixes)
import { prestigeData } from './prestige_data.js';
import { getInitialState, moduleState } from './prestige_state.js';
import * as prestigeLogic from './prestige_logic.js';
import { ui } from './prestige_ui.js';

export const manifest = {
    id: 'prestige',
    name: 'Prestige',
    version: '1.9.0', // Version bump for fixes
    description: 'The Prestige system, now with passive producer generation.',
    dependencies: ['studies'], 

    initialize: (coreSystems) => {
        const { staticDataAggregator, coreResourceManager, coreGameStateManager, coreUpgradeManager, loggingSystem, gameLoop, coreUIManager } = coreSystems;

        loggingSystem.info('PrestigeManifest', `Initializing ${manifest.name} v${manifest.version}...`);
        
        prestigeLogic.initialize(coreSystems);

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
        
        coreResourceManager.defineResource(
            'prestigeCount', 'Prestige Count', '0',
            false, true, false, false
        );

        let currentModuleState = coreGameStateManager.getModuleState(manifest.id);
        if (!currentModuleState) {
            currentModuleState = getInitialState();
        }
        
        // Ensure new state properties from updates exist on loaded saves
        const initialState = getInitialState();
        for(const key in initialState.passiveProductionProgress) {
            if (!currentModuleState.passiveProductionProgress[key]) {
                currentModuleState.passiveProductionProgress[key] = initialState.passiveProductionProgress[key];
            }
        }

        Object.assign(moduleState, currentModuleState);
        coreGameStateManager.setModuleState(manifest.id, { ...moduleState });

        coreUpgradeManager.registerEffectSource(
            manifest.id, 'global_bonus_from_prestige', 'global_production', 'all', 'MULTIPLIER',
            () => prestigeLogic.getPrestigeBonusMultiplier()
        );
        
        prestigeLogic.updatePrestigeProducerEffects();


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
            prestigeLogic.processPassiveProducerGeneration(deltaTime);
        });

        ui.initialize(coreSystems, prestigeLogic);

        loggingSystem.info('PrestigeManifest', `${manifest.name} initialized successfully.`);

        return {
            id: manifest.id,
            logic: prestigeLogic,
            ui: ui,
            onPrestigeReset: () => {
                loggingSystem.info(manifest.name, `onPrestigeReset called for ${manifest.name}. Keeping producers.`);
                
                // --- FIX: Only reset the passive production progress, not the whole state ---
                // This preserves ownedProducers, totalPrestigeCount, etc.
                const currentState = coreGameStateManager.getModuleState(manifest.id) || getInitialState();
                currentState.passiveProductionProgress = getInitialState().passiveProductionProgress;
                
                Object.assign(moduleState, currentState);
                coreGameStateManager.setModuleState(manifest.id, currentState);
                
                prestigeLogic.updatePrestigeProducerEffects();
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
                prestigeLogic.updatePrestigeProducerEffects();
            }
        };
    }
};

export default manifest;
