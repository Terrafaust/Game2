// js/core/coreUIManager.js

/**
 * @file coreUIManager.js
 * @description Manages the main UI structure (navigation menu, resource bar, main content area)
 * and provides hooks for modules to inject their UI. Handles dynamic updates to these areas.
 * Also responsible for modals, tooltips, and notifications.
 */

import { loggingSystem } from './loggingSystem.js';
import { coreResourceManager } from './coreResourceManager.js';
import { decimalUtility } from './decimalUtility.js';
import { coreGameStateManager } from './coreGameStateManager.js'; // For global flags affecting UI
// import { globalSettingsManager } from './globalSettingsManager.js'; // For themes, etc. (to be created)

// --- DOM Element References ---
// These should correspond to IDs in index.html
const UIElements = {
    resourceBar: null,
    resourcesDisplay: null, // The div inside resource-bar where individual resources go
    mainMenu: null,
    menuList: null, // The UL element within main-menu
    mainContent: null,
    modalContainer: null,
    tooltipContainer: null,
    gameContainer: null, // The top-level game container for theme application
};

// --- UI State ---
let registeredMenuTabs = {
    // moduleId: { id: 'moduleId', label: 'Module Label', renderCallback: function(parentElement), onShowCallback: function(), onHideCallback: function(), isUnlocked: () => boolean }
};
let activeTabId = null;
let currentTooltipTarget = null; // Element the tooltip is currently for

const coreUIManager = {
    /**
     * Initializes the UI Manager by caching DOM elements.
     * Must be called after the DOM is fully loaded.
     */
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
            loggingSystem.error("CoreUIManager", "One or more critical UI elements not found in the DOM. Initialization failed.");
            return;
        }

        this.updateResourceDisplay(); // Initial render of resource bar
        this.renderMenu(); // Initial render of menu

        // Add event listener for tooltip movement
        document.addEventListener('mousemove', this._handleTooltipPosition.bind(this));
        // Add event listener for menu clicks (event delegation)
        UIElements.menuList.addEventListener('click', this._handleMenuClick.bind(this));


        loggingSystem.info("CoreUIManager", "UI Manager initialized and DOM elements cached.");
    },

    /**
     * Registers a main menu tab for a module.
     * @param {string} moduleId - Unique ID for the module/tab.
     * @param {string} label - The text label for the tab.
     * @param {function(HTMLElement): void} renderCallback - Function to call to render the module's content into the main content area. Receives parentElement.
     * @param {function(): boolean} [isUnlockedCheck=() => true] - Optional function that returns true if the tab should be visible/enabled.
     * @param {function(): void} [onShowCallback] - Optional function to call when the tab becomes active.
     * @param {function(): void} [onHideCallback] - Optional function to call when the tab becomes inactive.
     * @param {boolean} [isDefaultTab=false] - If true and no other tab is active, this tab will be made active.
     */
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
        this.renderMenu(); // Re-render the menu to include the new tab

        if (isDefaultTab && !activeTabId) {
            // Check if any other tab is already active due to previous registrations or loading state
            const anyActive = Object.values(registeredMenuTabs).some(tab => tab.id === activeTabId && tab.isUnlocked());
            if(!anyActive){
                 this.setActiveTab(moduleId);
            }
        } else if (!activeTabId && Object.keys(registeredMenuTabs).length > 0) {
            // If no tab is active yet, and this isn't explicitly default, make the first unlocked one active.
            // This ensures a tab is always active if available.
            const firstUnlockedTab = Object.values(registeredMenuTabs).find(tab => tab.isUnlocked());
            if (firstUnlockedTab) {
                this.setActiveTab(firstUnlockedTab.id);
            }
        }
    },

    /**
     * Renders the main navigation menu based on registered tabs.
     */
    renderMenu() {
        if (!UIElements.menuList) return;
        UIElements.menuList.innerHTML = ''; // Clear existing menu items

        let hasActiveTabBeenSet = false;
        Object.values(registeredMenuTabs).forEach(tab => {
            if (tab.isUnlocked()) {
                const listItem = document.createElement('li');
                listItem.className = 'menu-tab'; // From index.html styles
                listItem.textContent = tab.label;
                listItem.dataset.tabTarget = tab.id;
                if (tab.id === activeTabId) {
                    listItem.classList.add('active');
                    hasActiveTabBeenSet = true;
                }
                UIElements.menuList.appendChild(listItem);
            }
        });
        
        // If no tab is currently active (e.g. active one became locked), try to set a default
        if (!hasActiveTabBeenSet && Object.keys(registeredMenuTabs).length > 0) {
            const firstUnlockedTab = Object.values(registeredMenuTabs).find(tab => tab.isUnlocked());
            if (firstUnlockedTab) {
                this.setActiveTab(firstUnlockedTab.id, true); // Force render content
            } else {
                // No tabs are unlocked, clear content
                this.clearMainContent();
                UIElements.mainContent.innerHTML = '<p class="text-textSecondary text-center py-10">No features unlocked yet.</p>';
            }
        }
    },

    /**
     * Handles clicks on menu items using event delegation.
     * @param {Event} event
     * @private
     */
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

    /**
     * Sets the active main menu tab and renders its content.
     * @param {string} tabId - The ID of the tab to activate.
     * @param {boolean} [forceRender=false] - If true, re-renders content even if tabId is already active.
     */
    setActiveTab(tabId, forceRender = false) {
        if (!registeredMenuTabs[tabId] || !registeredMenuTabs[tabId].isUnlocked()) {
            loggingSystem.warn("CoreUIManager", `Cannot set active tab: '${tabId}' is not registered, not unlocked, or has no render callback.`);
            // Fallback: try to set the first available unlocked tab if current one is invalid
            if (activeTabId === tabId || !activeTabId) { // If the problematic tab was active or no tab was active
                const firstUnlocked = Object.values(registeredMenuTabs).find(t => t.isUnlocked());
                if (firstUnlocked && firstUnlocked.id !== tabId) {
                    this.setActiveTab(firstUnlocked.id);
                } else if (!firstUnlocked) {
                     this.clearMainContent();
                     UIElements.mainContent.innerHTML = '<p class="text-textSecondary text-center py-10">No features available.</p>';
                     activeTabId = null; // Ensure no tab is marked active
                     this.renderMenu(); // Re-render menu to remove active state
                }
            }
            return;
        }

        if (activeTabId === tabId && !forceRender) {
            // Even if already active, if it's a forced render, proceed.
            // Otherwise, do nothing.
            return;
        }

        // Call onHide for the old tab
        if (activeTabId && registeredMenuTabs[activeTabId] && typeof registeredMenuTabs[activeTabId].onHideCallback === 'function') {
            registeredMenuTabs[activeTabId].onHideCallback();
        }

        activeTabId = tabId;
        loggingSystem.debug("CoreUIManager", `Active tab set to: ${tabId}`);

        this.renderMenu(); // Re-render menu to update active class
        this.clearMainContent(); // Clear previous content

        // Render new tab content
        const tab = registeredMenuTabs[tabId];
        if (tab && typeof tab.renderCallback === 'function') {
            try {
                tab.renderCallback(UIElements.mainContent);
            } catch (error) {
                loggingSystem.error("CoreUIManager", `Error rendering content for tab '${tabId}':`, error);
                UIElements.mainContent.innerHTML = `<p class="text-red-500">Error loading content for ${tab.label}.</p>`;
            }
        } else {
            loggingSystem.error("CoreUIManager", `Render callback not found for tab '${tabId}'.`);
            UIElements.mainContent.innerHTML = `<p>Content for ${tabId} is not available.</p>`;
        }
        
        // Call onShow for the new tab
        if (tab && typeof tab.onShowCallback === 'function') {
            tab.onShowCallback();
        }
    },

    /**
     * Checks if a specific tab is currently active.
     * @param {string} tabId - The ID of the tab to check.
     * @returns {boolean} True if the tab is active, false otherwise.
     */
    isActiveTab(tabId) {
        return activeTabId === tabId;
    },

    /**
     * Clears the main content area.
     */
    clearMainContent() {
        if (UIElements.mainContent) {
            UIElements.mainContent.innerHTML = '';
        }
    },

    /**
     * Updates the resource bar display with current resource amounts and rates.
     */
    updateResourceDisplay() {
        if (!UIElements.resourcesDisplay) return;

        const allResources = coreResourceManager.getAllResources();
        let hasVisibleResources = false;

        // Clear only dynamic resource elements, not the "Resources" title
        UIElements.resourcesDisplay.innerHTML = '';

        Object.values(allResources).forEach(res => {
            if (res.isUnlocked && res.showInUI) {
                hasVisibleResources = true;
                let displayElement = document.getElementById(`resource-${res.id}-display`);
                if (!displayElement) {
                    displayElement = document.createElement('div');
                    displayElement.id = `resource-${res.id}-display`;
                    displayElement.className = 'p-2 bg-gray-700 rounded-md shadow'; // Tailwind classes for individual resource item
                    UIElements.resourcesDisplay.appendChild(displayElement);
                }

                const amountFormatted = decimalUtility.format(res.amount, 2); // Format with 2 decimal places for <1000
                const rateFormatted = decimalUtility.format(res.totalProductionRate, 2);

                displayElement.innerHTML = `
                    <span class="font-semibold text-primary">${res.name}:</span>
                    <span id="resource-${res.id}-amount" class="text-textPrimary">${amountFormatted}</span>
                    (<span id="resource-${res.id}-rate" class="text-green-400">${rateFormatted}</span>/s)
                `;
            } else {
                // If a resource was visible and now isn't, remove its element
                let displayElement = document.getElementById(`resource-${res.id}-display`);
                if (displayElement) {
                    displayElement.remove();
                }
            }
        });

        if (!hasVisibleResources) {
            UIElements.resourcesDisplay.innerHTML = '<p class="text-textSecondary italic col-span-full">No resources to display yet.</p>';
        }
    },

    /**
     * Shows a modal dialog.
     * @param {string} title - The title of the modal.
     * @param {string | HTMLElement} content - The HTML content or an HTMLElement for the modal body.
     * @param {Array<{label: string, callback: function, className?: string}>} [buttons] - Optional array of button objects.
     * Each button: { label: "OK", callback: () => { closeModal(); }, className: "bg-blue-500" }
     */
    showModal(title, content, buttons) {
        if (!UIElements.modalContainer) return;
        this.closeModal(); // Close any existing modal first

        const modalElement = document.createElement('div');
        modalElement.id = 'active-modal';
        modalElement.className = 'modal active'; // Uses .modal and .active from index.html styles

        const modalContentDiv = document.createElement('div');
        modalContentDiv.className = 'modal-content'; // Uses .modal-content from index.html styles

        modalContentDiv.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-semibold text-primary">${title}</h3>
                <button id="modal-close-button" class="text-textSecondary hover:text-textPrimary">&times;</button>
            </div>
        `;

        if (typeof content === 'string') {
            const bodyDiv = document.createElement('div');
            bodyDiv.innerHTML = content;
            modalContentDiv.appendChild(bodyDiv);
        } else if (content instanceof HTMLElement) {
            modalContentDiv.appendChild(content);
        }

        if (buttons && buttons.length > 0) {
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'mt-6 flex justify-end space-x-3';
            buttons.forEach(btnInfo => {
                const button = document.createElement('button');
                button.textContent = btnInfo.label;
                button.className = `game-button ${btnInfo.className || 'bg-primary'}`; // Default to primary if no class
                button.addEventListener('click', () => {
                    if (typeof btnInfo.callback === 'function') {
                        btnInfo.callback();
                    }
                    // By default, modals with buttons might not auto-close unless callback does it
                    // this.closeModal(); // Optional: auto-close on any button click
                });
                buttonsDiv.appendChild(button);
            });
            modalContentDiv.appendChild(buttonsDiv);
        }

        modalElement.appendChild(modalContentDiv);
        UIElements.modalContainer.appendChild(modalElement);

        // Event listener for the close button
        document.getElementById('modal-close-button').addEventListener('click', () => this.closeModal());
        // Optional: Close on clicking outside the modal content (on the backdrop)
        modalElement.addEventListener('click', (event) => {
            if (event.target === modalElement) { // Check if the click is on the backdrop itself
                this.closeModal();
            }
        });
    },

    /**
     * Closes the currently active modal.
     */
    closeModal() {
        const activeModal = document.getElementById('active-modal');
        if (activeModal) {
            activeModal.remove();
        }
    },

    /**
     * Shows a tooltip.
     * @param {string | HTMLElement} content - The HTML content or an HTMLElement for the tooltip.
     * @param {HTMLElement} targetElement - The DOM element the tooltip is associated with.
     */
    showTooltip(content, targetElement) {
        if (!UIElements.tooltipContainer || !targetElement) return;

        currentTooltipTarget = targetElement;
        if (typeof content === 'string') {
            UIElements.tooltipContainer.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            UIElements.tooltipContainer.innerHTML = ''; // Clear first
            UIElements.tooltipContainer.appendChild(content);
        }
        UIElements.tooltipContainer.style.display = 'block';
        this._positionTooltip(targetElement); // Initial position
    },

    /**
     * Hides the tooltip.
     */
    hideTooltip() {
        if (UIElements.tooltipContainer) {
            UIElements.tooltipContainer.style.display = 'none';
            UIElements.tooltipContainer.innerHTML = ''; // Clear content
        }
        currentTooltipTarget = null;
    },

    /**
     * Positions the tooltip relative to the mouse or target element.
     * @param {HTMLElement} targetEl - The element the tooltip is anchored to.
     * @param {MouseEvent} [event] - The mouse event, if positioning by mouse (optional, for dynamic follow).
     * @private
     */
    _positionTooltip(targetEl, event) {
        if (!UIElements.tooltipContainer || UIElements.tooltipContainer.style.display === 'none') return;

        const tooltipRect = UIElements.tooltipContainer.getBoundingClientRect();
        let x, y;

        // Prefer positioning relative to the target element
        const targetRect = targetEl.getBoundingClientRect();
        x = targetRect.right + window.scrollX + 5; // 5px to the right of the target
        y = targetRect.top + window.scrollY;

        // Adjust if tooltip goes off-screen right
        if (x + tooltipRect.width > window.innerWidth) {
            x = targetRect.left + window.scrollX - tooltipRect.width - 5; // Place to the left
            if (x < 0) { // If still off-screen left, reset to right and try to fit
                x = window.innerWidth - tooltipRect.width - 10;
            }
        }
        // Adjust if tooltip goes off-screen bottom
        if (y + tooltipRect.height > window.innerHeight) {
            y = window.innerHeight - tooltipRect.height - 10; // Place higher up
        }
        // Adjust if tooltip goes off-screen top
        if (y < 0) {
            y = 10;
        }


        UIElements.tooltipContainer.style.left = `${x}px`;
        UIElements.tooltipContainer.style.top = `${y}px`;
    },
    
    /**
    * Handles global mouse move to reposition tooltip if visible and tied to mouse.
    * For element-bound tooltips, this might only be needed if the page scrolls or resizes.
    * @param {MouseEvent} event
    * @private
    */
    _handleTooltipPosition(event) {
        // If there's a current tooltip target, re-position the tooltip based on its current location
        // and the mouse position (if relevant for dynamic follow).
        if (currentTooltipTarget && UIElements.tooltipContainer.style.display === 'block') {
            // Re-position relative to the target element, not strictly mouse.
            // The tooltip's position should be based on the element it's describing,
            // not directly follow the mouse, unless that's a specific design choice.
            // For now, we'll re-position based on the target element's current location.
            this._positionTooltip(currentTooltipTarget);
        }
    },


    /**
     * Displays a temporary notification message (toast).
     * @param {string} message - The message to display.
     * @param {'info' | 'success' | 'warning' | 'error'} [type='info'] - The type of notification.
     * @param {number} [duration=3000] - How long to display the notification in ms.
     */
    showNotification(message, type = 'info', duration = 3000) {
        let notificationArea = document.getElementById('notification-area');
        if (!notificationArea) {
            notificationArea = document.createElement('div');
            notificationArea.id = 'notification-area';
            // Tailwind classes for notification area: fixed, bottom, right, z-index, etc.
            notificationArea.className = 'fixed bottom-5 right-5 z-[1000] space-y-3';
            document.body.appendChild(notificationArea);
        }

        const notificationElement = document.createElement('div');
        // Base Tailwind classes for notification
        notificationElement.className = 'p-4 rounded-lg shadow-xl text-sm transition-all duration-300 ease-in-out transform translate-x-full opacity-0';
        
        let bgColor, textColor, borderColor, icon;

        switch (type) {
            case 'success':
                bgColor = 'bg-green-500'; textColor = 'text-white'; borderColor = 'border-green-700'; icon = '✅';
                break;
            case 'warning':
                bgColor = 'bg-yellow-500'; textColor = 'text-black'; borderColor = 'border-yellow-700'; icon = '⚠️';
                break;
            case 'error':
                bgColor = 'bg-red-600'; textColor = 'text-white'; borderColor = 'border-red-800'; icon = '❌';
                break;
            case 'info':
            default:
                bgColor = 'bg-blue-500'; textColor = 'text-white'; borderColor = 'border-blue-700'; icon = 'ℹ️';
                break;
        }
        notificationElement.classList.add(bgColor, textColor);
        // notificationElement.style.borderLeft = `5px solid ${borderColor}`; // Using Tailwind border classes is also an option

        notificationElement.innerHTML = `<span class="mr-2">${icon}</span> ${message}`;
        
        notificationArea.appendChild(notificationElement);

        // Animate in
        requestAnimationFrame(() => {
            notificationElement.classList.remove('translate-x-full', 'opacity-0');
            notificationElement.classList.add('translate-x-0', 'opacity-100');
        });

        setTimeout(() => {
            // Animate out
            notificationElement.classList.remove('translate-x-0', 'opacity-100');
            notificationElement.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => {
                notificationElement.remove();
                if (notificationArea.children.length === 0) {
                    // notificationArea.remove(); // Optional: remove area if empty
                }
            }, 300); // Match animation duration
        }, duration);
    },

    /**
     * Applies a theme to the game.
     * Assumes themes are defined in CSS using data attributes on the body or a main container.
     * Example: <body data-theme="neon" data-mode="dark">
     * @param {string} themeName - e.g., "neon-light", "steampunk".
     * @param {'day' | 'night'} mode - e.g., "day", "night".
     */
    applyTheme(themeName, mode) {
        if (!UIElements.gameContainer) return; // Or document.body
        
        // This needs to be coordinated with globalSettingsManager
        // For now, directly set attributes
        UIElements.gameContainer.dataset.theme = themeName;
        UIElements.gameContainer.dataset.mode = mode;
        // document.body.dataset.theme = themeName;
        // document.body.dataset.mode = mode;

        loggingSystem.info("CoreUIManager", `Theme applied: ${themeName}, Mode: ${mode}`);
        // Potentially save this to globalSettingsManager
    },

    /**
     * A utility function to create a standard game button.
     * @param {string} text - The button text.
     * @param {function} onClickCallback - Callback for when the button is clicked.
     * @param {string[]} [additionalClasses=[]] - Array of additional Tailwind classes.
     * @param {string} [id] - Optional ID for the button.
     * @returns {HTMLButtonElement} The created button element.
     */
    createButton(text, onClickCallback, additionalClasses = [], id) {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = 'game-button'; // Base class from index.html styles
        if (additionalClasses && additionalClasses.length > 0) {
            button.classList.add(...additionalClasses);
        }
        if (id) {
            button.id = id;
        }
        if (typeof onClickCallback === 'function') {
            button.addEventListener('click', onClickCallback);
        }
        return button;
    },
    
    /**
     * Forces a full UI refresh. Useful after loading a game or significant state changes.
     * This is a placeholder; specific update methods are preferred.
     */
    fullUIRefresh() {
        loggingSystem.debug("CoreUIManager", "Performing full UI refresh...");
        this.updateResourceDisplay();
        this.renderMenu(); // This will also trigger setActiveTab if needed, which renders content
        // If activeTabId is set and valid, re-render its content
        if (activeTabId && registeredMenuTabs[activeTabId] && registeredMenuTabs[activeTabId].isUnlocked()) {
            this.setActiveTab(activeTabId, true); // Force re-render
        } else if (Object.keys(registeredMenuTabs).length > 0) {
            // If current active tab is no longer valid, try to set a default one
            const firstUnlocked = Object.values(registeredMenuTabs).find(t => t.isUnlocked());
            if (firstUnlocked) {
                this.setActiveTab(firstUnlocked.id, true);
            } else {
                 this.clearMainContent();
                 UIElements.mainContent.innerHTML = '<p class="text-textSecondary text-center py-10">No features available after refresh.</p>';
            }
        }
    },

};

export { coreUIManager };
