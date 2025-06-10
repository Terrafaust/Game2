// js/core/moduleLoader.js (v2.5.0 - Add buyMultiplierUI)

/**
 * @file moduleLoader.js
 * @description Handles loading, initializing, and managing game feature modules.
 * v2.5.0: Accepts and passes buyMultiplierUI helper.
 * v2.4.0: Accepts and passes buyMultiplierManager.
 * v2.3.2: Accepts and passes saveLoadSystem.
 */

import { loggingSystem } from './loggingSystem.js';

// The moduleLoader itself will be added to coreSystems before passing to modules
let coreSystemsBase = {
    staticDataAggregator: null,
    coreGameStateManager: null,
    coreResourceManager: null,
    coreUIManager: null,
    decimalUtility: null,
    loggingSystem: null,
    gameLoop: null,
    coreUpgradeManager: null,
    globalSettingsManager: null,
    saveLoadSystem: null,
    buyMultiplierManager: null,
    buyMultiplierUI: null, // <<< ADDED
    // moduleLoader: null // This will be added dynamically in loadModule
};

const loadedModules = {
    // moduleId: { manifest: object, instance: object (the module's main exported object) }
};

const moduleLoader = {
    initialize(
        staticDataAggregatorRef,
        coreGameStateManagerRef,
        coreResourceManagerRef,
        coreUIManagerRef,
        decimalUtilityRef,
        loggingSystemRef,
        gameLoopRef,
        coreUpgradeManagerRef,
        globalSettingsManagerRef,
        saveLoadSystemRef,
        buyMultiplierManagerRef,
        buyMultiplierUIRef // <<< ADDED
    ) {
        coreSystemsBase.staticDataAggregator = staticDataAggregatorRef;
        coreSystemsBase.coreGameStateManager = coreGameStateManagerRef;
        coreSystemsBase.coreResourceManager = coreResourceManagerRef;
        coreSystemsBase.coreUIManager = coreUIManagerRef;
        coreSystemsBase.decimalUtility = decimalUtilityRef;
        coreSystemsBase.loggingSystem = loggingSystem;
        coreSystemsBase.gameLoop = gameLoopRef;
        coreSystemsBase.coreUpgradeManager = coreUpgradeManagerRef;
        coreSystemsBase.globalSettingsManager = globalSettingsManagerRef;
        coreSystemsBase.saveLoadSystem = saveLoadSystemRef;
        coreSystemsBase.buyMultiplierManager = buyMultiplierManagerRef;
        coreSystemsBase.buyMultiplierUI = buyMultiplierUIRef; // <<< ADDED

        if (typeof decimalUtilityRef === 'undefined') {
            loggingSystem.error("ModuleLoader_Critical", "decimalUtilityRef received in initialize is undefined.");
        } else {
            loggingSystem.info("ModuleLoader", "decimalUtilityRef received successfully in initialize.");
        }
        if (typeof globalSettingsManagerRef === 'undefined') {
            loggingSystem.warn("ModuleLoader_Warning", "globalSettingsManagerRef received in initialize is undefined. Settings module may not function correctly.");
        } else {
            loggingSystem.info("ModuleLoader", "globalSettingsManagerRef received successfully in initialize.");
        }
        if (typeof saveLoadSystemRef === 'undefined') {
            loggingSystem.warn("ModuleLoader_Warning", "saveLoadSystemRef received in initialize is undefined. Save/Load in modules might fail.");
        } else {
            loggingSystem.info("ModuleLoader", "saveLoadSystemRef received successfully in initialize.");
        }

        loggingSystem.info("ModuleLoader", "Module Loader initialized with core systems (v2.5.0).");
    },

    async loadModule(manifestPath) {
        loggingSystem.debug("ModuleLoader", `Attempting to load module from manifest: ${manifestPath}`);
        try {
            const manifestModule = await import(manifestPath);
            if (!manifestModule || !manifestModule.default) {
                loggingSystem.error("ModuleLoader", `Failed to load manifest from ${manifestPath}. No default export or module is empty.`);
                if(coreSystemsBase.coreUIManager) coreSystemsBase.coreUIManager.showNotification(`Failed to load structure for: ${manifestPath.split('/').pop()}. Check console.`, "error", 10000);
                return false;
            }
            const manifest = manifestModule.default;

            if (!manifest.id || !manifest.name || !manifest.version || !manifest.initialize) {
                loggingSystem.error("ModuleLoader", `Manifest for ${manifestPath} is invalid. Missing required fields.`, manifest);
                 if(coreSystemsBase.coreUIManager) coreSystemsBase.coreUIManager.showNotification(`Invalid manifest: ${manifestPath.split('/').pop()}. Check console.`, "error", 10000);
                return false;
            }

            if (loadedModules[manifest.id]) {
                loggingSystem.warn("ModuleLoader", `Module '${manifest.id}' is already loaded. Skipping.`);
                return true;
            }

            loggingSystem.info("ModuleLoader", `Loading module: ${manifest.name} (v${manifest.version})`);

            const systemsForModule = {
                ...coreSystemsBase,
                moduleLoader: this
            };
            
            if (!systemsForModule.globalSettingsManager) {
                loggingSystem.error("ModuleLoader_LoadModule_CRITICAL", `globalSettingsManager is MISSING in systemsForModule for module '${manifest.id}'!`);
            }
            if (!systemsForModule.saveLoadSystem) {
                loggingSystem.error("ModuleLoader_LoadModule_CRITICAL", `saveLoadSystem is MISSING in systemsForModule for module '${manifest.id}'!`);
            }
            if (!systemsForModule.buyMultiplierUI) {
                loggingSystem.error("ModuleLoader_LoadModule_CRITICAL", `buyMultiplierUI is MISSING in systemsForModule for module '${manifest.id}'!`);
            }


            const moduleInstance = await manifest.initialize(systemsForModule);

            loadedModules[manifest.id] = {
                manifest: manifest,
                instance: moduleInstance || {},
            };

            loggingSystem.info("ModuleLoader", `Module '${manifest.name}' loaded and initialized successfully.`);
            return true;

        } catch (error) {
            loggingSystem.error("ModuleLoader", `Error loading module from ${manifestPath}:`, error, error.stack);
            if(coreSystemsBase.coreUIManager && coreSystemsBase.coreUIManager.showNotification) {
                coreSystemsBase.coreUIManager.showNotification(`Error loading module: ${manifestPath.split('/').pop()}. Details in console.`, "error", 10000);
            } else {
                console.error("CoreUIManager not available to show notification for module load error.");
            }
            return false;
        }
    },

    getModule(moduleId) {
        return loadedModules[moduleId] ? loadedModules[moduleId].instance : undefined;
    },

    getModuleManifest(moduleId) {
        return loadedModules[moduleId] ? loadedModules[moduleId].manifest : undefined;
    },

    getLoadedModuleIds() {
        return Object.keys(loadedModules);
    },

    broadcastLifecycleEvent(methodName, args = []) {
        loggingSystem.debug("ModuleLoader", `Broadcasting lifecycle event '${methodName}' to all modules.`);
        for (const moduleId in loadedModules) {
            const moduleData = loadedModules[moduleId];
            if (moduleData && moduleData.instance && typeof moduleData.instance[methodName] === 'function') {
                try {
                    moduleData.instance[methodName](...args);
                } catch (error) {
                    loggingSystem.error("ModuleLoader", `Error calling ${methodName} on module '${moduleId}':`, error);
                }
            } else if (moduleData && moduleData.manifest && typeof moduleData.manifest[methodName] === 'function') {
                 try {
                    moduleData.manifest[methodName](...args);
                } catch (error) {
                    loggingSystem.error("ModuleLoader", `Error calling ${methodName} on manifest of module '${moduleId}':`, error);
                }
            }
        }
    },

    notifyAllModulesOfLoad() {
        this.broadcastLifecycleEvent('onGameLoad');
    },
    
    resetAllModules() {
        this.broadcastLifecycleEvent('onResetState');
    }
};

export { moduleLoader };
