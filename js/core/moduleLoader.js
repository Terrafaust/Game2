// js/core/moduleLoader.js

/**
 * @file moduleLoader.js
 * @description Handles loading, initializing, and managing game feature modules.
 * Modules are defined by a manifest file and typically include data, logic, UI, and state components.
 */

import { loggingSystem } from './loggingSystem.js';
// Core systems that modules might need access to will be passed during initialization.

let coreSystems = {
    staticDataAggregator: null,
    coreGameStateManager: null,
    coreResourceManager: null,
    coreUIManager: null,
    decimalUtility: null,
    loggingSystem: null, // Already imported, but good to have in the coreSystems object for modules
    gameLoop: null, // Ensure gameLoop is part of coreSystems
};

const loadedModules = {
    // moduleId: { manifest: object, instance: object (the module's main exported object) }
};

const moduleLoader = {
    /**
     * Initializes the module loader with references to core game systems.
     * @param {object} staticDataAggregatorRef
     * @param {object} coreGameStateManagerRef
     * @param {object} coreResourceManagerRef
     * @param {object} coreUIManagerRef
     * @param {object} decimalUtilityRef
     * @param {object} loggingSystemRef
     * @param {object} gameLoopRef - Reference to the gameLoop system
     */
    initialize(
        staticDataAggregatorRef,
        coreGameStateManagerRef,
        coreResourceManagerRef,
        coreUIManagerRef,
        decimalUtilityRef,
        loggingSystemRef,
        gameLoopRef // Added gameLoopRef parameter
    ) {
        coreSystems.staticDataAggregator = staticDataAggregatorRef;
        coreSystems.coreGameStateManager = coreGameStateManagerRef;
        coreSystems.coreResourceManager = coreResourceManagerRef;
        coreSystems.coreUIManager = coreUIManagerRef;
        coreSystems.decimalUtility = decimalUtilityRef;
        coreSystems.loggingSystem = loggingSystemRef;
        coreSystems.gameLoop = gameLoopRef; // Assign gameLoopRef to coreSystems

        loggingSystem.info("ModuleLoader", "Module Loader initialized with core systems.");
    },

    /**
     * Loads a single module from its manifest file path.
     * @param {string} manifestPath - The path to the module's manifest JS file.
     * @returns {Promise<boolean>} True if module loaded and initialized successfully, false otherwise.
     */
    async loadModule(manifestPath) {
        loggingSystem.debug("ModuleLoader", `Attempting to load module from manifest: ${manifestPath}`);
        try {
            // Dynamically import the manifest file
            // The manifest file should export a 'manifest' object.
            const manifestModule = await import(manifestPath);
            if (!manifestModule || !manifestModule.default) {
                loggingSystem.error("ModuleLoader", `Failed to load manifest from ${manifestPath}. No default export or module is empty.`);
                return false;
            }
            const manifest = manifestModule.default;

            if (!manifest.id || !manifest.name || !manifest.version || !manifest.initialize) {
                loggingSystem.error("ModuleLoader", `Manifest for ${manifestPath} is invalid. Missing required fields (id, name, version, initialize function).`, manifest);
                return false;
            }

            if (loadedModules[manifest.id]) {
                loggingSystem.warn("ModuleLoader", `Module '${manifest.id}' is already loaded. Skipping.`);
                return true; // Consider it successful if already loaded
            }

            // TODO: Dependency checking based on manifest.dependencies

            loggingSystem.info("ModuleLoader", `Loading module: ${manifest.name} (v${manifest.version})`);

            // The manifest's initialize function should return the module's main instance/API
            // or handle its own setup (e.g., registering UI, static data).
            // It receives the coreSystems object for interaction.
            const moduleInstance = await manifest.initialize(coreSystems);

            if (!moduleInstance && typeof manifest.initialize !== 'function') {
                 loggingSystem.error("ModuleLoader", `Module '${manifest.id}' initialize function did not run or module instance not returned properly.`);
                // Some modules might just register things and not return an instance, which can be fine.
                // The check should be more nuanced based on module design.
                // For now, if initialize is a function, we assume it handles setup.
            }


            loadedModules[manifest.id] = {
                manifest: manifest,
                instance: moduleInstance || {}, // Store empty object if no instance returned
            };

            loggingSystem.info("ModuleLoader", `Module '${manifest.name}' loaded and initialized successfully.`);
            return true;

        } catch (error) {
            loggingSystem.error("ModuleLoader", `Error loading module from ${manifestPath}:`, error);
            return false;
        }
    },

    /**
     * Retrieves a loaded module's instance.
     * @param {string} moduleId - The ID of the module.
     * @returns {object | undefined} The module instance, or undefined if not loaded.
     */
    getModule(moduleId) {
        return loadedModules[moduleId] ? loadedModules[moduleId].instance : undefined;
    },

    /**
     * Retrieves a loaded module's manifest.
     * @param {string} moduleId - The ID of the module.
     * @returns {object | undefined} The module manifest, or undefined if not loaded.
     */
    getModuleManifest(moduleId) {
        return loadedModules[moduleId] ? loadedModules[moduleId].manifest : undefined;
    },

    /**
     * Gets a list of all loaded module IDs.
     * @returns {string[]}
     */
    getLoadedModuleIds() {
        return Object.keys(loadedModules);
    },

    /**
     * Calls a specific lifecycle method on all loaded modules that have it.
     * Example lifecycle methods: onGameLoad, onGameSave, onUpdate(deltaTime), onReset
     * @param {string} methodName - The name of the method to call on module instances.
     * @param {any[]} [args=[]] - Arguments to pass to the method.
     */
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

    /**
     * Notifies all modules that a game has been loaded.
     * Modules can use this to re-initialize their state from coreGameStateManager.
     */
    notifyAllModulesOfLoad() {
        this.broadcastLifecycleEvent('onGameLoad');
    },
    
    /**
     * Notifies all modules to reset their state.
     */
    resetAllModules() {
        this.broadcastLifecycleEvent('onResetState');
    }

    // TODO: Add methods for unloading modules, checking dependencies, etc.
};

export { moduleLoader };
