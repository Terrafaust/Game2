// js/core/moduleLoader.js (v3.1 - Bugfix)
// Corrects the notification message to use the manifest filename on error.

import { loggingSystem } from './loggingSystem.js';

let coreSystemsBase = {};
const loadedModules = {};

export const moduleLoader = {
    initialize(coreSystems) {
        coreSystemsBase = coreSystems;
        loggingSystem.info("ModuleLoader", "Module Loader initialized with all core systems.");
    },

    async loadModule(manifestPath) {
        loggingSystem.debug("ModuleLoader", `Attempting to load module from manifest: ${manifestPath}`);
        try {
            const manifestModule = await import(manifestPath);
            const manifest = manifestModule.default;

            if (!manifest || !manifest.id || !manifest.initialize) {
                loggingSystem.error("ModuleLoader", `Manifest for ${manifestPath} is invalid or missing required fields.`);
                coreSystemsBase.coreUIManager.showNotification(`Invalid manifest: ${manifestPath.split('/').pop()}.`, "error", 10000);
                return false;
            }

            if (loadedModules[manifest.id]) {
                loggingSystem.warn("ModuleLoader", `Module '${manifest.id}' is already loaded. Skipping.`);
                return true;
            }

            loggingSystem.info("ModuleLoader", `Loading module: ${manifest.name} (v${manifest.version})`);

            const systemsForModule = { ...coreSystemsBase, moduleLoader: this };
            
            const moduleInstance = await manifest.initialize(systemsForModule);

            loadedModules[manifest.id] = {
                manifest: manifest,
                instance: moduleInstance || {},
            };

            loggingSystem.info("ModuleLoader", `Module '${manifest.name}' loaded successfully.`);
            return true;

        } catch (error) {
            loggingSystem.error("ModuleLoader", `Error loading module from ${manifestPath}:`, error, error.stack);
            if(coreSystemsBase.coreUIManager?.showNotification) {
                // THIS IS THE FIX: Ensure the translation key exists or provide a fallback.
                const filename = manifestPath.split('/').pop();
                coreSystemsBase.coreUIManager.showNotification(`Error loading module: ${filename}.`, "error", 10000);
            }
            return false;
        }
    },

    getModule(moduleId) {
        return loadedModules[moduleId]?.instance;
    },

    getLoadedModuleIds() {
        return Object.keys(loadedModules);
    },

    broadcastLifecycleEvent(methodName, args = []) {
        loggingSystem.debug("ModuleLoader", `Broadcasting lifecycle event '${methodName}' to all modules.`);
        for (const moduleId in loadedModules) {
            const moduleInstance = loadedModules[moduleId].instance;
            if (moduleInstance && typeof moduleInstance[methodName] === 'function') {
                try {
                    moduleInstance[methodName](...args);
                } catch (error) {
                    loggingSystem.error("ModuleLoader", `Error calling ${methodName} on module '${moduleId}':`, error);
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
