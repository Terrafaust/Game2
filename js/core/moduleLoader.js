// js/core/moduleLoader.js (v2.1 - Debug)

/**
 * @file moduleLoader.js
 * @description Handles loading, initializing, and managing game feature modules.
 * v2.1: Added debug log for decimalUtilityRef.
 */

import { loggingSystem } from './loggingSystem.js';

let coreSystems = {
    staticDataAggregator: null,
    coreGameStateManager: null,
    coreResourceManager: null,
    coreUIManager: null,
    decimalUtility: null,
    loggingSystem: null,
    gameLoop: null,
    coreUpgradeManager: null,
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
        coreUpgradeManagerRef
    ) {
        coreSystems.staticDataAggregator = staticDataAggregatorRef;
        coreSystems.coreGameStateManager = coreGameStateManagerRef;
        coreSystems.coreResourceManager = coreResourceManagerRef;
        coreSystems.coreUIManager = coreUIManagerRef;
        coreSystems.decimalUtility = decimalUtilityRef;
        coreSystems.loggingSystem = loggingSystemRef; // This is loggingSystem from import, not the ref
        coreSystems.gameLoop = gameLoopRef;
        coreSystems.coreUpgradeManager = coreUpgradeManagerRef;

        // --- Debug Log Added ---
        if (typeof decimalUtilityRef === 'undefined') {
            console.error("CRITICAL ERROR in ModuleLoader: decimalUtilityRef is undefined!");
            loggingSystem.error("ModuleLoader_Critical", "decimalUtilityRef received in initialize is undefined. This will break modules.");
        } else {
            loggingSystem.info("ModuleLoader", "decimalUtilityRef received successfully in initialize:", decimalUtilityRef);
        }
        // --- End Debug Log ---

        loggingSystem.info("ModuleLoader", "Module Loader initialized with core systems (v2.1).");
    },

    async loadModule(manifestPath) {
        loggingSystem.debug("ModuleLoader", `Attempting to load module from manifest: ${manifestPath}`);
        try {
            const manifestModule = await import(manifestPath);
            if (!manifestModule || !manifestModule.default) {
                loggingSystem.error("ModuleLoader", `Failed to load manifest from ${manifestPath}. No default export or module is empty.`);
                if(coreSystems.coreUIManager) coreSystems.coreUIManager.showNotification(`Failed to load structure for: ${manifestPath.split('/').pop()}. Check console.`, "error", 10000);
                return false;
            }
            const manifest = manifestModule.default;

            if (!manifest.id || !manifest.name || !manifest.version || !manifest.initialize) {
                loggingSystem.error("ModuleLoader", `Manifest for ${manifestPath} is invalid. Missing required fields.`, manifest);
                if(coreSystems.coreUIManager) coreSystems.coreUIManager.showNotification(`Invalid manifest: ${manifestPath.split('/').pop()}. Check console.`, "error", 10000);
                return false;
            }

            if (loadedModules[manifest.id]) {
                loggingSystem.warn("ModuleLoader", `Module '${manifest.id}' is already loaded. Skipping.`);
                return true;
            }

            loggingSystem.info("ModuleLoader", `Loading module: ${manifest.name} (v${manifest.version})`);
            const moduleInstance = await manifest.initialize(coreSystems);

            loadedModules[manifest.id] = {
                manifest: manifest,
                instance: moduleInstance || {},
            };

            loggingSystem.info("ModuleLoader", `Module '${manifest.name}' loaded and initialized successfully.`);
            return true;

        } catch (error) {
            loggingSystem.error("ModuleLoader", `Error loading module from ${manifestPath}:`, error);
            // Check if coreUIManager is available before trying to use it
            if(coreSystems.coreUIManager && coreSystems.coreUIManager.showNotification) {
                coreSystems.coreUIManager.showNotification(`Error loading module: ${manifestPath.split('/').pop()}. Game may not function correctly.`, "error", 10000);
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
