// js/core/moduleLoader.js (v3.2 - Path Correction)
// No changes needed here, but provided for completeness.

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
                const errorMsg = `Invalid manifest: ${manifestPath.split('/').pop()}`;
                loggingSystem.error("ModuleLoader", errorMsg);
                coreSystemsBase.coreUIManager.showNotification(errorMsg, "error", 10000);
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
            const filename = manifestPath.split('/').pop();
            const errorMsg = `Error loading module: ${filename}.`;
            loggingSystem.error("ModuleLoader", errorMsg, error, error.stack);
            if(coreSystemsBase.coreUIManager?.showNotification) {
                coreSystemsBase.coreUIManager.showNotification(errorMsg, "error", 10000);
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
