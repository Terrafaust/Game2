// game/js/modules/studies_module/studies_manifest.js

/**
 * @fileoverview Manifest file for the Studies module.
 * Defines the module's metadata, dependencies, and UI registration points.
 */

/**
 * The manifest object for the Studies module.
 * It provides essential information for the ModuleLoader and CoreUIManager.
 */
const StudiesManifest = {
    // Unique identifier for this module. Used for loading and referencing.
    id: 'studies_module',
    // Display name for the module, used in UI elements like menu tabs.
    name: 'Studies',
    // List of other modules or core services this module depends on.
    // The ModuleLoader will ensure these are loaded before this module.
    dependencies: [
        'core_gameplay_module', // Depends on the initial gameplay module for basic resources
        'coreResourceManager',  // For managing resources like Study Points and Knowledge
        'coreUIManager',        // For UI interactions, tab registration, and content rendering
        'coreGameStateManager', // For checking and setting global game state flags (e.g., unlocks)
        'decimalUtility',       // For all large number calculations
        'gameLoop',             // For hooking into the game loop for production updates
        'saveLoadSystem',       // For saving and loading module-specific state
        'staticDataAggregator', // For registering module's static data
        'loggingSystem'         // For logging module-specific messages
    ],
    // Configuration for how this module's UI should be registered with CoreUIManager.
    ui: {
        // Defines a menu tab for this module.
        menuTab: {
            // The ID for the tab, used internally by CoreUIManager.
            id: 'studies-tab',
            // The text displayed on the menu tab.
            text: 'Studies',
            // The target content area where this module's UI will be rendered.
            // This corresponds to the 'data-tab-target' attribute in index.html.
            targetContentId: 'studies_content',
            // A function that returns true if the tab should be visible, false otherwise.
            // This allows for conditional unlocking of menu tabs.
            // In this case, the 'Studies' tab unlocks when the player has at least 10 Study Points.
            // It uses coreResourceManager to check the amount of 'studyPoints'.
            // The 'coreResourceManager' and 'decimalUtility' objects are passed as arguments
            // because they are dependencies and will be available in the global scope
            // after the CoreEngine initializes them.
            unlockCondition: (coreResourceManager, decimalUtility) => {
                // Ensure coreResourceManager and decimalUtility are available before checking.
                if (!coreResourceManager || !decimalUtility) {
                    return false;
                }
                // Check if the player has 10 or more Study Points.
                const studyPointsAmount = coreResourceManager.getAmount('studyPoints');
                return studyPointsAmount && studyPointsAmount.greaterThanOrEqualTo(decimalUtility.new(10));
            },
            // A tooltip message to display when the tab is locked.
            lockedTooltip: 'Reach 10 Study Points to unlock Studies.'
        }
    },
    // Initialization function for the module.
    // This function will be called by the ModuleLoader after all dependencies are met.
    // It receives a context object containing references to core engine services.
    init: (context) => {
        // Import module-specific components using the provided context.
        const {
            coreResourceManager,
            coreUIManager,
            coreGameStateManager,
            decimalUtility,
            gameLoop,
            saveLoadSystem,
            staticDataAggregator,
            loggingSystem
        } = context;

        // Load module-specific data, logic, UI, and state.
        // These are assumed to be available in the global scope or passed via context.
        // For simplicity in this example, we'll assume they are globally accessible
        // after their respective script files are loaded.
        // In a more complex setup, these might be imported directly if using a build system.
        const studiesData = typeof StudiesData !== 'undefined' ? StudiesData : null;
        const studiesLogic = typeof StudiesLogic !== 'undefined' ? StudiesLogic : null;
        const studiesUI = typeof StudiesUI !== 'undefined' ? StudiesUI : null;
        const studiesState = typeof StudiesState !== 'undefined' ? StudiesState : null;

        // Log the initialization of the Studies module.
        loggingSystem.log('Studies module initializing...', 'StudiesManifest');

        // Check if all necessary components are loaded.
        if (!studiesData || !studiesLogic || !studiesUI || !studiesState) {
            loggingSystem.error('Studies module failed to load one or more components (Data, Logic, UI, State).', 'StudiesManifest');
            return;
        }

        // Pass core engine services and module components to the logic and UI for their setup.
        studiesLogic.init(coreResourceManager, coreGameStateManager, decimalUtility, studiesData, studiesState, loggingSystem);
        studiesUI.init(coreUIManager, studiesLogic, studiesData, studiesState, decimalUtility, loggingSystem);

        // Register module's static data with the StaticDataAggregator.
        // This makes producer definitions and other static data accessible globally if needed.
        staticDataAggregator.registerModuleData(StudiesManifest.id, studiesData);

        // Register the module's state with the SaveLoadSystem.
        // This ensures the module's dynamic data is saved and loaded.
        saveLoadSystem.registerModuleState(StudiesManifest.id, studiesState.getState, studiesState.loadState);

        // Register the module's update function with the GameLoop.
        // This ensures that the module's logic (e.g., production calculations) runs every tick.
        gameLoop.registerUpdate(studiesLogic.update);

        // Register the module's UI render function with CoreUIManager.
        // This ensures the UI is rendered when the tab is active.
        coreUIManager.registerContentRenderer(StudiesManifest.ui.menuTab.targetContentId, studiesUI.render);

        // Register the menu tab with CoreUIManager.
        coreUIManager.registerMenuTab(StudiesManifest.ui.menuTab);

        loggingSystem.log('Studies module initialized successfully.', 'StudiesManifest');
    }
};

// Make the manifest globally accessible for the ModuleLoader.
// In a more advanced setup, this would be handled by a module system.
if (typeof window !== 'undefined') {
    window.StudiesManifest = StudiesManifest;
}
