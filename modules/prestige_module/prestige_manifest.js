// /game/modules/prestige_module/prestige_manifest.js (v1.8 - Passive Generation & Bugfix)
import { prestigeData } from './prestige_data.js';
import { getInitialState, moduleState } from './prestige_state.js';
import * as prestigeLogic from './prestige_logic.js';
import { ui } from './prestige_ui.js';

export const manifest = {
    id: 'prestige',
    name: 'Prestige',
    version: '1.8.0', // Version bump for new feature and fix
    description: 'The Prestige system, now with passive producer generation.',
    dependencies: ['studies'], // Added studies as a dependency for passive generation

    initialize: (coreSystems) => {
        const { staticDataAggregator, coreResourceManager, coreGameStateManager, coreUpgradeManager, loggingSystem, gameLoop, coreUIManager } = coreSystems;

        loggingSystem.info('PrestigeManifest', `Initializing ${manifest.name} v${manifest.version}...`);
        
        prestigeLogic.initialize(coreSystems);

        staticDataAggregator.registerStaticData(manifest.id, prestigeData);

        // --- BUGFIX: Added a check to ensure the resource data exists before defining it ---
        const ppResource = prestigeData.resources?.prestigePoints;
        if (ppResource && ppResource.id) {
            coreResourceManager.defineResource(
                ppResource.id, ppResource.name, '0',
                false, true, false, ppResource.resetsOnPrestige
            );
        } else {
            loggingSystem.error('PrestigeManifest', 'CRITICAL: prestigePoints resource data not found in prestige_data.js. Cannot define resource.');
        }
        // --- END BUGFIX ---
        
        coreResourceManager.defineResource(
            'prestigeCount', 'Prestige Count', '0',
            false, true, false, false
        );

        let currentModuleState = coreGameStateManager.getModuleState(manifest.id);
        if (!currentModuleState) {
            currentModuleState = getInitialState();
        }
        // Ensure new state properties exist on loaded save
        if (!currentModuleState.passiveProductionProgress) {
            currentModuleState.passiveProductionProgress = getInitialState().passiveProductionProgress;
        }
        Object.assign(moduleState, currentModuleState);
        coreGameStateManager.setModuleState(manifest.id, { ...moduleState });

        // Register the global prestige bonus multiplier
        coreUpgradeManager.registerEffectSource(
            manifest.id, 'global_bonus_from_prestige', 'global_production', 'all', 'MULTIPLIER',
            () => prestigeLogic.getPrestigeBonusMultiplier()
        );
        
        // Initial registration of prestige producer effects when the module loads
        prestigeLogic.updatePrestigeProducerEffects();


        coreUIManager.registerMenuTab(
            manifest.id,
            prestigeData.ui.tabLabel,
            (parentElement) => ui.renderMainContent(parentElement),
            () => {
                const isUnlocked = coreGameStateManager.getGlobalFlag('prestigeUnlocked', false);
                return isUnlocked;
            },
            () => ui.onShow(),
            () => {}
        );
        
        // --- FEATURE: Register passive producer generation with the game loop ---
        gameLoop.registerUpdateCallback('generalLogic', (deltaTime) => {
            prestigeLogic.processPassiveProducerGeneration(deltaTime);
        });
        // --- END FEATURE ---

        ui.initialize(coreSystems, prestigeLogic);

        loggingSystem.info('PrestigeManifest', `${manifest.name} initialized successfully.`);

        return {
            id: manifest.id,
            logic: prestigeLogic,
            ui: ui,
            onPrestigeReset: () => {
                loggingSystem.info(manifest.name, `onPrestigeReset called for ${manifest.name}. My state is safe.`);
                const initialState = getInitialState();
                 Object.assign(moduleState, initialState);
                coreGameStateManager.setModuleState(manifest.id, initialState);
                // Re-register effects after prestige reset to ensure they reflect the new state
                prestigeLogic.updatePrestigeProducerEffects();
            },
            onGameLoad: () => {
                loggingSystem.info(manifest.name, `onGameLoad called for ${manifest.name}. Re-evaluating effects.`);
                 let loadedState = coreGameStateManager.getModuleState(manifest.id);
                if (!loadedState) loadedState = getInitialState();
                // Ensure new state properties exist on loaded save
                if (!loadedState.passiveProductionProgress) {
                    loadedState.passiveProductionProgress = getInitialState().passiveProductionProgress;
                }
                Object.assign(moduleState, loadedState);
                // Re-register effects on game load to ensure they reflect the loaded state
                prestigeLogic.updatePrestigeProducerEffects();
            }
        };
    }
};

export default manifest;
