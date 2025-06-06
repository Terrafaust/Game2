// /game/modules/prestige_module/prestige_manifest.js (v1.2 - Unlock Condition Changed)
import { prestigeData } from './prestige_data.js';
import { getInitialState, moduleState } from './prestige_state.js';
import * as prestigeLogic from './prestige_logic.js';
import { ui } from './prestige_ui.js';

export const manifest = {
    id: 'prestige',
    name: 'Prestige',
    version: '1.2.0',
    description: 'The Prestige system.',
    dependencies: [],

    initialize: (coreSystems) => {
        const { staticDataAggregator, coreResourceManager, coreGameStateManager, coreUpgradeManager, loggingSystem, gameLoop, moduleLoader } = coreSystems;

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
        
        loggingSystem.info('PrestigeManifest', `Registered global production bonus effect.`);

        gameLoop.registerUpdateCallback('resourceGeneration', (deltaTime) => {
            // Check if the tab needs to be revealed
            const canPrestigeNow = prestigeLogic.canPrestige();
            const tabUnlocked = coreGameStateManager.getGlobalFlag('prestigeTabUnlocked', false);
            if(canPrestigeNow && !tabUnlocked) {
                coreGameStateManager.setGlobalFlag('prestigeTabUnlocked', true);
                coreUIManager.renderMenu(); // Re-render the menu to show the new tab
            }

            // Run the production logic if the player owns any prestige producers
            if (Object.values(moduleState.ownedProducers).some(val => val !== '0')) {
                 prestigeLogic.updateAllPrestigeProducerProductions(deltaTime);
            }
        });

        // Register the UI Tab
        coreUIManager.registerMenuTab(
            manifest.id,
            prestigeData.ui.tabLabel,
            (parentElement) => ui.renderMainContent(parentElement),
            // **NEW VISIBILITY LOGIC**: Show if the tab has ever been unlocked.
            () => coreGameStateManager.getGlobalFlag('prestigeTabUnlocked', false),
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
