// js/core/coreUIManager.js (v4.2 - Button Class Fix)

/**
 * @file coreUIManager.js
 * @description Manages the main UI structure.
 * v4.2: Fixes createButton to handle space-separated classes in additionalClasses.
 */

import { loggingSystem } from './loggingSystem.js';
import { coreResourceManager } from './coreResourceManager.js';
import { decimalUtility } from './decimalUtility.js';
import { coreGameStateManager } from './coreGameStateManager.js'; 
import { staticDataAggregator } from './staticDataAggregator.js'; 

const UIElements = {
    resourceBar: null,
    resourcesDisplay: null,
    mainMenu: null,
    menuList: null,
    mainContent: null,
    modalContainer: null,
    tooltipContainer: null,
    gameContainer: null,
};

let registeredMenuTabs = {};
let activeTabId = null;
let currentTooltipTarget = null;

const coreUIManager = {
    initialize() {
        UIElements.resourceBar = document.getElementById('resource-bar');
        UIElements.resourcesDisplay = document.getElementById('resources-display');
        UIElements.mainMenu = document.getElementById('main-menu');
        UIElements.menuList = document.getElementById('menu-list');
        UIElements.mainContent = document.getElementById('main-content');
        UIElements.modalContainer = document.getElementById('modal-container');
        UIElements.tooltipContainer = document.getElementById('tooltip-container');
        UIElements.gameContainer = document.getElementById('game-container');

        if (!UIElements.resourceBar || !UIElements.resourcesDisplay || !UIElements.mainMenu || !UIElements.menuList || !UIElements.mainContent || !UIElements.modalContainer || !UIElements.tooltipContainer || !UIElements.gameContainer) {
            loggingSystem.error("CoreUIManager", "One or more critical UI elements not found. Initialization failed.");
            return;
        }

        this.updateResourceDisplay();
        this.renderMenu();

        document.addEventListener('mousemove', this._handleTooltipPosition.bind(this));
        UIElements.menuList.addEventListener('click', this._handleMenuClick.bind(this));

        loggingSystem.info("CoreUIManager", "UI Manager initialized (v4.2).");
    },

    registerMenuTab(moduleId, label, renderCallback, isUnlockedCheck = () => true, onShowCallback, onHideCallback, isDefaultTab = false) {
        if (typeof moduleId !== 'string' || moduleId.trim() === '') {
            loggingSystem.warn("CoreUIManager", "registerMenuTab: moduleId must be a non-empty string.");
            return;
        }
        if (typeof renderCallback !== 'function') {
            loggingSystem.warn("CoreUIManager", `registerMenuTab: renderCallback for '${moduleId}' must be a function.`);
            return;
        }

        registeredMenuTabs[moduleId] = {
            id: moduleId,
            label: label,
            renderCallback: renderCallback,
            isUnlocked: isUnlockedCheck,
            onShowCallback: onShowCallback,
            onHideCallback: onHideCallback,
        };
        loggingSystem.info("CoreUIManager", `Menu tab '${label}' (${moduleId}) registered.`);
        this.renderMenu();

        if (isDefaultTab && !activeTabId) {
            const anyActive = Object.values(registeredMenuTabs).some(tab => tab.id === activeTabId && tab.isUnlocked());
            if(!anyActive && registeredMenuTabs[moduleId].isUnlocked()){
                 this.setActiveTab(moduleId);
            }
        } else if (!activeTabId && Object.keys(registeredMenuTabs).length > 0) {
            const firstUnlockedTab = Object.values(registeredMenuTabs).find(tab => tab.isUnlocked());
            if (firstUnlockedTab) {
                this.setActiveTab(firstUnlockedTab.id);
            }
        }
    },

    renderMenu() {
        if (!UIElements.menuList) return;
        UIElements.menuList.innerHTML = '';

        let hasActiveTabBeenSetOrRemainsValid = false;
        Object.values(registeredMenuTabs).forEach(tab => {
            if (tab.isUnlocked()) {
                const listItem = document.createElement('li');
                listItem.className = 'menu-tab';
                listItem.textContent = tab.label;
                listItem.dataset.tabTarget = tab.id;
                if (tab.id === activeTabId) {
                    listItem.classList.add('active');
                    hasActiveTabBeenSetOrRemainsValid = true;
                }
                UIElements.menuList.appendChild(listItem);
            }
        });
        
        if (!hasActiveTabBeenSetOrRemainsValid && Object.keys(registeredMenuTabs).length > 0) {
            activeTabId = null;
            const firstUnlockedTab = Object.values(registeredMenuTabs).find(tab => tab.isUnlocked());
            if (firstUnlockedTab) {
                this.setActiveTab(firstUnlockedTab.id, true);
            } else {
                this.clearMainContent();
                if (UIElements.mainContent) UIElements.mainContent.innerHTML = '<p class="text-textSecondary text-center py-10">No features unlocked yet.</p>';
            }
        } else if (Object.keys(registeredMenuTabs).length === 0) {
             this.clearMainContent();
             if (UIElements.mainContent) UIElements.mainContent.innerHTML = '<p class="text-textSecondary text-center py-10">No modules loaded.</p>';
        }
    },

    _handleMenuClick(event) {
        const target = event.target;
        if (target.matches('.menu-tab') && target.dataset.tabTarget) {
            const tabId = target.dataset.tabTarget;
            if (registeredMenuTabs[tabId] && registeredMenuTabs[tabId].isUnlocked()) {
                this.setActiveTab(tabId);
            } else {
                loggingSystem.warn("CoreUIManager", `Attempted to switch to locked or non-existent tab: ${tabId}`);
            }
        }
    },

    setActiveTab(tabId, forceRender = false) {
        if (!registeredMenuTabs[tabId] || !registeredMenuTabs[tabId].isUnlocked()) {
            loggingSystem.warn("CoreUIManager", `Cannot set active tab: '${tabId}' not registered, not unlocked, or no render callback.`);
            if (activeTabId === tabId || !activeTabId) {
                const firstUnlocked = Object.values(registeredMenuTabs).find(t => t.isUnlocked());
                if (firstUnlocked && firstUnlocked.id !== tabId) {
                    this.setActiveTab(firstUnlocked.id);
                } else if (!firstUnlocked) {
                     this.clearMainContent();
                     if (UIElements.mainContent) UIElements.mainContent.innerHTML = '<p class="text-textSecondary text-center py-10">No features available.</p>';
                     activeTabId = null;
                     this.renderMenu();
                }
            }
            return;
        }

        if (activeTabId === tabId && !forceRender) return;

        if (activeTabId && registeredMenuTabs[activeTabId] && typeof registeredMenuTabs[activeTabId].onHideCallback === 'function') {
            registeredMenuTabs[activeTabId].onHideCallback();
        }

        activeTabId = tabId;
        loggingSystem.debug("CoreUIManager", `Active tab set to: ${tabId}`);
        this.renderMenu(); 
        this.clearMainContent();

        const tab = registeredMenuTabs[tabId];
        if (tab && typeof tab.renderCallback === 'function') {
            try {
                tab.renderCallback(UIElements.mainContent);
            } catch (error) {
                loggingSystem.error("CoreUIManager", `Error rendering content for tab '${tabId}':`, error);
                if (UIElements.mainContent) UIElements.mainContent.innerHTML = `<p class="text-red-500">Error loading content for ${tab.label}. Check console.</p>`;
            }
        } else {
            loggingSystem.error("CoreUIManager", `Render callback not found for tab '${tabId}'.`);
            if (UIElements.mainContent) UIElements.mainContent.innerHTML = `<p>Content for ${tabId} is not available.</p>`;
        }
        
        if (tab && typeof tab.onShowCallback === 'function') {
            tab.onShowCallback();
        }
    },

    isActiveTab(tabId) {
        return activeTabId === tabId;
    },

    clearMainContent() {
        if (UIElements.mainContent) UIElements.mainContent.innerHTML = '';
    },

    updateResourceDisplay() {
        if (!UIElements.resourcesDisplay) {
            return;
        }

        const allResources = coreResourceManager.getAllResources();
        let hasVisibleResources = false;
        UIElements.resourcesDisplay.innerHTML = '';

        Object.values(allResources).forEach(res => {
            const staticResData = staticDataAggregator.getData(`market.resources.${res.id}`) || 
                                  staticDataAggregator.getData(`studies.resources.${res.id}`) ||
                                  staticDataAggregator.getData(`core_resource_definitions.${res.id}`);
            
            const showRate = staticResData ? (staticResData.hasProductionRate !== false) : true;

            if (res.isUnlocked && res.showInUI) {
                hasVisibleResources = true;
                let displayElement = document.getElementById(`resource-${res.id}-display`);
                if (!displayElement) {
                    displayElement = document.createElement('div');
                    displayElement.id = `resource-${res.id}-display`;
                    displayElement.className = 'p-2 bg-gray-700 rounded-md shadow'; 
                    UIElements.resourcesDisplay.appendChild(displayElement);
                }

                const amountFormatted = decimalUtility.format(res.amount, 2);
                const rateFormatted = decimalUtility.format(res.totalProductionRate, 2);
                let rateHTML = '';

                if (showRate && (decimalUtility.gt(res.totalProductionRate, 0) || Object.keys(res.productionSources || {}).length > 0)) {
                    rateHTML = ` (<span id="resource-${res.id}-rate" class="text-green-400">${rateFormatted}</span>/s)`;
                }

                displayElement.innerHTML = `
                    <span class="font-semibold text-primary">${res.name}:</span>
                    <span id="resource-${res.id}-amount" class="text-textPrimary">${amountFormatted}</span>
                    ${rateHTML}
                `;
            } else {
                let displayElement = document.getElementById(`resource-${res.id}-display`);
                if (displayElement) displayElement.remove();
            }
        });

        if (!hasVisibleResources) {
            UIElements.resourcesDisplay.innerHTML = '<p class="text-textSecondary italic col-span-full">No resources to display yet.</p>';
        }
    },

    showModal(title, content, buttons) {
        if (!UIElements.modalContainer) return;
        this.closeModal(); 

        const modalElement = document.createElement('div');
        modalElement.id = 'active-modal';
        modalElement.className = 'modal active'; 

        const modalContentDiv = document.createElement('div');
        modalContentDiv.className = 'modal-content'; 

        modalContentDiv.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-semibold text-primary">${title}</h3>
                <button id="modal-close-button" class="text-textSecondary hover:text-textPrimary text-2xl leading-none">&times;</button>
            </div>
        `;

        const bodyDiv = document.createElement('div');
        if (typeof content === 'string') {
            bodyDiv.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            bodyDiv.appendChild(content);
        }
        modalContentDiv.appendChild(bodyDiv);

        if (buttons && buttons.length > 0) {
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'mt-6 flex justify-end space-x-3';
            buttons.forEach(btnInfo => {
                // Ensure btnInfo.className is treated as an array even if it's a single string
                const classList = Array.isArray(btnInfo.className) ? btnInfo.className : (btnInfo.className ? [btnInfo.className] : ['bg-primary']);
                const button = this.createButton(btnInfo.label, btnInfo.callback, classList);
                buttonsDiv.appendChild(button);
            });
            modalContentDiv.appendChild(buttonsDiv);
        }

        modalElement.appendChild(modalContentDiv);
        UIElements.modalContainer.appendChild(modalElement);

        document.getElementById('modal-close-button').addEventListener('click', () => this.closeModal());
        modalElement.addEventListener('click', (event) => { 
            if (event.target === modalElement) this.closeModal();
        });
    },

    closeModal() {
        const activeModal = document.getElementById('active-modal');
        if (activeModal) activeModal.remove();
    },

    showTooltip(content, targetElement) {
        if (!UIElements.tooltipContainer || !targetElement) return;
        currentTooltipTarget = targetElement;
        if (typeof content === 'string') {
            UIElements.tooltipContainer.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            UIElements.tooltipContainer.innerHTML = '';
            UIElements.tooltipContainer.appendChild(content);
        }
        UIElements.tooltipContainer.style.display = 'block';
        this._positionTooltip(targetElement); 
    },

    hideTooltip() {
        if (UIElements.tooltipContainer) {
            UIElements.tooltipContainer.style.display = 'none';
            UIElements.tooltipContainer.innerHTML = '';
        }
        currentTooltipTarget = null;
    },

    _positionTooltip(targetEl) {
        if (!UIElements.tooltipContainer || UIElements.tooltipContainer.style.display === 'none' || !targetEl ) return;

        const tooltipRect = UIElements.tooltipContainer.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        let x, y;

        x = targetRect.left + window.scrollX;
        y = targetRect.bottom + window.scrollY + 5; 

        if (x + tooltipRect.width > window.innerWidth -10 ) {
            x = window.innerWidth - tooltipRect.width - 10;
        }
        if (x < 10) {
            x = 10;
        }
        if (y + tooltipRect.height > window.innerHeight - 10) {
            y = targetRect.top + window.scrollY - tooltipRect.height - 5;
        }
        if (y < 10) {
            y = 10;
        }

        UIElements.tooltipContainer.style.left = `${x}px`;
        UIElements.tooltipContainer.style.top = `${y}px`;
    },
    
    _handleTooltipPosition(event) {
        // if (currentTooltipTarget && UIElements.tooltipContainer.style.display === 'block') {
        // }
    },

    showNotification(message, type = 'info', duration = 3000) {
        let notificationArea = document.getElementById('notification-area');
        if (!notificationArea) {
            notificationArea = document.createElement('div');
            notificationArea.id = 'notification-area';
            notificationArea.className = 'fixed bottom-5 right-5 z-[10000] space-y-3 max-w-xs w-full';
            document.body.appendChild(notificationArea);
        }

        const notificationElement = document.createElement('div');
        notificationElement.className = 'p-4 rounded-lg shadow-xl text-sm transition-all duration-500 ease-in-out transform opacity-0 translate-x-full';
        
        let bgColor, textColor, iconHTML;
        switch (type) {
            case 'success': bgColor = 'bg-green-500'; textColor = 'text-white'; iconHTML = '<span>✅</span>'; break;
            case 'warning': bgColor = 'bg-yellow-500'; textColor = 'text-black'; iconHTML = '<span>⚠️</span>'; break;
            case 'error': bgColor = 'bg-red-600'; textColor = 'text-white'; iconHTML = '<span>❌</span>'; break;
            default: case 'info': bgColor = 'bg-blue-500'; textColor = 'text-white'; iconHTML = '<span>ℹ️</span>'; break;
        }
        notificationElement.classList.add(bgColor, textColor);
        notificationElement.innerHTML = `<div class="flex items-center"><div class="mr-3">${iconHTML}</div><div>${message}</div></div>`;
        
        notificationArea.insertBefore(notificationElement, notificationArea.firstChild);

        requestAnimationFrame(() => { 
            notificationElement.classList.remove('opacity-0', 'translate-x-full');
            notificationElement.classList.add('opacity-100', 'translate-x-0');
        });

        if (duration > 0) { 
            setTimeout(() => {
                notificationElement.classList.remove('opacity-100', 'translate-x-0');
                notificationElement.classList.add('opacity-0', 'translate-x-full');
                setTimeout(() => notificationElement.remove(), 500); 
            }, duration);
        }
    },

    applyTheme(themeName, mode) {
        if (!UIElements.gameContainer) return;
        UIElements.gameContainer.dataset.theme = themeName;
        UIElements.gameContainer.dataset.mode = mode; 
        loggingSystem.info("CoreUIManager", `Theme applied: ${themeName}, Mode: ${mode}`);
    },

    createButton(text, onClickCallback, additionalClasses = [], id) {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = 'game-button'; 
        // Handle if additionalClasses is a string with spaces or an array
        if (Array.isArray(additionalClasses)) {
            additionalClasses.forEach(cls => {
                if (typeof cls === 'string') {
                    cls.split(' ').forEach(singleClass => { // Split space-separated classes
                        if (singleClass) button.classList.add(singleClass);
                    });
                }
            });
        } else if (typeof additionalClasses === 'string') {
            additionalClasses.split(' ').forEach(singleClass => {
                 if (singleClass) button.classList.add(singleClass);
            });
        }

        if (id) button.id = id;
        if (typeof onClickCallback === 'function') {
            button.addEventListener('click', onClickCallback);
        }
        return button;
    },
    
    fullUIRefresh() {
        loggingSystem.debug("CoreUIManager", "Performing full UI refresh...");
        this.updateResourceDisplay();
        this.renderMenu(); 
        if (activeTabId && registeredMenuTabs[activeTabId] && registeredMenuTabs[activeTabId].isUnlocked()) {
            this.setActiveTab(activeTabId, true);
        } else if (Object.keys(registeredMenuTabs).length > 0) {
            const firstUnlocked = Object.values(registeredMenuTabs).find(t => t.isUnlocked());
            if (firstUnlocked) {
                this.setActiveTab(firstUnlocked.id, true);
            } else {
                 this.clearMainContent();
                 if(UIElements.mainContent) UIElements.mainContent.innerHTML = '<p class="text-textSecondary text-center py-10">No features available after refresh.</p>';
            }
        }
    },
};

export { coreUIManager };
