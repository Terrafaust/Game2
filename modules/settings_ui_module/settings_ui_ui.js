// modules/settings_ui_module/settings_ui_ui.js (v1.2 - Play Time Display Fix)

/**
 * @file settings_ui_ui.js
 * @description Handles UI rendering for the Settings UI module.
 * v1.2: Ensures play time statistics are explicitly updated when tab is shown.
 * v1.1: Ensures onShow correctly re-renders content to the main-content div.
 */

import { staticModuleData } from './settings_ui_data.js';

let coreSystemsRef = null;
let moduleLogicRef = null;
// parentElementCache is removed as it's less reliable than querying the DOM directly in onShow or relying on the passed parentElement.

export const ui = {
    initialize(coreSystems, stateRef, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        coreSystemsRef.loggingSystem.info("SettingsUI_UI", "UI initialized (v1.2).");
    },

    renderMainContent(parentElement) {
        if (!coreSystemsRef || !moduleLogicRef) {
            if(parentElement) parentElement.innerHTML = '<p class="text-red-500">Settings UI not properly initialized.</p>';
            else console.error("SettingsUI_UI: renderMainContent called with no parentElement and systems not init.");
            return;
        }
        if (!parentElement) {
            coreSystemsRef.loggingSystem.error("SettingsUI_UI", "renderMainContent called without a parentElement.");
            return;
        }
        
        parentElement.innerHTML = ''; // Clear previous content

        const container = document.createElement('div');
        container.className = 'p-4 space-y-6';

        const title = document.createElement('h2');
        title.className = 'text-2xl font-semibold text-primary mb-6';
        title.textContent = 'Game Settings & Statistics';
        container.appendChild(title);

        // Settings section
        const settingsSection = document.createElement('section');
        settingsSection.className = 'bg-surface-dark p-4 rounded-lg shadow-md';
        settingsSection.innerHTML = `
            <h3 class="text-xl font-medium text-secondary mb-3">General Settings</h3>
            <div class="space-y-4">
                <div class="flex flex-col">
                    <label for="theme-select" class="text-textPrimary text-sm mb-1">Theme:</label>
                    <select id="theme-select" class="p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-accent focus:ring focus:ring-accent focus:ring-opacity-50">
                        ${staticModuleData.themes.map(theme => 
                            `<option value="${theme.id}" ${coreSystemsRef.globalSettingsManager.getSetting('theme.name', 'default') === theme.id ? 'selected' : ''}>${theme.name}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="flex flex-col">
                    <label for="theme-mode-select" class="text-textPrimary text-sm mb-1">Theme Mode:</label>
                    <select id="theme-mode-select" class="p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-accent focus:ring focus:ring-accent focus:ring-opacity-50">
                        <option value="light" ${coreSystemsRef.globalSettingsManager.getSetting('theme.mode', 'dark') === 'light' ? 'selected' : ''}>Light</option>
                        <option value="dark" ${coreSystemsRef.globalSettingsManager.getSetting('theme.mode', 'dark') === 'dark' ? 'selected' : ''}>Dark</option>
                    </select>
                </div>
                <div class="flex flex-col">
                    <label for="language-select" class="text-textPrimary text-sm mb-1">Language:</label>
                    <select id="language-select" class="p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-accent focus:ring focus:ring-accent focus:ring-opacity-50">
                        ${staticModuleData.languages.map(lang => 
                            `<option value="${lang.id}" ${coreSystemsRef.globalSettingsManager.getSetting('language', 'en') === lang.id ? 'selected' : ''}>${lang.name}</option>`
                        ).join('')}
                    </select>
                </div>
            </div>
        `;
        container.appendChild(settingsSection);

        // Attach event listeners for settings controls
        requestAnimationFrame(() => {
            const themeSelect = document.getElementById('theme-select');
            const themeModeSelect = document.getElementById('theme-mode-select');
            const languageSelect = document.getElementById('language-select');

            if (themeSelect) {
                themeSelect.onchange = (e) => {
                    moduleLogicRef.applyTheme(e.target.value, themeModeSelect.value);
                    coreSystemsRef.coreUIManager.applyTheme(e.target.value, themeModeSelect.value); // Apply theme immediately to UI
                };
            }
            if (themeModeSelect) {
                themeModeSelect.onchange = (e) => {
                    moduleLogicRef.applyTheme(themeSelect.value, e.target.value);
                    coreSystemsRef.coreUIManager.applyTheme(themeSelect.value, e.target.value); // Apply theme immediately to UI
                };
            }
            if (languageSelect) {
                languageSelect.onchange = (e) => moduleLogicRef.applyLanguage(e.target.value);
            }
        });


        // Save/Load/Reset section
        const dataManagementSection = document.createElement('section');
        dataManagementSection.className = 'bg-surface-dark p-4 rounded-lg shadow-md';
        dataManagementSection.innerHTML = `
            <h3 class="text-xl font-medium text-secondary mb-3">Data Management</h3>
            <div class="flex flex-wrap gap-3">
                ${coreSystemsRef.coreUIManager.createButton('Save Game', () => coreSystemsRef.saveLoadSystem.saveGame(), ['bg-blue-600', 'hover:bg-blue-700', 'flex-1', 'min-w-[120px]']).outerHTML}
                ${coreSystemsRef.coreUIManager.createButton('Load Game', () => coreSystemsRef.saveLoadSystem.loadGame(), ['bg-blue-600', 'hover:bg-blue-700', 'flex-1', 'min-w-[120px]']).outerHTML}
                ${coreSystemsRef.coreUIManager.createButton('Hard Reset (Delete Save)', () => {
                    coreSystemsRef.coreUIManager.showModal(
                        "Confirm Hard Reset",
                        "Are you sure you want to hard reset the game? This will delete all your progress and cannot be undone!",
                        [
                            { label: "Cancel", callback: () => coreSystemsRef.coreUIManager.closeModal(), className: 'bg-gray-500 hover:bg-gray-600' },
                            { label: "Reset Game", callback: () => {
                                coreSystemsRef.coreUIManager.closeModal();
                                coreSystemsRef.saveLoadSystem.resetGameData(false);
                            }, className: 'bg-red-600 hover:bg-red-700' }
                        ]
                    );
                }, ['bg-red-600', 'hover:bg-red-700', 'flex-1', 'min-w-[120px]']).outerHTML}
            </div>
        `;
        container.appendChild(dataManagementSection);

        // Game Statistics section
        const statsSection = document.createElement('section');
        statsSection.className = 'bg-surface-dark p-4 rounded-lg shadow-md';
        statsSection.innerHTML = `
            <h3 class="text-xl font-medium text-secondary mb-3">Game Statistics</h3>
            <div id="game-statistics-content">
                ${moduleLogicRef.getGameStatistics()}
            </div>
        `;
        container.appendChild(statsSection);

        parentElement.appendChild(container);
    },

    // This method is called directly by the game loop's uiUpdate phase
    updateGameStatistics() {
        const mainContentDiv = document.getElementById('main-content');
        // Only update if settings tab is active and main-content exists
        if (mainContentDiv && coreSystemsRef && coreSystemsRef.coreUIManager && coreSystemsRef.coreUIManager.isActiveTab('settings_ui')) {
            const statsContent = mainContentDiv.querySelector('#game-statistics-content');
            if (statsContent && moduleLogicRef && typeof moduleLogicRef.getGameStatistics === 'function') {
                statsContent.innerHTML = moduleLogicRef.getGameStatistics();
            }
        }
    },

    onShow() {
        if (!coreSystemsRef || !coreSystemsRef.loggingSystem) {
            console.error("SettingsUI_UI: onShow called before coreSystemsRef is fully initialized.");
            return;
        }
        coreSystemsRef.loggingSystem.debug("SettingsUI_UI", "Settings tab shown.");
        const mainContentDiv = document.getElementById('main-content');
        if (mainContentDiv) {
            this.renderMainContent(mainContentDiv); // Re-render all content to refresh stats and buttons
            this.updateGameStatistics(); // Explicitly update just the stats part immediately after re-render
        } else {
            coreSystemsRef.loggingSystem.error("SettingsUI_UI", "onShow: main-content element not found!");
        }
    },

    onHide() {
        if (!coreSystemsRef || !coreSystemsRef.loggingSystem) {
            console.error("SettingsUI_UI: onHide called before coreSystemsRef is fully initialized.");
            return;
        }
        coreSystemsRef.loggingSystem.debug("SettingsUI_UI", "Settings tab hidden.");
    }
};
