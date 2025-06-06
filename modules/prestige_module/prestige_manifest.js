// /game/modules/prestige_module/prestige_manifest.js (v1.5 - Unlock Debugging)
import { prestigeData } from './prestige_data.js';
import { getInitialState, moduleState } from './prestige_state.js';
import * as prestigeLogic from './prestige_logic.js';
import { ui } from './prestige_ui.js';

export const manifest = {
    id: 'prestige',
    name: 'Prestige',
    version: '1.5.0',
    description: 'The Prestige system.',
    dependencies: [],

    initialize: (coreSystems) => {
        const { staticDataAggregator, coreResourceManager, coreGameStateManager, coreUpgradeManager, loggingSystem, gameLoop } = coreSystems;

        loggingSystem.info('PrestigeManifest', `Initializing ${manifest.name} v${this.version}...`);
        
        prestigeLogic.initialize(coreSystems);

        staticDataAggregator.registerStaticData(manifest.id, prestigeData);

        const ppResource = prestigeData.resources.prestigePoints;
        coreResourceManager.defineResource(
            ppResource.id, ppResource.name, '0',
            false, true, false, ppResource.resetsOnPrestige
        );
        
        coreResourceManager.defineResource(
            'prestigeCount', 'Prestige Count', '0',
            false, true, false, false
        );

        let currentModuleState = coreGameStateManager.getModuleState(manifest.id);
        if (!currentModuleState) {
            currentModuleState = getInitialState();
        }
        Object.assign(moduleState, currentModuleState);
        coreGameStateManager.setModuleState(manifest.id, { ...moduleState });

        coreUpgradeManager.registerEffectSource(
            manifest.id, 'global_bonus_from_prestige', 'global_production', 'all', 'MULTIPLIER',
            () => prestigeLogic.getPrestigeBonusMultiplier()
        );
        
        // Production logic is still handled by the game loop.
        gameLoop.registerUpdateCallback('resourceGeneration', (deltaTime) => {
            if (Object.values(moduleState.ownedProducers).some(val => val !== '0')) {
                 prestigeLogic.updateAllPrestigeProducerProductions(deltaTime);
            }
        });

        // Register the UI Tab with the new, simpler visibility logic
        coreUIManager.registerMenuTab(
            manifest.id,
            prestigeData.ui.tabLabel,
            (parentElement) => ui.renderMainContent(parentElement),
            () => {
                // **DEBUG LOGGING ADDED**
                const isUnlocked = coreGameStateManager.getGlobalFlag('prestigeUnlocked', false);
                // loggingSystem.debug('PrestigeManifest_VisibilityCheck', `is prestigeUnlocked? ${isUnlocked}`);
                return isUnlocked;
            },
            () => ui.onShow(),
            () => {}
        );

        ui.initialize(coreSystems, prestigeLogic);

        loggingSystem.info('PrestigeManifest', `${manifest.name} initialized successfully.`);

        return {
            id: manifest.id,
            logic: prestigeLogic,
            ui: ui
        };
    }
};

export default manifest;
