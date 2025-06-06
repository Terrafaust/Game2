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
        const { staticDataAggregator, coreResourceManager, coreGameStateManager, coreUpgradeManager, loggingSystem, gameLoop, coreUIManager } = coreSystems;

        loggingSystem.info('PrestigeManifest', `Initializing ${manifest.name} v${manifest.version}...`);
        
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
        
        gameLoop.registerUpdateCallback('resourceGeneration', (deltaTime) => {
            if (Object.values(moduleState.ownedProducers).some(val => val !== '0')) {
                 prestigeLogic.updateAllPrestigeProducerProductions(deltaTime);
            }
        });

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
        
        // ADDED: Register the Prestige Skills Tab
        coreUIManager.registerMenuTab(
            'prestige_skills',
            "Prestige Skills",
            (parentElement) => { 
                parentElement.innerHTML = `<div class="p-4"><h2 class="text-xl font-semibold">Prestige Skills</h2><p class="text-textSecondary mt-2">This feature is not yet implemented. Spend your Prestige Points here for powerful, permanent upgrades that persist through Prestiges.</p></div>`;
            },
            () => coreGameStateManager.getGlobalFlag('hasPrestigedOnce', false), // Only show after first prestige
            () => {}
        );

        ui.initialize(coreSystems, prestigeLogic);

        loggingSystem.info('PrestigeManifest', `${manifest.name} initialized successfully.`);

        return {
            id: manifest.id,
            logic: prestigeLogic,
            ui: ui,
            onPrestigeReset: () => {
                loggingSystem.info(manifest.name, `onPrestigeReset called for ${manifest.name}. My state is safe.`);
            }
        };
    }
};

export default manifest;
