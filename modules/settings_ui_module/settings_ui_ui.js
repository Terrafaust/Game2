// modules/settings_ui_module/settings_ui.js (v2.0 - Final Refactor)
// Fully integrated with translationManager.

import { staticModuleData } from './settings_ui_data.js';
import { MODULES } from '../../core/constants.js';

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null;

export const ui = {
    initialize(coreSystems, stateRef, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        coreSystemsRef.loggingSystem.info("SettingsUI_UI", "UI initialized (v2.0).");
        document.addEventListener('languagePackChanged', () => {
             if (coreSystemsRef.coreUIManager.isActiveTab(MODULES.SETTINGS)) this.renderMainContent(parentElementCache);
        });
    },

    renderMainContent(parentElement) {
        if (!parentElement || !coreSystemsRef || !moduleLogicRef) return;
        parentElementCache = parentElement;
        parentElement.innerHTML = ''; 

        const { translationManager } = coreSystemsRef;
        const container = document.createElement('div');
        container.className = 'p-4 space-y-8';

        container.innerHTML = `<h2 class="text-2xl font-semibold text-primary mb-6">${translationManager.get('settings.ui.title')}</h2>`;

        if (moduleLogicRef.areThemesUnlocked()) {
            container.appendChild(this._createThemeSection());
        }
        container.appendChild(this._createLanguageSection());
        container.appendChild(this._createGameActionsSection());
        if (moduleLogicRef.areStatsUnlocked()) {
            container.appendChild(this._createStatisticsSection());
        }
        container.appendChild(this._createDebugSection());

        parentElement.appendChild(container);
    },

    _createSectionContainer(titleKey) {
        const section = document.createElement('section');
        section.className = 'p-4 border border-gray-700 rounded-lg bg-surface-dark';
        const title = document.createElement('h3');
        title.className = 'text-xl font-medium text-secondary border-b border-gray-600 pb-2 mb-4';
        title.textContent = coreSystemsRef.translationManager.get(titleKey);
        section.appendChild(title);
        return section;
    },

    _createThemeSection() {
        const { globalSettingsManager, coreUIManager } = coreSystemsRef;
        const section = this._createSectionContainer('settings.ui.display_section');
        const currentTheme = globalSettingsManager.getSetting('theme');

        staticModuleData.themes.forEach(theme => {
            const group = document.createElement('div');
            group.className = 'mb-3 p-3 border border-gray-600 rounded';
            group.innerHTML = `<label class="block text-md font-semibold text-textPrimary mb-2">${theme.name}</label>`;
            
            const modesContainer = document.createElement('div');
            modesContainer.className = 'flex space-x-2';
            theme.modes.forEach(modeName => { 
                const modeId = modeName.toLowerCase(); 
                const button = coreUIManager.createButton(modeName, () => {
                    moduleLogicRef.applyTheme(theme.id, modeId);
                    this.renderMainContent(parentElementCache);
                }, ['flex-1', 'py-1.5', 'text-sm']);

                if (currentTheme.name === theme.id && currentTheme.mode === modeId) {
                    button.classList.add('bg-accentOne', 'text-white');
                } else {
                    button.classList.add('bg-primary');
                }
                modesContainer.appendChild(button);
            });
            group.appendChild(modesContainer);
            section.appendChild(group);
        });
        return section;
    },
    
    _createLanguageSection() {
        const { globalSettingsManager, translationManager } = coreSystemsRef;
        const section = this._createSectionContainer('settings.ui.language_section');
        const currentLang = globalSettingsManager.getSetting('language', 'en');

        const label = document.createElement('label');
        label.htmlFor = 'language-select';
        label.textContent = translationManager.get('settings.ui.language_select_label');
        label.className = 'mr-2 text-textSecondary';
        
        const select = document.createElement('select');
        select.id = 'language-select';
        select.className = 'bg-surface text-textPrimary p-2 rounded border border-gray-600';
        staticModuleData.languages.forEach(lang => {
            select.innerHTML += `<option value="${lang.id}" ${lang.id === currentLang ? 'selected' : ''}>${lang.name}</option>`;
        });
        select.addEventListener('change', (e) => moduleLogicRef.applyLanguage(e.target.value));
        
        section.append(label, select);
        return section;
    },

    _createGameActionsSection() {
        const { saveLoadSystem, coreUIManager, translationManager } = coreSystemsRef;
        const section = this._createSectionContainer('settings.ui.actions_section');
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'flex flex-wrap gap-2';

        const saveBtn = coreUIManager.createButton(translationManager.get('ui.buttons.save'), () => saveLoadSystem.saveGame(), ['bg-green-600']);
        const loadBtn = coreUIManager.createButton(translationManager.get('ui.buttons.load'), () => saveLoadSystem.loadGame(), ['bg-blue-600']);
        const resetBtn = coreUIManager.createButton(translationManager.get('ui.buttons.hard_reset'), () => saveLoadSystem.resetGameData(), ['bg-red-600']);
        
        actionsContainer.append(saveBtn, loadBtn, resetBtn);
        section.appendChild(actionsContainer);
        return section;
    },
    
    _createStatisticsSection() {
        const section = this._createSectionContainer('settings.ui.stats_section');
        const statsContent = document.createElement('div');
        statsContent.id = 'game-statistics-content';
        statsContent.className = 'text-sm text-textSecondary space-y-1';
        statsContent.innerHTML = moduleLogicRef.getGameStatistics();
        section.appendChild(statsContent);
        return section;
    },

    _createDebugSection() {
        const { coreUIManager, translationManager, loggingSystem } = coreSystemsRef;
        const section = this._createSectionContainer('settings.ui.debug_section');
        const viewLogsButton = coreUIManager.createButton(translationManager.get('settings.ui.view_logs_button'), () => {
            const logHistory = loggingSystem.getLogHistory();
            let logHTML = '<div class="max-h-60 overflow-y-auto bg-background p-2 rounded text-xs space-y-1">';
            logHistory.forEach(log => {
                let color = "text-gray-400";
                if (log.level?.includes("ERROR")) color = "text-red-400";
                else if (log.level?.includes("WARN")) color = "text-yellow-400";
                logHTML += `<p class="${color}"><span class="font-mono">[${log.timestamp.toLocaleTimeString()}]${log.level}${log.tag ? '['+log.tag+']' : ''}:</span> ${log.messages.join(' ')}</p>`;
            });
            logHTML += "</div>";
            coreUIManager.showModal("Game Log History", logHTML, [{label: "ui.buttons.close", callback: () => coreUIManager.closeModal()}]);
        });
        section.appendChild(viewLogsButton);
        return section;
    },

    onShow() {
        if (parentElementCache) this.renderMainContent(parentElementCache);
    },

    onHide() {}
};
