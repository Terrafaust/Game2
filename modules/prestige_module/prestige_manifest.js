// /game/modules/prestige_module/prestige_manifest.js
import { prestigeData } from './prestige_data.js';
import { getInitialState } from './prestige_state.js';
import * as prestigeLogic from './prestige_logic.js';
// ui will be imported and used later
// import { ui } from './prestige_ui.js';

export const manifest = {
    id: 'prestige',
    name: 'Ascension',
    version: '1.0.0',
    description: 'The Ascension (Prestige) system.',
    
    // This module doesn't have hard dependencies, it just affects others.
    dependencies: [],

    initialize: (coreSystems) => {
        const { 
            staticDataAggregator, 
            coreResourceManager, 
            coreGameStateManager, 
            coreUpgradeManager, 
            loggingSystem 
            // coreUIManager, gameLoop will be used later
        } = coreSystems;

        loggingSystem.info('PrestigeManifest', `Initializing ${manifest.name} v${manifest.version}...`);

        // Register static data from prestige_data.js
        staticDataAggregator.registerStaticData(manifest.id, prestigeData);

        // Define the 'ascensionPoints' resource, ensuring it does NOT reset on prestige
        const apResource = prestigeData.resources.ascensionPoints;
        coreResourceManager.defineResource(
            apResource.id,
            apResource.name,
            '0', // initial amount
            true, // showInUI
            true, // isUnlocked
            false, // hasProductionRate (it's earned, not generated over time)
            apResource.resetsOnPrestige // This is false
        );

        // Set the initial state for this module if it doesn't exist in the save file
        if (!coreGameStateManager.getModuleState(manifest.id)) {
            coreGameStateManager.setModuleState(manifest.id, getInitialState());
        }

        // Register the global production bonus effect with the upgrade manager
        // This makes the bonus from getPrestigeBonusMultiplier available to all other modules.
        coreUpgradeManager.registerEffectSource(
            manifest.id, // Source module id
            'global_production_bonus_from_ascension', // A unique key for this effect
            'global_production', // The system this affects (a generic, global one)
            'all', // The specific target ID (meaning it applies to everything)
            'MULTIPLIER', // The type of effect
            () => prestigeLogic.getPrestigeBonusMultiplier() // The function that provides the bonus value
        );
        
        loggingSystem.info('PrestigeManifest', `Registered global production bonus effect.`);

        // TODO: Register game loop callbacks for producer generation
        // TODO: Register the UI tab with coreUIManager
        
        loggingSystem.info('PrestigeManifest', `${manifest.name} initialized successfully.`);

        return {
            id: manifest.id,
            logic: prestigeLogic,
            // ui: ui // will be added in Phase 5
        };
    }
};

export default manifest;
