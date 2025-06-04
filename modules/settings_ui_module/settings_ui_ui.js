// js/modules/settings_ui_module/settings_ui_ui.js 

/**
 * @file settings_ui_ui.js
 * @description Handles the UI rendering and interactions for the Settings UI module.
 */

import { staticModuleData } from './settings_ui_data.js';
import { moduleState } from './settings_ui_state.js'; // Import moduleState
// moduleLogic is passed during initialization

let coreSystemsRef = null;
let moduleLogicRef = null;
let parentElementCache = null; // Cache the parent element for rendering

export const ui = {
    /**
     * Initializes the UI component with core system references and module logic.
     * @param {object} coreSystems - References to core game systems.
     * @param {object} logicRef - Reference to the module's logic component.
     */
    initialize(coreSystems, logicRef) {
        coreSystemsRef = coreSystems;
        moduleLogicRef = logicRef;
        coreSystemsRef.loggingSystem.debug("SettingsUI", "UI initialized.");
    },

    /**
     * Renders the main content for the Settings UI module.
     * This is called by coreUIManager when the tab is activated.
     * @param {HTMLElement} parentElement - The DOM element to render content into.
     */
    renderMainContent(parentElement) {
        if (!coreSystemsRef || !moduleLogicRef) {
            parentElement.innerHTML = '<p class="text-red-500">Settings UI not properly initialized.</p>';
            return;
        }
        parentElementCache = parentElement; // Cache for potential re-renders
        parentElement.innerHTML = ''; // Clear previous content

        const { coreUIManager, globalSettingsManager, decimalUtility } = coreSystemsRef;

        const container = document.createElement('div');
        container.className = 'p-4 space-y-6'; // Tailwind classes

        const title = document.createElement('h2');
        title.className = 'text-2xl font-semibold text-primary mb-4';
        title.textContent = 'Game Settings';
        container.appendChild(title);

        const description = document.createElement('p');
        description.className = 'text-textSecondary mb-6';
        description.textContent = 'Configure various aspects of your game experience.';
        container.appendChild(description);

        const settingsGrid = document.createElement('div');
        settingsGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
        container.appendChild(settingsGrid);

        // --- Themes Section ---
        this._renderSectionCard(settingsGrid, 'themes', (cardBody) => {
            const currentTheme = globalSettingsManager.getSetting('theme.name', 'modern');
            const currentMode = globalSettingsManager.getSetting('theme.mode', 'day');

            const themeDisplay = document.createElement('p');
            themeDisplay.id = 'current-theme-display';
            themeDisplay.className = 'text-textPrimary mb-3';
            themeDisplay.textContent = `Current Theme: ${currentTheme} (${currentMode})`;
            cardBody.appendChild(themeDisplay);

            const themeSelect = document.createElement('select');
            themeSelect.id = 'theme-select';
            themeSelect.className = 'w-full p-2 rounded-md bg-surface border border-primary text-textPrimary mb-2';
            staticModuleData.ui.themeOptions.forEach(theme => {
                const option = document.createElement('option');
                option.value = theme.id;
                option.textContent = theme.name;
                if (theme.id === currentTheme) option.selected = true;
                themeSelect.appendChild(option);
            });
            cardBody.appendChild(themeSelect);

            const modeSelect = document.createElement('select');
            modeSelect.id = 'mode-select';
            modeSelect.className = 'w-full p-2 rounded-md bg-surface border border-primary text-textPrimary mb-4';
            staticModuleData.ui.themeModes.forEach(mode => {
                const option = document.createElement('option');
                option.value = mode.id;
                option.textContent = mode.name;
                if (mode.id === currentMode) option.selected = true;
                modeSelect.appendChild(option);
            });
            cardBody.appendChild(modeSelect);

            const applyThemeButton = coreUIManager.createButton(
                'Apply Theme',
                () => moduleLogicRef.applyThemeSetting(themeSelect.value, modeSelect.value),
                ['bg-primary', 'hover:bg-primary-lighter', 'text-white', 'py-2', 'px-4', 'w-full']
            );
            cardBody.appendChild(applyThemeButton);
        });

        // --- Statistics Section ---
        this._renderSectionCard(settingsGrid, 'statistics', (cardBody) => {
            const showStatsButton = coreUIManager.createButton(
                'View Statistics',
                () => this._showStatisticsModal(),
                ['bg-blue-600', 'hover:bg-blue-700', 'text-white', 'py-2', 'px-4', 'w-full']
            );
            cardBody.appendChild(showStatsButton);
        });

        // --- Language Section ---
        this._renderSectionCard(settingsGrid, 'language', (cardBody) => {
            const currentLang = globalSettingsManager.getSetting('language', 'en');

            const langDisplay = document.createElement('p');
            langDisplay.id = 'current-language-display';
            langDisplay.className = 'text-textPrimary mb-3';
            langDisplay.textContent = `Current Language: ${staticModuleData.ui.languageOptions.find(l => l.id === currentLang)?.name || currentLang}`;
            cardBody.appendChild(langDisplay);

            const langSelect = document.createElement('select');
            langSelect.id = 'language-select';
            langSelect.className = 'w-full p-2 rounded-md bg-surface border border-primary text-textPrimary mb-4';
            staticModuleData.ui.languageOptions.forEach(lang => {
                const option = document.createElement('option');
                option.value = lang.id;
                option.textContent = lang.name;
                if (lang.id === currentLang) option.selected = true;
                langSelect.appendChild(option);
            });
            langSelect.addEventListener('change', () => moduleLogicRef.changeLanguageSetting(langSelect.value));
            cardBody.appendChild(langSelect);
        });

        // --- Save/Load Section ---
        this._renderSectionCard(settingsGrid, 'saveLoad', (cardBody) => {
            const saveButton = coreUIManager.createButton(
                'Save Game',
                () => coreSystemsRef.saveLoadSystem.saveGame(),
                ['bg-green-600', 'hover:bg-green-700', 'text-white', 'py-2', 'px-4', 'w-full', 'mb-2']
            );
            cardBody.appendChild(saveButton);

            const loadButton = coreUIManager.createButton(
                'Load Game',
                () => {
                    if (coreSystemsRef.saveLoadSystem.loadGame()) {
                        coreSystemsRef.coreUIManager.fullUIRefresh();
                        coreSystemsRef.moduleLoader.notifyAllModulesOfLoad();
                    }
                },
                ['bg-blue-600', 'hover:bg-blue-700', 'text-white', 'py-2', 'px-4', 'w-full', 'mb-2']
            );
            cardBody.appendChild(loadButton);

            const resetButton = coreUIManager.createButton(
                'Reset Game (Hard)',
                () => {
                    coreSystemsRef.coreUIManager.showModal(
                        "Reset Game?",
                        "All progress will be lost permanently. This cannot be undone. Are you sure you want to reset the game to its initial state?",
                        [
                            {
                                label: "Reset Game",
                                className: "bg-red-600 hover:bg-red-700",
                                callback: () => {
                                    coreSystemsRef.gameLoop.stop();
                                    coreSystemsRef.saveLoadSystem.resetGameData();
                                    // Re-define initial Study Points resource after reset
                                    const spDef = coreSystemsRef.staticDataAggregator.getData('core_resource_definitions.studyPoints');
                                    if (spDef) {
                                        coreSystemsRef.coreResourceManager.defineResource(spDef.id, spDef.name, spDef.initialAmount, spDef.showInUI, spDef.isUnlocked);
                                    }
                                    coreSystemsRef.coreGameStateManager.setGameVersion("0.1.0");
                                    coreSystemsRef.coreUIManager.closeModal();
                                    coreSystemsRef.coreUIManager.fullUIRefresh();
                                    coreSystemsRef.moduleLoader.resetAllModules();
                                    coreSystemsRef.moduleLoader.notifyAllModulesOfLoad(); // Treat as a new game load for modules
                                    coreSystemsRef.gameLoop.start();
                                    coreSystemsRef.loggingSystem.info("Main", "Game reset and restarted.");
                                }
                            },
                            {
                                label: "Cancel",
                                className: "bg-gray-500 hover:bg-gray-600",
                                callback: () => coreSystemsRef.coreUIManager.closeModal()
                            }
                        ]
                    );
                },
                ['bg-red-600', 'hover:bg-red-700', 'text-white', 'py-2', 'px-4', 'w-full', 'mb-4']
            );
            cardBody.appendChild(resetButton);

            const resetSettingsButton = coreUIManager.createButton(
                'Reset All Settings',
                () => moduleLogicRef.resetAllSettings(),
                ['bg-yellow-600', 'hover:bg-yellow-700', 'text-white', 'py-2', 'px-4', 'w-full']
            );
            cardBody.appendChild(resetSettingsButton);
        });

        // --- Logs Section ---
        this._renderSectionCard(settingsGrid, 'logs', (cardBody) => {
            const showLogsButton = coreUIManager.createButton(
                'View Game Logs',
                () => this._showLogsModal(),
                ['bg-gray-600', 'hover:bg-gray-700', 'text-white', 'py-2', 'px-4', 'w-full']
            );
            cardBody.appendChild(showLogsButton);
        });

        // --- Automation Section (Placeholder) ---
        this._renderSectionCard(settingsGrid, 'automation', (cardBody) => {
            const automationButton = coreUIManager.createButton(
                staticModuleData.sections.automation.ui.buttonText(
                    decimalUtility.format(staticModuleData.sections.automation.unlockCondition.amount, 0)
                ),
                () => coreSystemsRef.coreUIManager.showNotification("Automation features are coming soon!", "info", 2000),
                ['bg-orange-600', 'hover:bg-orange-700', 'text-white', 'py-2', 'px-4', 'w-full'],
                'automation-button'
            );
            automationButton.disabled = true; // Always disabled for now as it's a placeholder
            automationButton.textContent = staticModuleData.sections.automation.ui.disabledText; // "Coming Soon"
            cardBody.appendChild(automationButton);
        });


        parentElement.appendChild(container);
        this.updateDynamicElements(); // Initial update for dynamic elements
        this._setupTooltips(); // Setup tooltips for sections
    },

    /**
     * Renders a card for a settings section.
     * @param {HTMLElement} parentGrid - The grid container to append the card to.
     * @param {string} sectionId - The ID of the section.
     * @param {function(HTMLElement): void} contentRenderer - Callback to render the specific content of the section.
     * @private
     */
    _renderSectionCard(parentGrid, sectionId, contentRenderer) {
        const { coreUIManager, decimalUtility, coreResourceManager } = coreSystemsRef;
        const sectionDef = staticModuleData.sections[sectionId];
        const isUnlocked = moduleLogicRef.isSectionUnlocked(sectionId);
        const hasCost = sectionDef.unlockCondition.type === "resource";
        const currentCost = hasCost ? moduleLogicRef.calculateUnlockCost(sectionId) : decimalUtility.ZERO;
        const canAfford = hasCost ? coreResourceManager.canAfford(sectionDef.unlockCondition.resourceId, currentCost) : true;

        const card = document.createElement('div');
        card.id = `settings-card-${sectionId}`;
        card.className = `bg-surface-dark p-4 rounded-lg shadow-md flex flex-col transition-all duration-200 ${isUnlocked ? '' : 'opacity-50 grayscale cursor-not-allowed'}`;

        const name = document.createElement('h3');
        name.className = 'text-xl font-semibold text-textPrimary mb-2';
        name.textContent = sectionDef.name;
        card.appendChild(name);

        const description = document.createElement('p');
        description.className = 'text-textSecondary text-sm mb-3';
        description.textContent = sectionDef.description;
        card.appendChild(description);

        const cardBody = document.createElement('div');
        cardBody.className = 'flex-grow'; // Allows content to take available space
        card.appendChild(cardBody);

        if (isUnlocked) {
            contentRenderer(cardBody); // Render the specific content for the section
        } else {
            // Display unlock button if it has a cost
            if (hasCost) {
                const unlockCostDisplay = document.createElement('p');
                unlockCostDisplay.className = 'text-textSecondary text-sm mb-4';
                unlockCostDisplay.textContent = `Unlock Cost: ${decimalUtility.format(currentCost, 0)} ${coreResourceManager.getAllResources()[sectionDef.unlockCondition.resourceId]?.name || sectionDef.unlockCondition.resourceId}`;
                cardBody.appendChild(unlockCostDisplay);

                const unlockButton = coreUIManager.createButton(
                    sectionDef.ui.buttonText(decimalUtility.format(currentCost, 0)),
                    () => {
                        const unlocked = moduleLogicRef.purchaseSectionUnlock(sectionId);
                        if (unlocked) {
                            this.updateDynamicElements(); // Re-render to show unlocked content
                            coreUIManager.showNotification(`Unlocked ${sectionDef.name}!`, 'success', 2000);
                        } else {
                            coreUIManager.showNotification(`Not enough ${sectionDef.unlockCondition.resourceId} to unlock ${sectionDef.name}.`, 'error', 2000);
                        }
                    },
                    ['bg-primary', 'hover:bg-primary-lighter', 'text-white', 'py-2', 'px-4', 'w-full'],
                    `unlock-settings-${sectionId}-button`
                );
                unlockButton.disabled = !canAfford;
                if (!canAfford) {
                    unlockButton.classList.remove('bg-primary', 'hover:bg-primary-lighter');
                    unlockButton.classList.add('bg-gray-500', 'cursor-not-allowed');
                }
                cardBody.appendChild(unlockButton);
            } else {
                // For sections that are conceptually locked but don't have a purchase (e.g., Automation "Coming Soon")
                const lockedMessage = document.createElement('p');
                lockedMessage.className = 'text-textSecondary italic';
                lockedMessage.textContent = "Locked or Coming Soon.";
                cardBody.appendChild(lockedMessage);
            }

            // Add tooltip for locked sections
            card.classList.add('tooltip-target');
            card.dataset.tooltipContent = this._getSectionUnlockTooltipContent(sectionDef);
        }

        parentGrid.appendChild(card);
    },

    /**
     * Generates the tooltip content for a locked settings section.
     * @param {object} sectionDef - The section definition.
     * @returns {string} HTML string for the tooltip.
     * @private
     */
    _getSectionUnlockTooltipContent(sectionDef) {
        const { coreResourceManager, decimalUtility } = coreSystemsRef;
        const condition = sectionDef.unlockCondition;
        let content = '<p class="font-semibold text-primary mb-1">Unlock Condition:</p>';

        switch (condition.type) {
            case "resource":
                const currentAmount = coreResourceManager.getAmount(condition.resourceId);
                const requiredAmount = decimalUtility.new(condition.amount);
                content += `<p>Pay ${decimalUtility.format(requiredAmount, 0)} ${coreResourceManager.getAllResources()[condition.resourceId]?.name || condition.resourceId}.</p>`;
                content += `<p class="text-xs text-textSecondary">(Current: ${decimalUtility.format(currentAmount, 0)})</p>`;
                break;
            case "globalFlag":
                content += `<p>Unlock via global game progression (Flag: '${condition.flag}').</p>`;
                break;
            case "alwaysUnlocked":
                content += `<p>Always available.</p>`;
                break;
            default:
                content += `<p>Meet unknown condition.</p>`;
                break;
        }
        return content;
    },

    /**
     * Sets up mouseover/mouseout listeners for tooltip targets.
     * @private
     */
    _setupTooltips() {
        const tooltipTargets = parentElementCache.querySelectorAll('.tooltip-target');
        tooltipTargets.forEach(target => {
            // Remove existing listeners to prevent duplicates
            const oldEnterHandler = target._tooltipEnterHandler;
            const oldLeaveHandler = target._tooltipLeaveHandler;
            if (oldEnterHandler) target.removeEventListener('mouseenter', oldEnterHandler);
            if (oldLeaveHandler) target.removeEventListener('mouseleave', oldLeaveHandler);

            const enterHandler = (event) => {
                const content = target.dataset.tooltipContent;
                if (content) {
                    coreSystemsRef.coreUIManager.showTooltip(content, target);
                }
            };
            const leaveHandler = () => {
                coreSystemsRef.coreUIManager.hideTooltip();
            };

            target.addEventListener('mouseenter', enterHandler);
            target.addEventListener('mouseleave', leaveHandler);
            // Store handlers to remove them later if needed
            target._tooltipEnterHandler = enterHandler;
            target._tooltipLeaveHandler = leaveHandler;
        });
    },

    /**
     * Updates dynamic parts of the module's UI, like current theme/language display.
     * This should be called by the game loop's UI update phase or on setting changes.
     */
    updateDynamicElements() {
        if (!parentElementCache) return; // Not rendered yet or parent cleared

        const { globalSettingsManager, coreResourceManager, decimalUtility } = coreSystemsRef;

        // Update Theme display
        const currentTheme = globalSettingsManager.getSetting('theme.name', 'modern');
        const currentMode = globalSettingsManager.getSetting('theme.mode', 'day');
        const themeDisplay = parentElementCache.querySelector('#current-theme-display');
        if (themeDisplay) {
            themeDisplay.textContent = `Current Theme: ${currentTheme} (${currentMode})`;
        }

        // Update Language display
        const currentLang = globalSettingsManager.getSetting('language', 'en');
        const langDisplay = parentElementCache.querySelector('#current-language-display');
        if (langDisplay) {
            langDisplay.textContent = `Current Language: ${staticModuleData.ui.languageOptions.find(l => l.id === currentLang)?.name || currentLang}`;
        }

        // Update unlock buttons for sections with costs
        for (const sectionId in staticModuleData.sections) {
            const sectionDef = staticModuleData.sections[sectionId];
            if (sectionDef.unlockCondition.type === "resource") {
                const unlockButton = parentElementCache.querySelector(`#unlock-settings-${sectionId}-button`);
                if (unlockButton) {
                    const isUnlocked = moduleLogicRef.isSectionUnlocked(sectionId);
                    if (isUnlocked) {
                        // If it's now unlocked, hide or replace the button
                        unlockButton.style.display = 'none'; // Or remove it
                        // Re-render the section content
                        const cardBody = unlockButton.closest('.flex-col').querySelector('.flex-grow');
                        if (cardBody) {
                             cardBody.innerHTML = ''; // Clear old content
                             this._renderSectionContent(sectionId, cardBody); // Re-render actual section content
                        }
                        const card = parentElementCache.querySelector(`#settings-card-${sectionId}`);
                        card.classList.remove('opacity-50', 'grayscale', 'cursor-not-allowed');
                        card.classList.remove('tooltip-target');
                        delete card.dataset.tooltipContent;
                        coreSystemsRef.coreUIManager.hideTooltip();
                    } else {
                        // Update affordability
                        const currentCost = moduleLogicRef.calculateUnlockCost(sectionId);
                        const canAfford = coreResourceManager.canAfford(sectionDef.unlockCondition.resourceId, currentCost);
                        unlockButton.disabled = !canAfford;
                        if (canAfford) {
                            unlockButton.classList.remove('bg-gray-500', 'cursor-not-allowed');
                            unlockButton.classList.add('bg-primary', 'hover:bg-primary-lighter');
                        } else {
                            unlockButton.classList.remove('bg-primary', 'hover:bg-primary-lighter');
                            unlockButton.classList.add('bg-gray-500', 'cursor-not-allowed');
                        }
                        unlockButton.textContent = sectionDef.ui.buttonText(decimalUtility.format(currentCost, 0));
                    }
                }
            }
        }
    },

    /**
     * Renders the actual content for a settings section, used after it's unlocked.
     * This is a helper to avoid code duplication in renderMainContent.
     * @param {string} sectionId
     * @param {HTMLElement} cardBody
     * @private
     */
    _renderSectionContent(sectionId, cardBody) {
        const { coreUIManager, globalSettingsManager, decimalUtility, loggingSystem, moduleLoader } = coreSystemsRef;

        switch (sectionId) {
            case 'themes':
                const currentTheme = globalSettingsManager.getSetting('theme.name', 'modern');
                const currentMode = globalSettingsManager.getSetting('theme.mode', 'day');

                const themeDisplay = document.createElement('p');
                themeDisplay.id = 'current-theme-display';
                themeDisplay.className = 'text-textPrimary mb-3';
                themeDisplay.textContent = `Current Theme: ${currentTheme} (${currentMode})`;
                cardBody.appendChild(themeDisplay);

                const themeSelect = document.createElement('select');
                themeSelect.id = 'theme-select';
                themeSelect.className = 'w-full p-2 rounded-md bg-surface border border-primary text-textPrimary mb-2';
                staticModuleData.ui.themeOptions.forEach(theme => {
                    const option = document.createElement('option');
                    option.value = theme.id;
                    option.textContent = theme.name;
                    if (theme.id === currentTheme) option.selected = true;
                    themeSelect.appendChild(option);
                });
                cardBody.appendChild(themeSelect);

                const modeSelect = document.createElement('select');
                modeSelect.id = 'mode-select';
                modeSelect.className = 'w-full p-2 rounded-md bg-surface border border-primary text-textPrimary mb-4';
                staticModuleData.ui.themeModes.forEach(mode => {
                    const option = document.createElement('option');
                    option.value = mode.id;
                    option.textContent = mode.name;
                    if (mode.id === currentMode) option.selected = true;
                    modeSelect.appendChild(option);
                });
                cardBody.appendChild(modeSelect);

                const applyThemeButton = coreUIManager.createButton(
                    'Apply Theme',
                    () => moduleLogicRef.applyThemeSetting(themeSelect.value, modeSelect.value),
                    ['bg-primary', 'hover:bg-primary-lighter', 'text-white', 'py-2', 'px-4', 'w-full']
                );
                cardBody.appendChild(applyThemeButton);
                break;
            case 'statistics':
                const showStatsButton = coreUIManager.createButton(
                    'View Statistics',
                    () => this._showStatisticsModal(),
                    ['bg-blue-600', 'hover:bg-blue-700', 'text-white', 'py-2', 'px-4', 'w-full']
                );
                cardBody.appendChild(showStatsButton);
                break;
            case 'language':
                const currentLang = globalSettingsManager.getSetting('language', 'en');

                const langDisplay = document.createElement('p');
                langDisplay.id = 'current-language-display';
                langDisplay.className = 'text-textPrimary mb-3';
                langDisplay.textContent = `Current Language: ${staticModuleData.ui.languageOptions.find(l => l.id === currentLang)?.name || currentLang}`;
                cardBody.appendChild(langDisplay);

                const langSelect = document.createElement('select');
                langSelect.id = 'language-select';
                langSelect.className = 'w-full p-2 rounded-md bg-surface border border-primary text-textPrimary mb-4';
                staticModuleData.ui.languageOptions.forEach(lang => {
                    const option = document.createElement('option');
                    option.value = lang.id;
                    option.textContent = lang.name;
                    if (lang.id === currentLang) option.selected = true;
                    langSelect.appendChild(option);
                });
                langSelect.addEventListener('change', () => moduleLogicRef.changeLanguageSetting(langSelect.value));
                cardBody.appendChild(langSelect);
                break;
            case 'saveLoad':
                const saveButton = coreUIManager.createButton(
                    'Save Game',
                    () => coreSystemsRef.saveLoadSystem.saveGame(),
                    ['bg-green-600', 'hover:bg-green-700', 'text-white', 'py-2', 'px-4', 'w-full', 'mb-2']
                );
                cardBody.appendChild(saveButton);

                const loadButton = coreUIManager.createButton(
                    'Load Game',
                    () => {
                        if (coreSystemsRef.saveLoadSystem.loadGame()) {
                            coreSystemsRef.coreUIManager.fullUIRefresh();
                            coreSystemsRef.moduleLoader.notifyAllModulesOfLoad();
                        }
                    },
                    ['bg-blue-600', 'hover:bg-blue-700', 'text-white', 'py-2', 'px-4', 'w-full', 'mb-2']
                );
                cardBody.appendChild(loadButton);

                const resetButton = coreUIManager.createButton(
                    'Reset Game (Hard)',
                    () => {
                        coreSystemsRef.coreUIManager.showModal(
                            "Reset Game?",
                            "All progress will be lost permanently. This cannot be undone. Are you sure you want to reset the game to its initial state?",
                            [
                                {
                                    label: "Reset Game",
                                    className: "bg-red-600 hover:bg-red-700",
                                    callback: () => {
                                        coreSystemsRef.gameLoop.stop();
                                        coreSystemsRef.saveLoadSystem.resetGameData();
                                        const spDef = coreSystemsRef.staticDataAggregator.getData('core_resource_definitions.studyPoints');
                                        if (spDef) {
                                            coreSystemsRef.coreResourceManager.defineResource(spDef.id, spDef.name, spDef.initialAmount, spDef.showInUI, spDef.isUnlocked);
                                        }
                                        coreSystemsRef.coreGameStateManager.setGameVersion("0.1.0");
                                        coreSystemsRef.coreUIManager.closeModal();
                                        coreSystemsRef.coreUIManager.fullUIRefresh();
                                        coreSystemsRef.moduleLoader.resetAllModules();
                                        coreSystemsRef.moduleLoader.notifyAllModulesOfLoad();
                                        coreSystemsRef.gameLoop.start();
                                        coreSystemsRef.loggingSystem.info("Main", "Game reset and restarted.");
                                    }
                                },
                                {
                                    label: "Cancel",
                                    className: "bg-gray-500 hover:bg-gray-600",
                                    callback: () => coreSystemsRef.coreUIManager.closeModal()
                                }
                            ]
                        );
                    },
                    ['bg-red-600', 'hover:bg-red-700', 'text-white', 'py-2', 'px-4', 'w-full', 'mb-4']
                );
                cardBody.appendChild(resetButton);

                const resetSettingsButton = coreUIManager.createButton(
                    'Reset All Settings',
                    () => moduleLogicRef.resetAllSettings(),
                    ['bg-yellow-600', 'hover:bg-yellow-700', 'text-white', 'py-2', 'px-4', 'w-full']
                );
                cardBody.appendChild(resetSettingsButton);
                break;
            case 'logs':
                const showLogsButton = coreUIManager.createButton(
                    'View Game Logs',
                    () => this._showLogsModal(),
                    ['bg-gray-600', 'hover:bg-gray-700', 'text-white', 'py-2', 'px-4', 'w-full']
                );
                cardBody.appendChild(showLogsButton);
                break;
            case 'automation':
                const automationButton = coreUIManager.createButton(
                    staticModuleData.sections.automation.ui.buttonText(
                        decimalUtility.format(staticModuleData.sections.automation.unlockCondition.amount, 0)
                    ),
                    () => coreSystemsRef.coreUIManager.showNotification("Automation features are coming soon!", "info", 2000),
                    ['bg-orange-600', 'hover:bg-orange-700', 'text-white', 'py-2', 'px-4', 'w-full'],
                    'automation-button'
                );
                automationButton.disabled = true;
                automationButton.textContent = staticModuleData.sections.automation.ui.disabledText;
                cardBody.appendChild(automationButton);
                break;
        }
    },

    /**
     * Shows the statistics modal.
     * @private
     */
    _showStatisticsModal() {
        const { coreUIManager, coreResourceManager, moduleLoader, decimalUtility, coreGameStateManager } = coreSystemsRef;

        const modalContent = document.createElement('div');
        modalContent.className = 'p-4';

        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'flex border-b border-gray-700 mb-4';
        modalContent.appendChild(tabsContainer);

        const statsContent = document.createElement('div');
        statsContent.id = 'stats-modal-content';
        statsContent.className = 'p-2 max-h-96 overflow-y-auto'; // Scrollable content
        modalContent.appendChild(statsContent);

        let activeStatsTab = staticModuleData.ui.statsTabs[0].id; // Default to first tab

        const renderStatsTab = (tabId) => {
            statsContent.innerHTML = ''; // Clear previous tab content
            switch (tabId) {
                case 'resources':
                    const allResources = coreResourceManager.getAllResources();
                    for (const resId in allResources) {
                        const res = allResources[resId];
                        if (res.isUnlocked && res.showInUI) {
                            const p = document.createElement('p');
                            p.className = 'mb-1';
                            p.innerHTML = `<span class="font-semibold">${res.name}:</span> ${decimalUtility.format(res.amount, 2)} (${decimalUtility.format(res.totalProductionRate, 2)}/s)`;
                            statsContent.appendChild(p);
                        }
                    }
                    break;
                case 'producers':
                    const studiesModule = moduleLoader.getModule('studies');
                    if (studiesModule && studiesModule.logic && studiesModule.staticModuleData) {
                        for (const producerId in studiesModule.staticModuleData.producers) {
                            const producerDef = studiesModule.staticModuleData.producers[producerId];
                            const ownedCount = studiesModule.logic.getOwnedProducerCount(producerId);
                            if (decimalUtility.gt(ownedCount, 0)) {
                                const p = document.createElement('p');
                                p.className = 'mb-1';
                                p.innerHTML = `<span class="font-semibold">${producerDef.name}:</span> Owned: ${decimalUtility.format(ownedCount, 0)}`;
                                statsContent.appendChild(p);
                            }
                        }
                    } else {
                        statsContent.textContent = "Studies module not loaded or no producers owned.";
                    }
                    break;
                case 'skills':
                    const skillsModule = moduleLoader.getModule('skills');
                    if (skillsModule && skillsModule.logic && skillsModule.staticModuleData) {
                        for (const skillId in skillsModule.staticModuleData.skills) {
                            const skillDef = skillsModule.staticModuleData.skills[skillId];
                            const skillLevel = skillsModule.logic.getSkillLevel(skillId);
                            if (skillLevel > 0) {
                                const p = document.createElement('p');
                                p.className = 'mb-1';
                                p.innerHTML = `<span class="font-semibold">${skillDef.name}:</span> Level: ${skillLevel}`;
                                statsContent.appendChild(p);
                            }
                        }
                    } else {
                        statsContent.textContent = "Skills module not loaded or no skills leveled up.";
                    }
                    break;
                case 'achievements':
                    const achievementsModule = moduleLoader.getModule('achievements');
                    if (achievementsModule && achievementsModule.logic && achievementsModule.staticModuleData) {
                        let unlockedCount = 0;
                        let totalCount = 0;
                        for (const achId in achievementsModule.staticModuleData.achievements) {
                            totalCount++;
                            if (achievementsModule.logic.isAchievementUnlocked(achId)) {
                                unlockedCount++;
                            }
                        }
                        const p = document.createElement('p');
                        p.className = 'mb-1';
                        p.innerHTML = `<span class="font-semibold">Achievements Unlocked:</span> ${unlockedCount} / ${totalCount}`;
                        statsContent.appendChild(p);
                    } else {
                        statsContent.textContent = "Achievements module not loaded.";
                    }
                    break;
                case 'ascension':
                    statsContent.textContent = "Ascension statistics will appear here in Stream 4!";
                    break;
            }
        };

        staticModuleData.ui.statsTabs.forEach(tab => {
            const tabButton = document.createElement('button');
            tabButton.textContent = tab.label;
            tabButton.className = `px-4 py-2 text-sm font-medium border-b-2 ${activeStatsTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-textSecondary hover:text-textPrimary'}`;
            tabButton.addEventListener('click', () => {
                activeStatsTab = tab.id;
                // Update button styles
                tabsContainer.querySelectorAll('button').forEach(btn => {
                    btn.classList.remove('border-primary', 'text-primary');
                    btn.classList.add('border-transparent', 'text-textSecondary', 'hover:text-textPrimary');
                });
                tabButton.classList.remove('border-transparent', 'text-textSecondary', 'hover:text-textPrimary');
                tabButton.classList.add('border-primary', 'text-primary');
                renderStatsTab(activeStatsTab);
            });
            tabsContainer.appendChild(tabButton);
        });

        // Initial render of the default tab
        renderStatsTab(activeStatsTab);

        coreUIManager.showModal('Game Statistics', modalContent);
    },

    /**
     * Shows the game logs modal.
     * @private
     */
    _showLogsModal() {
        const { coreUIManager, loggingSystem } = coreSystemsRef;

        const modalContent = document.createElement('div');
        modalContent.className = 'p-4';

        const logHistory = loggingSystem.getLogHistory();
        const logContainer = document.createElement('div');
        logContainer.className = 'bg-gray-800 p-3 rounded-md text-xs font-mono max-h-96 overflow-y-auto';

        if (logHistory.length === 0) {
            logContainer.textContent = "No logs yet.";
        } else {
            logHistory.forEach(entry => {
                const logLine = document.createElement('p');
                let colorClass = 'text-gray-400';
                switch (entry.level) {
                    case '[ERROR]': colorClass = 'text-red-400'; break;
                    case '[WARN]': colorClass = 'text-yellow-400'; break;
                    case '[INFO]': colorClass = 'text-blue-400'; break;
                    case '[DEBUG]': colorClass = 'text-purple-400'; break;
                    case '[VERBOSE]': colorClass = 'text-gray-500'; break;
                }
                logLine.className = `mb-1 ${colorClass}`;
                logLine.textContent = `[${new Date(entry.timestamp).toLocaleTimeString()}] ${entry.level} [${entry.tag}] ${entry.messages.join(' ')}`;
                logContainer.appendChild(logLine);
            });
        }
        modalContent.appendChild(logContainer);

        const clearLogsButton = coreUIManager.createButton(
            'Clear Logs',
            () => {
                loggingSystem.clearLogHistory();
                // Re-render log content
                logContainer.innerHTML = '<p>No logs yet.</p>';
            },
            ['bg-red-500', 'hover:bg-red-600', 'text-white', 'py-2', 'px-4', 'mt-4']
        );
        modalContent.appendChild(clearLogsButton);

        coreUIManager.showModal('Game Logs', modalContent);
    },

    /**
     * Called when the module's tab is shown.
     */
    onShow() {
        coreSystemsRef.loggingSystem.debug("SettingsUI", "Settings tab shown. Updating dynamic elements.");
        this.updateDynamicElements(); // Ensure UI is up-to-date when tab is shown
        this._setupTooltips(); // Re-setup tooltips as content might be re-rendered
    },

    /**
     * Called when the module's tab is hidden.
     */
    onHide() {
        coreSystemsRef.loggingSystem.debug("SettingsUI", "Settings tab hidden.");
        coreSystemsRef.coreUIManager.hideTooltip(); // Hide any active tooltip
    }
};
