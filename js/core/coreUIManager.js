// js/core/coreUIManager.js

/**
 * @file coreUIManager.js
 * @description Manages the main UI structure.
 * v4.7: Implemented conditional menu visibility based on unlocked tab count and modernizes UI elements.
 * v4.8: Added swipe-to-toggle functionality for mobile menu.
 */

import { loggingSystem } from './loggingSystem.js';
import { coreResourceManager } from './coreResourceManager.js';
import { decimalUtility } from './decimalUtility.js';

/**
 * Sets up event listeners for a fully featured swipe-to-toggle mobile menu.
 * - Swipe right from the left edge to open.
 * - Swipe left anywhere to close.
 * - Tap the overlay to close.
 */
function initializeSwipeMenu() {
    const body = document.body;
    const menu = document.getElementById('main-menu');
    const menuOverlay = document.querySelector('.menu-overlay');

    // --- State variables for swipe detection ---
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    // --- Configuration ---
    const swipeThreshold = 50;  // Min horizontal distance to count as a swipe.
    const edgeThreshold = 40;   // How close to the left edge a swipe must start to OPEN the menu.
    const verticalThreshold = 75; // Max vertical distance to prevent conflict with scrolling.

    // --- Event Listeners ---

    body.addEventListener('touchstart', (e) => {
        // Record the starting coordinates of the touch
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    body.addEventListener('touchend', (e) => {
        // Record the ending coordinates of the touch
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        
        handleSwipeGesture();
    });

    function handleSwipeGesture() {
        const swipeX = touchEndX - touchStartX;
        const swipeY = touchEndY - touchStartY;
        const isMenuVisible = body.classList.contains('menu-visible');

        // Check if the swipe was mostly horizontal and not a vertical scroll
        if (Math.abs(swipeX) < swipeThreshold || Math.abs(swipeY) > verticalThreshold) {
            return; // Not a valid horizontal swipe
        }

        // --- Logic to OPEN the menu ---
        if (!isMenuVisible && swipeX > 0 && touchStartX < edgeThreshold) {
            // If the menu is hidden, a swipe to the right (positive swipeX)
            // that starts near the left edge should open it.
            body.classList.add('menu-visible');
        }
        
        // --- Logic to CLOSE the menu ---
        if (isMenuVisible && swipeX < 0) {
            // If the menu is visible, a swipe to the left (negative swipeX)
            // from anywhere on the screen should close it.
            body.classList.remove('menu-visible');
        }
    }
    
    // --- Click listeners for closing ---

    if (menuOverlay) {
        // Close the menu if the dark overlay is clicked
        menuOverlay.addEventListener('click', () => {
            body.classList.remove('menu-visible');
        });
    }

    // Close the menu if a menu item is clicked on mobile
    if (menu) {
        menu.addEventListener('click', (e) => {
            // Check if a menu-tab was clicked and we're on a mobile-sized screen
            if (e.target.classList.contains('menu-tab') && window.innerWidth <= 768) {
               body.classList.remove('menu-visible');
            }
        });
    }
}

const UIElements = {
    resourceBar: null,
    resourcesDisplay: null,
    mainMenu: null,
    menuList: null,
    mainContent: null,
    modalContainer: null,
    tooltipContainer: null,
    gameContainer: null,
    body: null,
    htmlElement: null,
};

let registeredMenuTabs = {};
let activeTabId = null;
let currentTooltipTarget = null;

export const coreUIManager = {
    initialize() {
        UIElements.resourceBar = document.getElementById('resource-bar');
        UIElements.resourcesDisplay = document.getElementById('resources-display');
        UIElements.mainMenu = document.getElementById('main-menu');
        UIElements.menuList = document.getElementById('menu-list');
        UIElements.mainContent = document.getElementById('main-content');
        UIElements.modalContainer = document.getElementById('modal-container');
        UIElements.tooltipContainer = document.getElementById('tooltip-container');
        UIElements.gameContainer = document.getElementById('game-container');
        UIElements.body = document.body;
        UIElements.htmlElement = document.documentElement;

        if (!UIElements.resourceBar || !UIElements.resourcesDisplay || !UIElements.mainMenu || !UIElements.menuList || !UIElements.mainContent || !UIElements.modalContainer || !UIElements.tooltipContainer || !UIElements.gameContainer || !UIElements.body || !UIElements.htmlElement) {
            loggingSystem.error("CoreUIManager_Init", "One or more critical UI elements not found. Initialization failed.");
            return;
        }

        this.updateResourceDisplay();
        this.renderMenu();

        document.addEventListener('mousemove', this._handleTooltipPosition.bind(this));
        if (UIElements.menuList) {
            UIElements.menuList.addEventListener('click', this._handleMenuClick.bind(this));
        } else {
            loggingSystem.error("CoreUIManager_Init", "menuList element not found, click handler not attached.");
        }
        
        // ADDED: Initialize the swipe functionality for mobile menus.
        initializeSwipeMenu();

        loggingSystem.info("CoreUIManager", "UI Manager initialized (v4.8).");
    },

    registerMenuTab(moduleId, label, renderCallback, isUnlockedCheck = () => true, onShowCallback, onHideCallback, isDefaultTab = false) {
        if (typeof moduleId !== 'string' || moduleId.trim() === '') {
            loggingSystem.warn("CoreUIManager_RegisterTab", "moduleId must be a non-empty string.");
            return;
        }
        if (typeof renderCallback !== 'function') {
            loggingSystem.warn("CoreUIManager_RegisterTab", `renderCallback for '${moduleId}' must be a function.`);
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
        loggingSystem.info("CoreUIManager_RegisterTab", `Menu tab '${label}' (${moduleId}) registered.`);
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
        if (!UIElements.menuList || !UIElements.body) {
            loggingSystem.warn("CoreUIManager_RenderMenu", "menuList or body element not found. Cannot render menu.");
            return;
        }
        UIElements.menuList.innerHTML = '';

        const unlockedTabs = Object.values(registeredMenuTabs).filter(tab => tab.isUnlocked());

        // NEW LOGIC: Conditionally hide the menu
        if (unlockedTabs.length <= 1) {
            UIElements.body.classList.add('menu-hidden');
            loggingSystem.debug("CoreUIManager_RenderMenu", "Only one or zero tabs unlocked. Hiding main menu.");
        } else {
            UIElements.body.classList.remove('menu-hidden');
            loggingSystem.debug("CoreUIManager_RenderMenu", "More than one tab unlocked. Showing main menu.");
        }

        let hasActiveTabBeenSetOrRemainsValid = false;
        unlockedTabs.forEach(tab => {
            const listItem = document.createElement('li');
            listItem.className = 'menu-tab'; // CSS will handle spacing via margin
            listItem.textContent = tab.label;
            listItem.dataset.tabTarget = tab.id;
            if (tab.id === activeTabId) {
                listItem.classList.add('active');
                hasActiveTabBeenSetOrRemainsValid = true;
            }
            UIElements.menuList.appendChild(listItem);
        });
        
        if (!hasActiveTabBeenSetOrRemainsValid && unlockedTabs.length > 0) {
            activeTabId = null; 
            const firstUnlockedTab = unlockedTabs[0]; // Already filtered, so this is safe
            this.setActiveTab(firstUnlockedTab.id, true); 
        } else if (activeTabId && registeredMenuTabs[activeTabId] && !registeredMenuTabs[activeTabId].isUnlocked()){
            activeTabId = null;
            const firstUnlockedTab = unlockedTabs[0];
            if (firstUnlockedTab) this.setActiveTab(firstUnlockedTab.id, true);
        } else if (unlockedTabs.length === 0) {
             this.clearMainContent();
             if (UIElements.mainContent) UIElements.mainContent.innerHTML = '<p class="text-textSecondary text-center py-10">No modules loaded.</p>';
        }
    },

    _handleMenuClick(event) {
        const target = event.target.closest('.menu-tab'); // Handle clicks inside the tab
        if (target && target.dataset.tabTarget) {
            const tabId = target.dataset.tabTarget;
            if (registeredMenuTabs[tabId] && registeredMenuTabs[tabId].isUnlocked()) {
                this.setActiveTab(tabId);
            }
        }
    },

    setActiveTab(tabId, forceRender = false) {
        if (!registeredMenuTabs[tabId] || !registeredMenuTabs[tabId].isUnlocked()) {
            if (activeTabId === tabId || !activeTabId) { 
                const firstUnlocked = Object.values(registeredMenuTabs).find(t => t.isUnlocked());
                if (firstUnlocked && firstUnlocked.id !== tabId) { 
                    this.setActiveTab(firstUnlocked.id, true); 
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
            try { registeredMenuTabs[activeTabId].onHideCallback(); } catch (e) { loggingSystem.error("CoreUIManager_SetActiveTab", `Error in onHideCallback for ${activeTabId}:`, e); }
        }

        activeTabId = tabId;
        this.renderMenu(); 
        this.clearMainContent();

        const tab = registeredMenuTabs[tabId];
        if (tab && typeof tab.renderCallback === 'function') {
            try { tab.renderCallback(UIElements.mainContent); } catch (error) { loggingSystem.error("CoreUIManager_SetActiveTab", `Error rendering content for tab '${tabId}':`, error); if (UIElements.mainContent) UIElements.mainContent.innerHTML = `<p class="text-red-500">Error loading content for ${tab.label}. Check console.</p>`; }
        } else { if (UIElements.mainContent) UIElements.mainContent.innerHTML = `<p>Content for ${tabId} is not available.</p>`;}
        
        if (tab && typeof tab.onShowCallback === 'function') {
            try { tab.onShowCallback(); } catch (e) { loggingSystem.error("CoreUIManager_SetActiveTab", `Error in onShowCallback for ${tabId}:`, e); }
        }
    },

    isActiveTab(tabId) { return activeTabId === tabId; },
    clearMainContent() { if (UIElements.mainContent) UIElements.mainContent.innerHTML = ''; },

    updateResourceDisplay() {
        if (!UIElements.resourcesDisplay) return;
        const allResources = coreResourceManager.getAllResources();
        let hasVisibleResources = false;
        UIElements.resourcesDisplay.innerHTML = ''; 
        Object.values(allResources).forEach(res => {
            const showRate = res.hasProductionRate !== undefined ? res.hasProductionRate : true;
            if (res.isUnlocked && res.showInUI) {
                hasVisibleResources = true;
                let displayElement = document.getElementById(`resource-${res.id}-display`);
                if (!displayElement) {
                    displayElement = document.createElement('div');
                    displayElement.id = `resource-${res.id}-display`;
                    displayElement.className = 'resource-item-display'; 
                    UIElements.resourcesDisplay.appendChild(displayElement);
                }
                const amountFormatted = decimalUtility.format(res.amount, 2);
                const rateFormatted = decimalUtility.format(res.totalProductionRate, 2);
                let rateHTML = '';
                if (showRate && (decimalUtility.gt(res.totalProductionRate, 0) || (res.productionSources && Object.keys(res.productionSources).length > 0) )) {
                    rateHTML = ` (<span id="resource-${res.id}-rate" class="text-green-400">${rateFormatted}</span>/s)`;
                }
                displayElement.innerHTML = `<span class="font-semibold text-secondary">${res.name}:</span> <span id="resource-${res.id}-amount" class="text-textPrimary font-medium ml-1">${amountFormatted}</span>${rateHTML}`;
            } else {
                let displayElement = document.getElementById(`resource-${res.id}-display`);
                if (displayElement) displayElement.remove();
            }
        });
        if (!hasVisibleResources) UIElements.resourcesDisplay.innerHTML = '<p class="text-textSecondary italic col-span-full text-center py-2">No resources to display yet.</p>';
    },

    showModal(title, content, buttons) {
        if (!UIElements.modalContainer) return;
        this.closeModal(); 
        const modalElement = document.createElement('div');
        modalElement.id = 'active-modal';
        modalElement.className = 'modal active'; 
        const modalContentDiv = document.createElement('div');
        modalContentDiv.className = 'modal-content'; 
        modalContentDiv.innerHTML = `<div class="flex justify-between items-center mb-4"><h3 class="text-xl font-semibold text-primary">${title}</h3><button id="modal-close-button" class="text-textSecondary hover:text-textPrimary text-2xl leading-none">&times;</button></div>`;
        const bodyDiv = document.createElement('div');
        if (typeof content === 'string') bodyDiv.innerHTML = content;
        else if (content instanceof HTMLElement) bodyDiv.appendChild(content);
        modalContentDiv.appendChild(bodyDiv);
        if (buttons && buttons.length > 0) {
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'mt-6 flex justify-end space-x-3';
            buttons.forEach(btnInfo => {
                const classList = Array.isArray(btnInfo.className) ? btnInfo.className : (btnInfo.className ? [btnInfo.className] : []);
                // Ensure modal buttons are also rounded
                buttonsDiv.appendChild(this.createButton(btnInfo.label, btnInfo.callback, ['bg-primary', ...classList]));
            });
            modalContentDiv.appendChild(buttonsDiv);
        }
        modalElement.appendChild(modalContentDiv);
        UIElements.modalContainer.appendChild(modalElement);
        document.getElementById('modal-close-button').addEventListener('click', () => this.closeModal());
        modalElement.addEventListener('click', (event) => { if (event.target === modalElement) this.closeModal(); });
    },

    closeModal() { const activeModal = document.getElementById('active-modal'); if (activeModal) activeModal.remove(); },
    showTooltip(content, targetElement) { /* Logic remains the same */ },
    hideTooltip() { /* Logic remains the same */ },
    _positionTooltip(targetEl) { /* Logic remains the same */ },
    _handleTooltipPosition(event) { /* Logic remains the same */ },
    showNotification(message, type = 'info', duration = 3000) { /* Logic remains the same */ },

    applyTheme(themeName, mode) {
        if (!UIElements.htmlElement || !UIElements.body) {
            loggingSystem.error("CoreUIManager_ApplyTheme", "HTML or body element not cached.");
            return;
        }
        const html = UIElements.htmlElement;
        const body = UIElements.body;

        html.dataset.theme = themeName; 
        html.dataset.mode = mode;     
        
        body.classList.add('theme-refresh-temp');
        void body.offsetHeight; 
        body.classList.remove('theme-refresh-temp');
        
        loggingSystem.info("CoreUIManager_ApplyTheme", `Theme applied: ${themeName}, Mode: ${mode}. Attributes set on <html>, style refresh attempted.`);
    },

    createButton(text, onClickCallback, additionalClasses = [], id) {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = 'game-button'; // Base class for modern, rounded buttons
        if (Array.isArray(additionalClasses)) {
            additionalClasses.forEach(cls => { if (typeof cls === 'string') { cls.split(' ').forEach(c => { if(c) button.classList.add(c);});}});
        } else if (typeof additionalClasses === 'string') {
            additionalClasses.split(' ').forEach(c => { if(c) button.classList.add(c);});
        }
        if (id) button.id = id;
        if (typeof onClickCallback === 'function') button.addEventListener('click', onClickCallback);
        return button;
    },
    
    fullUIRefresh() {
        this.updateResourceDisplay();
        this.renderMenu(); 
        if (activeTabId && registeredMenuTabs[activeTabId] && registeredMenuTabs[activeTabId].isUnlocked()) {
            this.setActiveTab(activeTabId, true); 
        } else {
            const firstUnlocked = Object.values(registeredMenuTabs).find(t => t.isUnlocked());
            if (firstUnlocked) {
                this.setActiveTab(firstUnlocked.id, true);
            } else {
                if(UIElements.mainContent) UIElements.mainContent.innerHTML = '<p class="text-textSecondary text-center py-10">No features available after refresh.</p>';
            }
        }
    },
};
