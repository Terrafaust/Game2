// modules/settings_ui_module/settings_ui.js (v1.3 - Removed Placeholder)

/**
 * @file settings_ui.js
 * @description Handles UI rendering for the Settings UI module.
 * v1.3: Removed the 'Automation' placeholder section as per roadmap.
 * v1.2: Added detailed logging to _createDebugSection for log modal.
 * v1.1: Ensures onShow correctly re-renders content to the main-content div.
 */

import { staticModuleData } from './settings_ui_data.js';

let coreSystemsRef = null;
let moduleLogicRef = null;

export const ui = {
    initialize(coreSystems, stateRef, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        coreSystemsRef.loggingSystem.info("SettingsUI_UI", "UI initialized (v1.3).");
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
        
        parentElement.innerHTML = ''; 

        const container = document.createElement('div');
        container.className = 'p-4 space-y-8';

        const title = document.createElement('h2');
        title.className = 'text-2xl font-semibold text-primary mb-6';
        title.textContent = 'Game Settings';
        container.appendChild(title);

        container.appendChild(this._createThemeSection());
        container.appendChild(this._createLanguageSection());
        container.appendChild(this._createGameActionsSection());
        container.appendChild(this._createStatisticsSection());
        // --- MODIFICATION: Removed the placeholder 'Automation' section ---
        // container.appendChild(this._createPlaceholderSection(staticModuleData.ui.sections.automation));
        container.appendChild(this._createDebugSection());

        parentElement.appendChild(container);
    },

    _createSectionContainer(titleText) {
        const section = document.createElement('section');
        section.className = 'p-4 border border-gray-700 rounded-lg bg-surface-dark';
        
        const title = document.createElement('h3');
        title.className = 'text-xl font-medium text-secondary border-b border-gray-600 pb-2 mb-4';
        title.textContent = titleText;
        section.appendChild(title);
        return section;
    },

    _createThemeSection() {
        const { globalSettingsManager, coreUIManager, loggingSystem } = coreSystemsRef;
        const section = this._createSectionContainer(staticModuleData.ui.sections.display);
        section.id = 'settings-section-display'; 
        
        const currentThemeSettings = globalSettingsManager.getSetting('theme', { name: 'modern', mode: 'day' });
        loggingSystem.debug("SettingsUI_ThemeSection", "Current theme for button highlight:", currentThemeSettings);


        staticModuleData.themes.forEach(theme => {
            const themeGroup = document.createElement('div');
            themeGroup.className = 'mb-3 p-3 border border-gray-600 rounded';
            
            const themeLabel = document.createElement('label');
            themeLabel.className = 'block text-md font-semibold text-textPrimary mb-2';
            themeLabel.textContent = theme.name;
            themeGroup.appendChild(themeLabel);

            const modesContainer = document.createElement('div');
            modesContainer.className = 'flex space-x-2';
            theme.modes.forEach(modeName => { 
                const modeId = modeName.toLowerCase(); 
                const button = coreUIManager.createButton(
                    modeName,
                    () => {
                        loggingSystem.debug("SettingsUI_ThemeSection", `Theme button clicked: ${theme.id}, ${modeId}`);
                        moduleLogicRef.applyTheme(theme.id, modeId);
                        const mainContentDiv = document.getElementById('main-content');
                        if (mainContentDiv && coreUIManager.isActiveTab('settings_ui')) {
                             this.renderMainContent(mainContentDiv);
                        }
                    },
                    ['flex-1', 'py-1.5', 'text-sm']
                );
                if (currentThemeSettings.name === theme.id && currentThemeSettings.mode === modeId) {
                    button.classList.add('bg-accentOne', 'text-white'); 
                    button.classList.remove('bg-primary');
                } else {
                    button.classList.add('bg-primary');
                     button.classList.remove('bg-accentOne', 'text-white');
                }
                modesContainer.appendChild(button);
            });
            themeGroup.appendChild(modesContainer);
            section.appendChild(themeGroup);
        });
        return section;
    },
    
    _createLanguageSection() {
        const { globalSettingsManager } = coreSystemsRef;
        const section = this._createSectionContainer(staticModuleData.ui.sections.language);
        section.id = 'settings-section-language';
        const currentLang = globalSettingsManager.getSetting('language', 'en');

        const selectLabel = document.createElement('label');
        selectLabel.htmlFor = 'language-select';
        selectLabel.textContent = 'Select Language: ';
        selectLabel.className = 'mr-2 text-textSecondary';
        section.appendChild(selectLabel);

        const select = document.createElement('select');
        select.id = 'language-select';
        select.className = 'bg-surface text-textPrimary p-2 rounded border border-gray-600 focus:border-primary focus:ring-primary';
        staticModuleData.languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.id;
            option.textContent = lang.name;
            if (lang.id === currentLang) option.selected = true;
            select.appendChild(option);
        });
        select.addEventListener('change', (e) => {
            moduleLogicRef.applyLanguage(e.target.value);
            const mainContentDiv = document.getElementById('main-content');
            if (mainContentDiv && coreSystemsRef.coreUIManager.isActiveTab('settings_ui')) {
                 this.renderMainContent(mainContentDiv);
            }
        });
        section.appendChild(select);
        return section;
    },

    _createGameActionsSection() {
        const { saveLoadSystem, coreUIManager, gameLoop, moduleLoader } = coreSystemsRef;
        const section = this._createSectionContainer(staticModuleData.ui.sections.gameActions);
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'flex flex-wrap gap-2';

        const saveBtn = coreUIManager.createButton("Save Game", () => saveLoadSystem.saveGame(), ['bg-green-600']);
        const loadBtn = coreUIManager.createButton("Load Game", () => {
            coreUIManager.showModal( "Load Game?", "Loading will overwrite your current unsaved progress. Are you sure?",
                [
                    { label: "Load Game", className: "bg-blue-600 hover:bg-blue-700", callback: () => {
                        const wasRunning = gameLoop.isRunning();
                        if (wasRunning) gameLoop.stop();
                        if (saveLoadSystem.loadGame()) {
                            coreUIManager.fullUIRefresh();
                        } else {
                            coreUIManager.showNotification("Failed to load game or no save data found.", "error", 3000);
                        }
                        if (wasRunning || !gameLoop.isRunning()) { setTimeout(() => gameLoop.start(), 100); }
                        coreUIManager.closeModal();
                    }},
                    { label: "Cancel", callback: () => coreUIManager.closeModal() }
                ]
            );
        }, ['bg-blue-600']);

        const resetButton = coreUIManager.createButton("Hard Reset", () => {
             coreUIManager.showModal("Hard Reset Game?", "All progress will be lost permanently. This cannot be undone. Are you sure?",
                [
                    { label: "Reset Game", className: "bg-red-600 hover:bg-red-700", callback: () => {
                        const wasRunning = gameLoop.isRunning();
                        if (wasRunning) gameLoop.stop();
                        
                        saveLoadSystem.resetGameData(); 
                        
                        const coreResourceDefinitions = coreSystemsRef.staticDataAggregator.getData('core_resource_definitions') || {};
                        for (const resId in coreResourceDefinitions) {
                            const resDef = coreResourceDefinitions[resId];
                            coreSystemsRef.coreResourceManager.defineResource(
                                resDef.id, resDef.name, coreSystemsRef.decimalUtility.new(resDef.initialAmount),
                                resDef.showInUI, resDef.isUnlocked, resDef.hasProductionRate
                            );
                        }
                        
                        moduleLoader.resetAllModules(); 
                        
                        const defaultSettings = coreSystemsRef.globalSettingsManager.defaultSettings;
                        coreSystemsRef.globalSettingsManager.resetToDefaults(); 
                        coreUIManager.applyTheme(defaultSettings.theme.name, defaultSettings.theme.mode);

                        coreSystemsRef.coreGameStateManager.setGameVersion("0.5.8");
                        
                        coreUIManager.fullUIRefresh(); 
                        if (wasRunning || !gameLoop.isRunning()) { setTimeout(() => gameLoop.start(), 100); }
                        coreUIManager.closeModal();
                    }},
                    { label: "Cancel", callback: () => coreUIManager.closeModal() }
                ]
            );
        }, ['bg-red-600']);
        
        actionsContainer.appendChild(saveBtn);
        actionsContainer.appendChild(loadBtn);
        actionsContainer.appendChild(resetButton);
        section.appendChild(actionsContainer);
        return section;
    },
    
    _createStatisticsSection() {
        const section = this._createSectionContainer(staticModuleData.ui.sections.statistics);
        const statsContent = document.createElement('div');
        statsContent.id = 'game-statistics-content';
        statsContent.className = 'text-sm text-textSecondary space-y-1';
        if (moduleLogicRef && typeof moduleLogicRef.getGameStatistics === 'function') {
            statsContent.innerHTML = moduleLogicRef.getGameStatistics();
        } else {
            statsContent.innerHTML = "<p>Statistics loading error...</p>";
            coreSystemsRef.loggingSystem.error("SettingsUI_Stats", "moduleLogicRef or getGameStatistics is not available.");
        }
        section.appendChild(statsContent);
        return section;
    },

    _createDebugSection() {
        const { loggingSystem, coreUIManager } = coreSystemsRef;
        const section = this._createSectionContainer(staticModuleData.ui.sections.debug);
        
        const viewLogsButton = coreUIManager.createButton("View Game Logs", () => {
            loggingSystem.debug("SettingsUI_Debug", "View Game Logs button clicked.");
            const logHistory = loggingSystem.getLogHistory();
            loggingSystem.debug("SettingsUI_Debug", `Retrieved ${logHistory.length} log entries.`);

            if (logHistory.length === 0) {
                loggingSystem.info("SettingsUI_Debug", "Log history is empty. Modal will show 'No logs'.");
            } else {
                loggingSystem.debug("SettingsUI_Debug", "First log entry (if any):", logHistory[0]);
            }

            let logHTML = '<div class="max-h-60 overflow-y-auto bg-background p-2 rounded text-xs space-y-1">';
            if (logHistory.length === 0) {
                logHTML += '<p class="text-gray-400">No log entries recorded yet.</p>';
            } else {
                logHistory.forEach(log => {
                    const time = log.timestamp.toLocaleTimeString();
                    const messages = log.messages.map(m => 
                        String(m).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;")
                    ).join(' ');
                    let color = "text-gray-400";
                    if (log.level && log.level.includes("ERROR")) color = "text-red-400";
                    else if (log.level && log.level.includes("WARN")) color = "text-yellow-400";
                    else if (log.level && log.level.includes("INFO")) {
                        if (log.tag && (log.tag.includes("Logic") || log.tag.includes("UI") || log.tag.includes("Manifest") || log.tag.includes("Main") )) {
                             color = "text-blue-400";
                        } else if (log.tag && log.tag.includes("DevTools")) {
                            color = "text-purple-400";
                        } else {
                            color = "text-sky-400";
                        }
                    } else if (log.level && log.level.includes("DEBUG")) {
                        color = "text-teal-400";
                    }


                    logHTML += `<p class="${color}"><span class="font-mono">[${time}]${log.level}${log.tag ? '['+log.tag+']' : ''}:</span> ${messages}</p>`;
                });
            }
            logHTML += "</div>";
            loggingSystem.debug("SettingsUI_Debug", "Log HTML generated. Calling showModal.");
            coreUIManager.showModal("Game Log History (Last 100)", logHTML, [{label: "Close", callback: () => coreUIManager.closeModal()}]);
        });
        section.appendChild(viewLogsButton);
        return section;
    },

    _createPlaceholderSection(titleText) {
        const section = this._createSectionContainer(titleText);
        const placeholderText = document.createElement('p');
        placeholderText.className = 'text-textSecondary italic';
        placeholderText.textContent = 'This feature is currently under development. Stay tuned!';
        section.appendChild(placeholderText);
        return section;
    },

    updateDynamicElements() {
        const mainContentDiv = document.getElementById('main-content');
        if (mainContentDiv && coreSystemsRef && coreSystemsRef.coreUIManager && coreSystemsRef.coreUIManager.isActiveTab('settings_ui')) {
            const statsContent = mainContentDiv.querySelector('#game-statistics-content');
            if (statsContent && moduleLogicRef && typeof moduleLogicRef.getGameStatistics === 'function') {
                const newStatsHTML = moduleLogicRef.getGameStatistics();
                if (statsContent.innerHTML !== newStatsHTML) {
                    statsContent.innerHTML = newStatsHTML;
                }
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
            this.renderMainContent(mainContentDiv);
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
