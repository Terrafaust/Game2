// modules/settings_ui_module/settings_ui_ui.js (v1)

/**
 * @file settings_ui_ui.js
 * @description Handles UI rendering for the Settings UI module.
 */

import { staticModuleData } from './settings_ui_data.js';

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null;

export const ui = {
    initialize(coreSystems, stateRef, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        coreSystemsRef.loggingSystem.info("SettingsUI_UI", "UI initialized (v1).");
    },

    renderMainContent(parentElement) {
        if (!coreSystemsRef || !moduleLogicRef) {
            parentElement.innerHTML = '<p class="text-red-500">Settings UI not properly initialized.</p>';
            return;
        }
        parentElementCache = parentElement;
        parentElement.innerHTML = ''; 

        const container = document.createElement('div');
        container.className = 'p-4 space-y-8'; // Increased spacing between sections

        const title = document.createElement('h2');
        title.className = 'text-2xl font-semibold text-primary mb-6';
        title.textContent = 'Game Settings';
        container.appendChild(title);

        // --- Display & Theme Section ---
        container.appendChild(this._createThemeSection());
        // --- Language Section ---
        container.appendChild(this._createLanguageSection());
        // --- Game Actions Section ---
        container.appendChild(this._createGameActionsSection());
        // --- Statistics Section ---
        container.appendChild(this._createStatisticsSection());
        // --- Automation Section (Placeholder) ---
        container.appendChild(this._createPlaceholderSection(staticModuleData.ui.sections.automation));
        // --- Debug Section ---
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
        const { globalSettingsManager } = coreSystemsRef;
        const section = this._createSectionContainer(staticModuleData.ui.sections.display);
        
        const currentThemeSettings = globalSettingsManager.getSetting('theme', { name: 'modern', mode: 'day' });

        staticModuleData.themes.forEach(theme => {
            const themeGroup = document.createElement('div');
            themeGroup.className = 'mb-3 p-3 border border-gray-600 rounded';
            
            const themeLabel = document.createElement('label');
            themeLabel.className = 'block text-md font-semibold text-textPrimary mb-2';
            themeLabel.textContent = theme.name;
            themeGroup.appendChild(themeLabel);

            const modesContainer = document.createElement('div');
            modesContainer.className = 'flex space-x-2';
            theme.modes.forEach(modeName => { // modeName is "Day" or "Night"
                const modeId = modeName.toLowerCase(); // "day" or "night"
                const button = coreSystemsRef.coreUIManager.createButton(
                    modeName,
                    () => moduleLogicRef.applyTheme(theme.id, modeId),
                    ['flex-1', 'py-1.5', 'text-sm']
                );
                if (currentThemeSettings.name === theme.id && currentThemeSettings.mode === modeId) {
                    button.classList.add('bg-accentOne', 'text-white'); // Highlight active theme and mode
                    button.classList.remove('bg-primary');
                } else {
                    button.classList.add('bg-primary');
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
        select.addEventListener('change', (e) => moduleLogicRef.applyLanguage(e.target.value));
        section.appendChild(select);
        return section;
    },

    _createGameActionsSection() {
        const { saveLoadSystem, coreUIManager } = coreSystemsRef;
        const section = this._createSectionContainer(staticModuleData.ui.sections.gameActions);
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'flex flex-wrap gap-2'; // Allow wrapping on small screens

        const saveBtn = coreUIManager.createButton("Save Game", () => saveLoadSystem.saveGame(), ['bg-green-600']);
        const loadBtn = coreUIManager.createButton("Load Game", () => {
            // This logic is similar to main.js, ensure loop is handled
            const wasRunning = coreSystemsRef.gameLoop.isRunning();
            if (wasRunning) coreSystemsRef.gameLoop.stop();
            if (saveLoadSystem.loadGame()) {
                coreSystemsRef.moduleLoader.notifyAllModulesOfLoad();
            }
            if (wasRunning || !coreSystemsRef.gameLoop.isRunning()) {
                setTimeout(() => coreSystemsRef.gameLoop.start(), 100);
            }
        }, ['bg-blue-600']);
        
        actionsContainer.appendChild(saveBtn);
        actionsContainer.appendChild(loadBtn);
        section.appendChild(actionsContainer);
        return section;
    },
    
    _createStatisticsSection() {
        const section = this._createSectionContainer(staticModuleData.ui.sections.statistics);
        const statsContent = document.createElement('div');
        statsContent.id = 'game-statistics-content';
        statsContent.className = 'text-sm text-textSecondary space-y-1';
        statsContent.innerHTML = moduleLogicRef.getGameStatistics(); // Get HTML string from logic
        section.appendChild(statsContent);
        return section;
    },

    _createDebugSection() {
        const { loggingSystem, coreUIManager } = coreSystemsRef;
        const section = this._createSectionContainer(staticModuleData.ui.sections.debug);
        
        const viewLogsButton = coreUIManager.createButton("View Game Logs", () => {
            const logHistory = loggingSystem.getLogHistory();
            let logHTML = '<div class="max-h-60 overflow-y-auto bg-background p-2 rounded text-xs space-y-1">';
            logHistory.forEach(log => {
                const time = log.timestamp.toLocaleTimeString();
                const messages = log.messages.join(' ');
                let color = "text-gray-400";
                if (log.level.includes("ERROR")) color = "text-red-400";
                else if (log.level.includes("WARN")) color = "text-yellow-400";
                else if (log.level.includes("INFO") && log.tag === "Main_DevTools") color = "text-emerald-400";
                else if (log.level.includes("INFO")) color = "text-blue-400";


                logHTML += `<p class="${color}"><span class="font-mono">[${time}]${log.level}${log.tag ? '['+log.tag+']' : ''}:</span> ${messages.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
            });
            logHTML += "</div>";
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
        // For settings, most updates are handled by globalSettingsManager events or re-rendering the section
        // However, if statistics need to be live, this is where they'd refresh.
        if (parentElementCache) {
            const statsContent = parentElementCache.querySelector('#game-statistics-content');
            if (statsContent) {
                statsContent.innerHTML = moduleLogicRef.getGameStatistics();
            }
             // Re-render theme section to update button states
            const oldThemeSection = parentElementCache.querySelector('#settings-section-display'); // Assume an ID for the section
            if(oldThemeSection) oldThemeSection.replaceWith(this._createThemeSection());

            // Re-render language section to update selection
            const oldLangSection = parentElementCache.querySelector('#settings-section-language');
            if(oldLangSection) oldLangSection.replaceWith(this._createLanguageSection());
        }
    },

    onShow() {
        coreSystemsRef.loggingSystem.debug("SettingsUI_UI", "Settings tab shown.");
        // Re-render content on show to reflect current settings accurately, especially theme buttons
        if(parentElementCache) this.renderMainContent(parentElementCache);
    },

    onHide() {
        coreSystemsRef.loggingSystem.debug("SettingsUI_UI", "Settings tab hidden.");
    }
};
