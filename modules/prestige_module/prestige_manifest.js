// /game/modules/prestige_module/prestige_manifest.js (v1.1 - Bug Fix & Refactor)
import { prestigeData } from './prestige_data.js';
import { getInitialState, moduleState } from './prestige_state.js';
import * as prestigeLogic from './prestige_logic.js';
import { ui } from './prestige_ui.js';

export const manifest = {
    id: 'prestige',
    name: 'Prestige',
    version: '1.1.0',
    description: 'The Prestige system.',
    dependencies: [],

    initialize: (coreSystems) => {
        const { staticDataAggregator, coreResourceManager, coreGameStateManager, coreUpgradeManager, loggingSystem, gameLoop, moduleLoader } = coreSystems;

        loggingSystem.info('PrestigeManifest', `Initializing ${manifest.name} v${manifest.version}...`);
        
        // **BUG FIX**: Initialize the logic module with the core systems.
        prestigeLogic.initialize(coreSystems);

        staticDataAggregator.registerStaticData(manifest.id, prestigeData);

        // Define the 'prestigePoints' resource, ensuring it does NOT reset on prestige and is hidden initially.
        const ppResource = prestigeData.resources.prestigePoints;
        coreResourceManager.defineResource(
            ppResource.id, ppResource.name, '0',
            false, // showInUI: false initially
            true,  // isUnlocked
            false, // hasProductionRate
            ppResource.resetsOnPrestige // false
        );
        
        // Define a "pseudo-resource" for the prestige count to be displayed in the UI bar
        coreResourceManager.defineResource(
            'prestigeCount', 'Prestige Count', '0',
            false, // showInUI: false initially
            true,  // isUnlocked
            false, // hasProductionRate
            false  // resetsOnPrestige: false
        );

        let currentModuleState = coreGameStateManager.getModuleState(manifest.id);
        if (!currentModuleState) {
            currentModuleState = getInitialState();
        }
        Object.assign(moduleState, currentModuleState);
        coreGameStateManager.setModuleState(manifest.id, { ...moduleState });


        // Register the global production bonus effect with the upgrade manager
        coreUpgradeManager.registerEffectSource(
            manifest.id, 'global_bonus_from_prestige', 'global_production', 'all', 'MULTIPLIER',
            () => prestigeLogic.getPrestigeBonusMultiplier()
        );
        
        loggingSystem.info('PrestigeManifest', `Registered global production bonus effect.`);

        // **FIX**: Register the producer production logic with the game loop for stable updates.
        gameLoop.registerUpdateCallback('resourceGeneration', (deltaTime) => {
            prestigeLogic.updateAllPrestigeProducerProductions(deltaTime);
        });

        // Register the UI Tab
        coreUIManager.registerMenuTab(
            manifest.id,
            prestigeData.ui.tabLabel,
            (parentElement) => ui.renderMainContent(parentElement),
            () => coreGameStateManager.getGlobalFlag('hasPrestigedOnce', false), // Only show tab after first prestige
            () => ui.onShow(),
            () => {} // onHide
        );

        // Initialize UI
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
