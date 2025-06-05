// js/core/moduleLoader.js (v2.3.1 - Fix Duplicate Export)

/**
 * @file moduleLoader.js
 * @description Handles loading, initializing, and managing game feature modules.
 * v2.3.1: Fixes duplicate export error by ensuring single export statement. Accepts and passes globalSettingsManager.
 * v2.3: Accepts and passes globalSettingsManager to modules.
 * v2.2: Ensures moduleLoader itself is part of the coreSystems passed to modules.
 */

import { loggingSystem } from './loggingSystem.js';

// The moduleLoader itself will be added to coreSystems before passing to modules
let coreSystemsBase = {
    staticDataAggregator: null,
    coreGameStateManager: null,
    coreResourceManager: null,
    coreUIManager: null,
    decimalUtility: null,
    loggingSystem: null, // This will be the imported loggingSystem instance
    gameLoop: null,
    coreUpgradeManager: null,
    globalSettingsManager: null, // Added globalSettingsManager
    // moduleLoader: null // This will be added dynamically in loadModule
};

const loadedModules = {
    // moduleId: { manifest: object, instance: object (the module's main exported object) }
};

const moduleLoader = { // Declared as const, not exported inline
    initialize(
        staticDataAggregatorRef,
        coreGameStateManagerRef,
        coreResourceManagerRef,
        coreUIManagerRef,
        decimalUtilityRef,
        loggingSystemRef, // Note: This is the imported loggingSystem, not a separate ref if it's a singleton
        gameLoopRef,
        coreUpgradeManagerRef,
        globalSettingsManagerRef // Added globalSettingsManagerRef parameter
    ) {
        coreSystemsBase.staticDataAggregator = staticDataAggregatorRef;
        coreSystemsBase.coreGameStateManager = coreGameStateManagerRef;
        coreSystemsBase.coreResourceManager = coreResourceManagerRef;
        coreSystemsBase.coreUIManager = coreUIManagerRef;
        coreSystemsBase.decimalUtility = decimalUtilityRef;
        coreSystemsBase.loggingSystem = loggingSystem; // Use the directly imported loggingSystem
        coreSystemsBase.gameLoop = gameLoopRef;
        coreSystemsBase.coreUpgradeManager = coreUpgradeManagerRef;
        coreSystemsBase.globalSettingsManager = globalSettingsManagerRef; // Assign ref

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

        loggingSystem.info("ModuleLoader", "Module Loader initialized with core systems (v2.3.1).");
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
                loggingSystem.error("ModuleLoader_LoadModule_CRITICAL", `globalSettingsManager is MISSING in systemsForModule right before passing to module '${manifest.id}'!`, Object.keys(systemsForModule));
            } else {
                loggingSystem.debug("ModuleLoader_LoadModule", `globalSettingsManager is PRESENT in systemsForModule for module '${manifest.id}'.`);
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

// Single export statement at the end of the file
export { moduleLoader };
