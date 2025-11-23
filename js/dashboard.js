// Fleet Dashboard JavaScript Module
class FleetDashboard {
    constructor() {
        this.fleetData = [];
        this.extractedAvgPayload = null; // Store average payload from CSV extraction
        this.currentEditingIndex = -1;
        this.textExtractor = null;
        this.isUpdating = false; // Flag to prevent race conditions during DOM updates

        // Use centralized configuration from config.js
        this.config = window.FleetConfig;

        // Initialize the shared logger
        this.logger = new window.Logger(this.config);

        // Validate configuration is loaded
        if (!this.config) {
            this.logger.debugError('FleetConfig not found! Make sure config.js is loaded before dashboard.js');
            throw new Error('Configuration not loaded');
        }

        this.init();
    }

    /**
     * Performance monitoring utility - measures execution time
     */
    startPerformanceTimer(label) {
        if (this.config && this.config.environment.debugMode && this.config.debug.showPerformanceMetrics) {
            const timerLabel = this.config.debug.showConsoleEmojis ? `⏱️ ${label}` : label;
            console.time(timerLabel);
        }
    }

    endPerformanceTimer(label) {
        if (this.config && this.config.environment.debugMode && this.config.debug.showPerformanceMetrics) {
            const timerLabel = this.config.debug.showConsoleEmojis ? `⏱️ ${label}` : label;
            console.timeEnd(timerLabel);
        }
    }

    logPerformanceMetric(label, startTime, data = {}) {
        if (this.config && this.config.environment.debugMode && this.config.debug.showPerformanceMetrics) {
            const endTime = performance.now();
            const duration = (endTime - startTime).toFixed(2);
            const perfMessage = this.logger._formatLogMessage(`${label}: ${duration}ms`, 'performance');
            console.log(perfMessage, data);
        }
    }

    init() {
        // Initialize environment mode
        this.initializeEnvironmentMode();
        this._applyUIText();
        this._applyAppInfo();

        // Initialize with empty data
        this.fleetData = [];
        this.configureUI();
        this.bindEvents();
        this.initializeUIFeatures(); // Initialize UI features that were in HTML
        this.updateDisplay();
        this.initializePDFExtractor();
    }

    /**
     * Apply all UI text from config.js
     * @private
     */
    _applyUIText() {
        const textConfig = this.config.ui.text;
        if (!textConfig) return;

        document.querySelectorAll('[data-text-key]').forEach(element => {
            const key = element.dataset.textKey;
            if (textConfig[key]) {
                // Use innerHTML to allow for simple HTML tags like <strong> or <i> in the config
                element.innerHTML = textConfig[key];
            }
        });
    }

    /**
     * Apply application info from config to the UI
     * @private
     */
    _applyAppInfo() {
        const appConfig = this.config.app;
        if (!appConfig) return;

        // Helper to set text content if element exists
        const setText = (id, text) => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = text;
            }
        };

        // Set page title
        const titleEl = document.getElementById('appTitle');
        if (titleEl) {
            document.title = appConfig.name || 'Fleet Dashboard';
        }

        // Set header and sidebar info
        setText('appName', appConfig.name);
        setText('appDescription', appConfig.description);
        setText('appNameSidebar', appConfig.name);
        setText('appVersion', appConfig.version);
        setText('appAuthor', `By ${appConfig.author}`);
    }

    /**
     * Initialize environment mode and configure development features
     */
    initializeEnvironmentMode() {
        const env = this.config.environment;

        // Automatically set showDevelopmentFeatures based on production flag
        env.showDevelopmentFeatures = !env.production;

        // Log environment mode (only if debug mode is enabled)
        if (this.config.environment.debugMode && this.config.debug.enabled) {
            console.log(`🔧 Environment Mode: ${env.production ? 'PRODUCTION' : 'DEVELOPMENT'}`);
            console.log(`🔧 Development Features: ${env.showDevelopmentFeatures ? 'ENABLED' : 'DISABLED'}`);
        }

        // Apply development mode settings to UI
        this.applyDevelopmentModeSettings();
    }

    /**
     * Apply or remove development features based on environment configuration
     */
    applyDevelopmentModeSettings() {
        const showDev = this.config.environment.showDevelopmentFeatures;
        const isProduction = this.config.environment.production;

        // Add appropriate class to body for CSS targeting
        document.body.classList.remove('development-mode', 'production-mode');
        document.body.classList.add(isProduction ? 'production-mode' : 'development-mode');

        // Hide/show development elements
        this.toggleDevelopmentElements(showDev);

        // Show/hide development indicator
        this.toggleDevelopmentIndicator(showDev);

        // Disable development functions if in production
        if (!showDev) {
            this.disableDevelopmentFunctions();
        }
    }

    /**
     * Toggle development mode indicator
     */
    toggleDevelopmentIndicator(show) {
        const indicator = document.getElementById('devIndicator');
        if (indicator) {
            if (show) {
                indicator.style.display = 'block';
            } else {
                indicator.style.display = 'none';
            }
        }
    }

    /**
     * Toggle visibility of development-only elements
     */
    toggleDevelopmentElements(show) {
        const devElements = [
            'loadSampleBtn',      // Load Sample Data button
            'clearDataBtn'        // Clear Data button
        ];

        devElements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                if (show) {
                    element.style.display = '';
                    element.classList.remove('dev-hidden');
                } else {
                    element.style.display = 'none';
                    element.classList.add('dev-hidden');
                }
            }
        });

        // Handle development sections/containers
        const devSections = document.querySelectorAll('.dev-only');
        devSections.forEach(section => {
            if (show) {
                section.style.display = '';
                section.classList.remove('dev-hidden');
            } else {
                section.style.display = 'none';
                section.classList.add('dev-hidden');
            }
        });

        // Special handling for supervisor info section
        this.toggleSupervisorInfoSection(show);

        // Log changes (only in development mode)
        if (this.config.environment.debugMode && show) {
            console.log(`🔧 Development elements ${show ? 'shown' : 'hidden'}`);
        }
    }

    /**
     * Toggle supervisor system info section
     */
    toggleSupervisorInfoSection(show) {
        // Find supervisor info section (the blue info box)
        const supervisorInfo = document.querySelector('.bg-blue-50.border-blue-200');
        // Translated from 'Sistem Pengawas' for consistency
        if (supervisorInfo && supervisorInfo.querySelector('h4').textContent.includes('Supervisor System')) {
            if (show) {
                supervisorInfo.style.display = '';
                supervisorInfo.classList.remove('dev-hidden');
            } else {
                supervisorInfo.style.display = 'none';
                supervisorInfo.classList.add('dev-hidden');
            }
        }
    }

    /**
     * Disable development functions in production mode
     */
    disableDevelopmentFunctions() {
        // Override development functions to prevent accidental calls
        this.loadSampleDataForTesting = () => {
            if (this.config.environment.debugMode) {
                console.warn('🚫 loadSampleDataForTesting disabled in production mode');
            }
        };

        this.clearAllData = () => {
            if (this.config.environment.debugMode) {
                console.warn('🚫 clearAllData disabled in production mode');
            }
        };

        // Modify simulateImportPDF to only trigger real PDF import
        const originalSimulateImportPDF = this.simulateImportPDF.bind(this);
        this.simulateImportPDF = () => {
            // In production, only trigger file input click, no simulation
            document.getElementById('pdfFileInput').click();
        };
    }

    // Configure UI elements based on config.js settings
    configureUI() {
        const searchConfig = this.config.ui.search;
        const filtersConfig = this.config.ui.filters;

        if (this.config.environment.debugMode && this.config.debug.enabled) {
            console.log('🎨 Configuring UI based on config.js settings...');
        }

        // Configure search input
        this.configureSearchInput(searchConfig);

        // Configure filter visibility and settings
        this.configureFilters(filtersConfig);

        if (this.config.environment.debugMode && this.config.debug.enabled) {
            this.logger.debugLog('UI configuration complete');
        }
    }

    configureSearchInput(searchConfig) {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        // Update placeholder based on configuration
        if (searchConfig.enabled) {
            const placeholder = searchConfig.global ?
                searchConfig.placeholder :
                searchConfig.placeholderFallback;
            searchInput.placeholder = placeholder;

            // Add search icon if configured
            if (searchConfig.showIcon) {
                this.addSearchIcon(searchInput);
            }

            // Add tooltip and helper text if configured
            if (searchConfig.showTooltip && searchConfig.tooltipText) {
                searchInput.title = searchConfig.tooltipText;
            }

            // Add helper text
            if (searchConfig.helperText) {
                this.addSearchHelperText(searchInput, searchConfig.helperText);
            }
        } else {
            // Disable search if not enabled
            searchInput.disabled = true;
            searchInput.placeholder = 'Search disabled';
        }
    }

    addSearchIcon(searchInput) {
        // Check if icon already exists (either .search-icon class or any fa-search icon in the parent)
        const parentElement = searchInput.parentElement;
        if (parentElement.querySelector('.search-icon') || parentElement.querySelector('.fa-search')) {
            return; // Icon already exists, don't add another
        }

        // Wrap input in relative container if not already wrapped
        if (!parentElement.classList.contains('relative')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'relative';
            searchInput.parentNode.insertBefore(wrapper, searchInput);
            wrapper.appendChild(searchInput);
        }

        // Add search icon
        const icon = document.createElement('div');
        icon.className = 'search-icon absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none';
        icon.innerHTML = '<i class="fas fa-search text-gray-400"></i>';

        // Add left padding to input to make room for icon if not already present
        if (!searchInput.classList.contains('pl-9') && !searchInput.classList.contains('pl-10')) {
            searchInput.classList.add('pl-10');
        }

        searchInput.parentElement.insertBefore(icon, searchInput);
    }

    addSearchHelperText(searchInput, helperText) {
        // Check if helper text already exists
        const existingHelper = searchInput.parentElement.parentElement.querySelector('.search-helper');
        if (existingHelper) return;

        const helper = document.createElement('div');
        helper.className = 'search-helper text-xs text-gray-500 mb-3';
        helper.innerHTML = helperText;

        // Insert BEFORE the input container (i.e., above it), not after.
        searchInput.parentElement.parentElement.insertBefore(helper, searchInput.parentElement);
    }

    configureFilters(filtersConfig) {
        if (!filtersConfig.enabled) {
            // Hide entire filter section
            const filterSection = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-4');
            if (filterSection) {
                filterSection.style.display = 'none';
            }
            return;
        }

        // Configure individual filters
        this.configureFilter('excavatorFilter', filtersConfig.excavatorFilter);
        this.configureFilter('hdFilter', filtersConfig.dumpTruckFilter);
        this.configureFilter('supervisorFilter', filtersConfig.supervisorFilter);
        this.configureFilter('statusFilter', filtersConfig.statusFilter);
        this.configureClearButton(filtersConfig.clearButton);

        // Update labels for better UX
        this.updateFilterLabels(filtersConfig);
    }

    configureFilter(filterId, filterConfig) {
        const filter = document.getElementById(filterId);
        const label = document.querySelector(`label[for="${filterId}"]`);

        if (!filter) return;

        if (!filterConfig.enabled) {
            // Hide the filter
            const filterContainer = filter.closest('div');
            if (filterContainer) {
                filterContainer.style.display = 'none';
            }
        } else {
            // Configure the filter
            if (label && filterConfig.label) {
                label.textContent = filterConfig.label;
            }

            // Handle statusFilter with dynamic options from config
            if (filterId === 'statusFilter' && filterConfig.options) {
                // Clear existing options
                filter.innerHTML = '';

                // Create options from config
                filterConfig.options.forEach(optionConfig => {
                    const option = document.createElement('option');
                    option.value = optionConfig.value;
                    option.textContent = optionConfig.label;

                    // Add color class if specified (note: most browsers don't support styling option elements)
                    if (optionConfig.color) {
                        option.className = optionConfig.color;
                    }

                    filter.appendChild(option);
                });
            } else {
                // Update first option if placeholder is configured (for other filters)
                if (filterConfig.placeholder) {
                    const firstOption = filter.querySelector('option[value=""]');
                    if (firstOption) {
                        firstOption.textContent = filterConfig.placeholder;
                    }
                }
            }
        }
    }

    updateFilterLabels(filtersConfig) {
        // Fix the HD -> Dump Truck label confusion
        if (filtersConfig.dumpTruckFilter.enabled) {
            const hdLabel = document.querySelector('label[for="hdFilter"]');
            if (hdLabel && filtersConfig.dumpTruckFilter.label) {
                hdLabel.textContent = filtersConfig.dumpTruckFilter.label;
            }
        }
    }

    configureClearButton(clearConfig) {
        const clearButton = document.getElementById('clearFiltersBtn');
        if (!clearButton) return;

        if (!clearConfig.enabled) {
            clearButton.style.display = 'none';
        } else {
            if (clearConfig.label) {
                clearButton.innerHTML = `<i class="${clearConfig.icon || 'fas fa-eraser'}"></i> ${clearConfig.label}`;
            }
        }
    }

    async initializePDFExtractor() {
        try {
            this.textExtractor = new PDFTextExtractor();
        } catch (error) {
            this.logger.debugError('Failed to initialize PDF Text Extractor:', error);
        }
    }

    // Enhanced status message system with better UX and centralized config
    showStatusMessage(message, type = 'info', customDuration = null) {
        // Ensure toast container exists
        this.ensureToastContainer();

        // Generate unique ID for this toast
        const toastId = 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

        // Get config for message type from centralized configuration
        const statusConfig = this.config.statusMessages;
        const typeConfig = statusConfig.types[type] || statusConfig.types.info;
        const duration = customDuration || typeConfig.duration || statusConfig.defaultDuration;

        // Create status message element
        const statusMsg = document.createElement('div');
        statusMsg.id = toastId;
        statusMsg.className = `toast-message ${typeConfig.bg} text-white px-6 py-4 rounded-lg shadow-2xl transition-all duration-${statusConfig.animation.transitionDuration} ${statusConfig.animation.easeFunction} border-l-4 ${typeConfig.border} max-w-md mb-3 transform translate-x-full opacity-0`;
        statusMsg.style.pointerEvents = 'auto'; // Enable clicks on toast

        statusMsg.innerHTML = `
            <div class="flex items-start justify-between w-full">
                <div class="flex items-center space-x-3 flex-1">
                    <i class="${typeConfig.icon} text-lg flex-shrink-0"></i>
                    <span class="text-sm font-medium pr-2">${message}</span>
                </div>
                <button onclick="dashboard.hideToast('${toastId}')" class="flex-shrink-0 text-white hover:text-gray-200 transition-colors ml-2 p-1 rounded hover:bg-black hover:bg-opacity-20">
                    <i class="fas fa-times text-sm"></i>
                </button>
            </div>
        `;

        // Add to toast container (newest at top)
        const container = document.getElementById('toastContainer');
        container.insertBefore(statusMsg, container.firstChild);

        // Animate in from right
        setTimeout(() => {
            statusMsg.style.transform = 'translateX(0) scale(1)';
            statusMsg.style.opacity = '1';
        }, statusConfig.animation.slideInDelay);

        // Auto hide with consistent timing
        if (duration > 0) {
            setTimeout(() => {
                this.hideToast(toastId);
            }, duration);
        }

        // Log with emoji and duration info (if debug enabled)
        if (this.config.debug.enabled && this.config.debug.showConsoleEmojis) {
            console.log(`📢 Status (${type}, ${duration}ms): ${message} [ID: ${toastId}]`);
        }

        return toastId; // Return toast ID for manual control
    }

    // Ensure toast container exists in DOM
    ensureToastContainer() {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'fixed top-4 right-4 z-[9999] max-w-md space-y-3';
            container.style.pointerEvents = 'none'; // Allow clicks through container
            document.body.appendChild(container);
        }
        return container;
    }

    // Hide specific toast by ID
    hideToast(toastId) {
        const toast = document.getElementById(toastId);
        if (toast) {
            toast.style.transform = 'translateX(100%) scale(0.95)';
            toast.style.opacity = '0';
            toast.style.pointerEvents = 'none';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }

    // Hide status message with animation (legacy support)
    hideStatusMessage() {
        // For backward compatibility, hide all toasts
        const container = document.getElementById('toastContainer');
        if (container) {
            const toasts = container.querySelectorAll('.toast-message');
            toasts.forEach(toast => {
                this.hideToast(toast.id);
            });
        }

        // Also handle old single toast system
        const statusMsg = document.getElementById('statusMessage');
        if (statusMsg) {
            statusMsg.style.transform = 'translateX(100%) scale(0.95)';
            statusMsg.style.opacity = '0';
            setTimeout(() => {
                if (statusMsg.parentNode) {
                    statusMsg.parentNode.removeChild(statusMsg);
                }
            }, 300);
        }
    }

    // Show persistent loading state for ongoing processes
    showLoadingState(message) {
        // Store the loading toast ID for updates
        this.currentLoadingToastId = this.showStatusMessage(message, 'processing', 0); // 0 = no auto-hide
        return this.currentLoadingToastId;
    }

    // Update loading message while maintaining persistent state
    updateLoadingState(message) {
        if (this.currentLoadingToastId) {
            const loadingToast = document.getElementById(this.currentLoadingToastId);
            if (loadingToast) {
                const messageSpan = loadingToast.querySelector('span');
                if (messageSpan) {
                    messageSpan.textContent = message;

                    // Add update animation
                    messageSpan.style.transform = 'scale(1.05)';
                    setTimeout(() => {
                        messageSpan.style.transform = 'scale(1)';
                    }, 150);
                }
                return;
            }
        }
        // If no existing loading toast, create new one
        this.currentLoadingToastId = this.showLoadingState(message);
    }

    // Hide loading state when process is complete
    hideLoadingState() {
        if (this.currentLoadingToastId) {
            this.hideToast(this.currentLoadingToastId);
            this.currentLoadingToastId = null;
        }
    }

    // Alias methods for PDF extractor compatibility
    startLoading(message) {
        this.showLoadingState(message);
    }

    finishLoading(message, type = 'success') {
        this.hideLoadingState();
        if (message) {
            this.showStatusMessage(message, type);
        }
    }

    bindEvents() {
        this._bindActionButtons();
        this._bindFilterControls();
        this._bindModalEvents();
        this._bindTableEvents();
        this.bindSidebarEvents(); // This one is already well-structured
    }

    _bindActionButtons() {
        // Button events with null checks
        const addDataBtn = document.getElementById('addDataBtn');
        if (addDataBtn) {
            addDataBtn.addEventListener('click', () => {
                const fileInput = document.getElementById('pdfFileInput');
                if (fileInput) {
                    fileInput.click();
                } else {
                    this.simulateImportPDF();
                }
            });
        }

        const loadSampleBtn = document.getElementById('loadSampleBtn');
        if (loadSampleBtn) {
            loadSampleBtn.addEventListener('click', () => this.loadSampleDataForTesting());
        }

        const exportExcelBtn = document.getElementById('exportExcelBtn');
        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', () => this.exportToExcel());
        }

        const clearDataBtn = document.getElementById('clearDataBtn');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => this.clearAllData());
        }

        // Print button (maintain compatibility with newui sidebar)
        const printBtn = document.getElementById('printBtn');
        if (printBtn) {
            printBtn.addEventListener('click', () => window.print());
        }

        const shareDashboardBtn = document.getElementById('shareDashboardBtn');
        if (shareDashboardBtn) {
            shareDashboardBtn.addEventListener('click', () => this.shareDashboard());
        }

        // File input
        const pdfFileInput = document.getElementById('pdfFileInput');
        if (pdfFileInput) {
            pdfFileInput.addEventListener('change', (e) => this.handleFileImport(e));
        }
    }

    _bindFilterControls() {
        // Filter events with null checks
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.updateDisplay());
        }

        const excavatorFilter = document.getElementById('excavatorFilter');
        if (excavatorFilter) {
            excavatorFilter.addEventListener('change', () => this.updateDisplay());
        }

        const hdFilter = document.getElementById('hdFilter');
        if (hdFilter) {
            hdFilter.addEventListener('change', () => this.updateDisplay());
        }

        const supervisorFilter = document.getElementById('supervisorFilter');
        if (supervisorFilter) {
            supervisorFilter.addEventListener('change', () => this.updateDisplay());
        }

        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.updateDisplay());
        }

        // Add clear filters button event if it exists
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearAllFilters());
        }

        // Quick status filter buttons
        document.querySelectorAll('.quick-status-filter').forEach(button => {
            button.addEventListener('click', (e) => {
                const status = e.target.dataset.status;
                const statusFilter = document.getElementById('statusFilter');
                if (statusFilter) {
                    statusFilter.value = status;
                    this.updateDisplay();
                }

                // Visual feedback
                document.querySelectorAll('.quick-status-filter').forEach(btn => {
                    btn.classList.remove('ring-2', 'ring-blue-500');
                });
                e.target.classList.add('ring-2', 'ring-blue-500');
            });
        });
    }

    _bindModalEvents() {
        // Modal events with null checks
        const cancelSupervisor = document.getElementById('cancelSupervisor');
        if (cancelSupervisor) {
            cancelSupervisor.addEventListener('click', () => this.closeModal());
        }

        const saveSupervisor = document.getElementById('saveSupervisor');
        if (saveSupervisor) {
            saveSupervisor.addEventListener('click', () => this.saveSupervisor());
        }

        const supervisorNameInput = document.getElementById('supervisorNameInput');
        if (supervisorNameInput) {
            supervisorNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.saveSupervisor();
            });
        }

        const supervisorModal = document.getElementById('supervisorModal');
        if (supervisorModal) {
            supervisorModal.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) this.closeModal();
            });
        }

        // Confirmation Modal Events
        const confirmCancel = document.getElementById('confirmCancel');
        if (confirmCancel) {
            confirmCancel.addEventListener('click', () => this._hideConfirmation());
        }
    }

    _showConfirmation(message, onConfirm) {
        const modal = document.getElementById('confirmationModal');
        const messageEl = document.getElementById('confirmationModalMessage');
        const confirmBtn = document.getElementById('confirmAccept');

        messageEl.textContent = message;

        // Clone and replace the button to remove old event listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newConfirmBtn.onclick = () => {
            onConfirm();
            this._hideConfirmation();
        };

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    _hideConfirmation() {
        const modal = document.getElementById('confirmationModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    /**
     * Bind sidebar-specific events (moved from HTML for better organization)
     */
    bindSidebarEvents() {
        // Get sidebar elements
        const sidebar = document.getElementById("sidebar");
        const menuToggle = document.getElementById("menu-toggle");
        const mainContent = document.querySelector("main");
        const sidebarToggleDesktop = document.getElementById("sidebar-toggle-desktop");
        const filtersToggle = document.getElementById("filters-toggle");
        const filtersContent = document.getElementById("filters-content");
        const filtersChevron = document.getElementById("filters-chevron");

        // Mobile menu toggle
        if (menuToggle && sidebar) {
            menuToggle.addEventListener("click", (e) => {
                e.stopPropagation();
                if (sidebar) {
                    sidebar.classList.toggle("-translate-x-full");
                }
            });
        }

        // Desktop sidebar collapse/expand - Hide content, keep container with icons
        if (sidebarToggleDesktop && sidebar && mainContent) {
            sidebarToggleDesktop.addEventListener("click", () => {
                // Toggle sidebar content visibility
                const isCurrentlyExpanded = !sidebar.classList.contains("collapsed");

                if (isCurrentlyExpanded) {
                    // Collapse: hide content, make sidebar narrow, show icons
                    sidebar.classList.add("collapsed");
                    sidebar.classList.remove("w-80");
                    sidebar.classList.add("w-20");
                    mainContent.classList.remove("lg:ml-80");
                    mainContent.classList.add("lg:ml-20");

                    // Hide all sidebar content
                    const sidebarContent = sidebar.querySelectorAll(".sidebar-content");
                    sidebarContent.forEach(content => content.classList.add("hidden"));

                    // Show collapsed icons
                    const collapsedIcons = sidebar.querySelector(".collapsed-icons");
                    if (collapsedIcons) {
                        collapsedIcons.classList.remove("hidden");

                        // Add click handlers to collapsed icons
                        this.bindCollapsedIconEvents();
                    }

                    // Update toggle icon
                    const toggleIcon = sidebarToggleDesktop.querySelector("i");
                    if (toggleIcon) {
                        toggleIcon.classList.remove("fa-chevron-left");
                        toggleIcon.classList.add("fa-chevron-right");
                    }
                } else {
                    // Expand: show content, make sidebar wide, hide icons
                    sidebar.classList.remove("collapsed");
                    sidebar.classList.remove("w-20");
                    sidebar.classList.add("w-80");
                    mainContent.classList.remove("lg:ml-20");
                    mainContent.classList.add("lg:ml-80");

                    // Show all sidebar content
                    const sidebarContent = sidebar.querySelectorAll(".sidebar-content");
                    sidebarContent.forEach(content => content.classList.remove("hidden"));

                    // Hide collapsed icons
                    const collapsedIcons = sidebar.querySelector(".collapsed-icons");
                    if (collapsedIcons) {
                        collapsedIcons.classList.add("hidden");
                    }

                    // Update toggle icon
                    const toggleIcon = sidebarToggleDesktop.querySelector("i");
                    if (toggleIcon) {
                        toggleIcon.classList.remove("fa-chevron-right");
                        toggleIcon.classList.add("fa-chevron-left");
                    }
                }
            });
        }        // Filters collapsible section
        if (filtersToggle && filtersContent && filtersChevron) {
            filtersToggle.addEventListener("click", () => {
                if (filtersContent && filtersChevron) {
                    filtersContent.classList.toggle("hidden");
                    filtersChevron.classList.toggle("rotate-180");
                }
            });
        }

        // Close sidebar when clicking outside on mobile
        document.addEventListener("click", (e) => {
            if (window.innerWidth < 1024 && sidebar) {
                if (!sidebar.contains(e.target) && !sidebar.classList.contains("-translate-x-full")) {
                    sidebar.classList.add("-translate-x-full");
                }
            }
        });
    }

    /**
     * Initialize timestamp and card animations (moved from HTML)
     */
    initializeUIFeatures() {
        // Update timestamp function
        const updateTimestamp = () => {
            const now = new Date();
            const timestamp = now.toLocaleString("id-ID", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
            const lastUpdate = document.getElementById("lastUpdate");
            if (lastUpdate) {
                lastUpdate.textContent = timestamp;
            }
        };

        // Initialize timestamp
        updateTimestamp();

        // Update timestamp every minute
        setInterval(updateTimestamp, 60000);

        // Animate summary cards on load
        const cards = document.querySelectorAll(".summary-card");
        cards.forEach((card, index) => {
            card.style.animation = `slideInUp 0.5s ease-out ${index * 0.1}s forwards`;
        });
    }

    /**
     * Bind events for collapsed sidebar icons
     */
    bindCollapsedIconEvents() {
        const collapsedIcons = document.querySelector(".collapsed-icons");
        if (!collapsedIcons) return;

        // Get icon elements by specific icons to ensure correct mapping - with null checks        
        const importIconElement = collapsedIcons.querySelector(".fa-file-import");
        const importIcon = importIconElement ? importIconElement.closest(".group") : null;

        const exportIconElement = collapsedIcons.querySelector(".fa-file-excel");
        const exportIcon = exportIconElement ? exportIconElement.closest(".group") : null;

        const printIconElement = collapsedIcons.querySelector(".fa-print");
        const printIcon = printIconElement ? printIconElement.closest(".group") : null;

        const shareIconElement = collapsedIcons.querySelector(".fa-share-nodes");
        const shareIcon = shareIconElement ? shareIconElement.closest(".group") : null;

        console.log("Binding collapsed icon events:");
        console.log("Import icon found:", !!importIcon);
        console.log("Export icon found:", !!exportIcon);
        console.log("Print icon found:", !!printIcon);
        console.log("Share icon found:", !!shareIcon);

        // Import PDF icon (Light Blue) - fa-file-import
        if (importIcon) {
            importIcon.addEventListener("click", (e) => {
                e.stopPropagation();
                console.log("🔵 Import PDF icon clicked");
                const fileInput = document.getElementById("pdfFileInput");
                if (fileInput) {
                    fileInput.click();
                } else {
                    console.warn("PDF file input not found");
                }
            });
        }

        // Export Excel icon (Green) - fa-file-excel
        if (exportIcon) {
            exportIcon.addEventListener("click", (e) => {
                e.stopPropagation();
                console.log("🟢 Export Excel icon clicked");
                if (window.dashboard && typeof window.dashboard.exportToExcel === 'function') {
                    window.dashboard.exportToExcel();
                } else {
                    console.warn('Dashboard export function not available');
                }
            });
        }

        // Print icon (Purple) - fa-print
        if (printIcon) {
            printIcon.addEventListener("click", (e) => {
                e.stopPropagation();
                console.log("🟣 Print icon clicked");
                window.print();
            });
        }

        // Share icon (Orange) - fa-share-nodes
        if (shareIcon) {
            shareIcon.addEventListener("click", (e) => {
                e.stopPropagation();
                console.log("🟠 Share icon clicked");
                if (window.dashboard && typeof window.dashboard.shareDashboard === 'function') {
                    window.dashboard.shareDashboard();
                } else {
                    console.warn('Dashboard share function not available');
                }
            });
        }
    }

    // Utility functions
    getPayloadStatus(payload, statusOverride = null) {
        // If there's a status override, use it
        if (statusOverride) {
            return statusOverride;
        }

        // Use new threshold ranges from configuration
        const thresholds = this.config.fleet.thresholds;

        // Calculate status based on new threshold ranges from config:
        // < 98 = under
        // 98 <= x <= 105 = optimal  
        // > 105 = overload
        if (payload < thresholds.optimal.min) {
            return 'under';
        } else if (payload >= thresholds.optimal.min && payload <= thresholds.optimal.max) {
            return 'optimal';
        } else {
            return 'overload';
        }
    }

    getStatusText(status) {
        const statusInfo = this._getStatusInfo(status);
        return statusInfo.name || status.charAt(0).toUpperCase() + status.slice(1);
    }

    _getStatusInfo(status) {
        return this.config.fleet.statusTypes[status] || {};
    }

    performConfigurableSearch(item, searchTerm) {
        if (!searchTerm) return true;

        const searchConfig = this.config.ui.search;

        // If search is disabled, return true (no filtering)
        if (!searchConfig.enabled) return true;

        // If global search is disabled, search only eqNum (legacy behavior)
        if (!searchConfig.global) {
            return item.eqNum.toLowerCase().includes(searchTerm.toLowerCase());
        }

        // Global search: check all enabled searchable fields
        const searchableFields = searchConfig.searchableFields;
        const fieldsToSearch = [];

        // Build array of field values to search based on configuration
        if (searchableFields.eqNum.enabled) {
            fieldsToSearch.push(item.eqNum || '');
        }
        if (searchableFields.supervisor.enabled) {
            fieldsToSearch.push(item.supervisor || '');
        }
        if (searchableFields.status.enabled) {
            const status = this.getPayloadStatus(item.payload, item.statusOverride);
            fieldsToSearch.push(status || '');
            // Also search status text representations
            fieldsToSearch.push(this.getStatusText(status) || '');
        }
        if (searchableFields.payload.enabled) {
            fieldsToSearch.push(item.payload ? item.payload.toString() : '');
        }

        // Perform search based on configuration
        const caseSensitive = searchConfig.caseSensitive;
        const partialMatch = searchConfig.partialMatch;

        return fieldsToSearch.some(fieldValue => {
            const field = caseSensitive ? fieldValue : fieldValue.toLowerCase();
            const term = caseSensitive ? searchTerm : searchTerm.toLowerCase();

            return partialMatch ? field.includes(term) : field === term;
        });
    }

    // Update display
    updateDisplay() {
        this.updateTable();
        this.updateSummary();
        this.updateFilters();
        this.toggleEmptyState();
    }

    updateTable() {
        const startTime = performance.now();
        this.startPerformanceTimer('Table Update');

        const tableBody = document.getElementById('dataTable');
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const excavatorFilter = document.getElementById('excavatorFilter').value;
        const hdFilter = document.getElementById('hdFilter').value;
        const supervisorFilter = document.getElementById('supervisorFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;

        // Helper function to check refinement filters (Status, Search) on an item
        const itemMatchesRefinementFilters = (item) => {
            const matchesSearch = this.performConfigurableSearch(item, searchTerm);
            const matchesStatus = !statusFilter || this.getPayloadStatus(item.payload, item.statusOverride) === statusFilter;
            return matchesSearch && matchesStatus;
        };

        // 1. Group data by excavator
        const dataInGroups = [];
        let currentGroup = [];
        this.fleetData.forEach(item => {
            if (item.eqNum.startsWith('EX')) {
                if (currentGroup.length > 0) dataInGroups.push(currentGroup);
                currentGroup = [item];
            } else {
                if (currentGroup.length > 0) currentGroup.push(item);
            }
        });
        if (currentGroup.length > 0) dataInGroups.push(currentGroup);

        let filteredData = [];

        // 2. Process each group based on the new specific filtering rules
        dataInGroups.forEach(group => {
            const excavator = group[0];
            const dumpTrucks = group.slice(1);

            // Apply supervisor filter first, as it's a hard filter on the entire group
            if (supervisorFilter && excavator.supervisor !== supervisorFilter) {
                return;
            }

            // Stage 1: Select a pool of potential items based on EX/DT filters
            let potentialItems = [];
            if (excavatorFilter) { // Rule: EX filter is active
                if (excavator.eqNum === excavatorFilter) {
                    potentialItems.push(excavator);
                    if (hdFilter) { // Sub-rule: Both EX and DT filters are active
                        potentialItems.push(...dumpTrucks.filter(dt => dt.eqNum === hdFilter));
                    } else { // Sub-rule: Only EX filter is active
                        potentialItems.push(...dumpTrucks);
                    }
                }
            } else if (hdFilter) { // Rule: Only DT filter is active
                const matchingDTs = dumpTrucks.filter(dt => dt.eqNum === hdFilter);
                if (matchingDTs.length > 0) {
                    potentialItems.push(excavator);
                    potentialItems.push(...matchingDTs);
                }
            } else { // Rule: No equipment filters are active
                potentialItems.push(excavator, ...dumpTrucks);
            }

            if (potentialItems.length === 0) {
                return; // Group does not match EX/DT selection, skip
            }

            // Stage 2: Refine the pool with other filters (Search, Status)
            // The first item is always the excavator
            const excavatorForRefinement = potentialItems[0];
            const dumpTrucksForRefinement = potentialItems.slice(1);

            const excavatorMatchesRefinement = itemMatchesRefinementFilters(excavatorForRefinement);
            const refinedDumpTrucks = dumpTrucksForRefinement.filter(itemMatchesRefinementFilters);

            // Stage 3: Final visibility logic
            // The excavator header is shown if it matches refinement, or if any of its potential children match refinement.
            if (excavatorMatchesRefinement || refinedDumpTrucks.length > 0) {
                filteredData.push(excavatorForRefinement); // Always show the original excavator as header
                filteredData.push(...refinedDumpTrucks);   // And the children that passed refinement
            }
        });

        tableBody.innerHTML = '';

        // Display data
        filteredData.forEach(item => {
            const row = this.createDataRow(item);
            tableBody.appendChild(row);
        });

        // Performance logging
        this.endPerformanceTimer('Table Update');
        this.logPerformanceMetric('Table Update', startTime, {
            totalRecords: this.fleetData.length,
            filteredRecords: filteredData.length,
            hasFilters: !!(searchTerm || excavatorFilter || hdFilter || supervisorFilter || statusFilter)
        });
    }

    _bindTableEvents() {
        const tableBody = document.getElementById('dataTable');
        if (tableBody) {
            tableBody.addEventListener('click', this._handleTableClick.bind(this));
        }
    }

    _handleTableClick(event) {
        // If an update is in progress, ignore clicks to prevent race conditions.
        if (this.isUpdating) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        const target = event.target;
        const cell = target.closest('td');
        if (!cell) return;

        const row = cell.closest('tr');
        if (!row.dataset.eqnum) return;

        const eqNum = row.dataset.eqnum;
        const itemIndex = this.fleetData.findIndex(d => d.eqNum === eqNum);
        if (itemIndex === -1) return;

        const field = cell.dataset.field;

        if (field === 'supervisor') {
            // If the supervisor cell is clicked on an excavator row, open the edit modal.
            const item = this.fleetData[itemIndex];
            if (item.eqNum.startsWith('EX')) {
                this.editSupervisor(itemIndex);
            }
        } else if (field) {
            // For other fields, use the inline editor.
            this.editField(itemIndex, field, cell);
        }
    }

    createDataRow(item) {
        const template = document.getElementById('data-row-template');
        const row = template.content.cloneNode(true).querySelector('tr');
        const isExcavator = item.eqNum.startsWith('EX');

        row.dataset.eqnum = item.eqNum; // Store identifier on the row

        // Apply styling based on equipment type
        if (isExcavator) {
            row.className = 'bg-blue-50 font-semibold border-l-4 border-blue-500';
        } else {
            row.className = 'hover:bg-gray-50 border-l-4 border-gray-200';
        }

        // Find cells and populate data
        const eqNumCell = row.querySelector('[data-field="eqNum"]');
        const payloadCell = row.querySelector('[data-field="payload"]');
        const statusCell = row.querySelector('[data-field="status"] span');
        const supervisorCell = row.querySelector('[data-field="supervisor"]');

        eqNumCell.textContent = item.eqNum;
        eqNumCell.classList.toggle('text-blue-900', isExcavator);
        eqNumCell.classList.toggle('text-gray-900', !isExcavator);
        eqNumCell.title = 'Click to edit Fleet ID';

        payloadCell.textContent = item.payload.toFixed(1);
        payloadCell.classList.toggle('text-blue-700', isExcavator);
        payloadCell.title = 'Click to edit Payload';

        const statusName = this.getPayloadStatus(item.payload, item.statusOverride);
        const statusInfo = this._getStatusInfo(statusName);
        statusCell.parentElement.title = 'Click to edit Status';
        statusCell.className = statusInfo.tailwindClasses || ''; // Use full Tailwind string
        statusCell.innerHTML = `<i class="${statusInfo.icon || 'fas fa-question-circle'}"></i> ${statusInfo.name || statusName}`;

        supervisorCell.textContent = isExcavator ? (item.supervisor || '-') : '';
        supervisorCell.classList.toggle('text-blue-700', isExcavator);

        // If it's an excavator, make the supervisor cell look clickable.
        if (isExcavator) {
            supervisorCell.classList.add('cursor-pointer', 'hover:bg-blue-100', 'transition-colors');
            supervisorCell.title = 'Click to edit supervisor';
        }

        return row;
    }

    updateSummary() {
        if (this.fleetData.length === 0) {
            ['avgPayload', 'maxPayload', 'minPayload', 'optimalCount', 'underCount', 'overloadCount']
                .forEach(id => document.getElementById(id).textContent = '0');
            return;
        }

        const payloads = this.fleetData.map(item => item.payload);

        // Calculate statistics - use extracted average if available
        let avgPayload;
        if (this.extractedAvgPayload !== null && this.extractedAvgPayload !== undefined) {
            // Use the extracted Total value from CSV as average
            avgPayload = this.extractedAvgPayload;
            this.logger.debugLog('Using extracted average payload from CSV Total:', avgPayload);
        } else {
            // Fallback to calculated average
            if (payloads.length > 0) {
                avgPayload = payloads.reduce((sum, payload) => sum + payload, 0) / payloads.length;
            } else {
                avgPayload = 0;
            }
            this.logger.debugLog('Using calculated average payload:', avgPayload);
        }

        const maxPayload = Math.max(...payloads);
        const minPayload = Math.min(...payloads);

        // Count status categories
        const optimalCount = this.fleetData.filter(item => this.getPayloadStatus(item.payload, item.statusOverride) === 'optimal').length;
        const underCount = this.fleetData.filter(item => this.getPayloadStatus(item.payload, item.statusOverride) === 'under').length;
        const overloadCount = this.fleetData.filter(item => this.getPayloadStatus(item.payload, item.statusOverride) === 'overload').length;

        // Update display
        document.getElementById('avgPayload').textContent = avgPayload ? avgPayload.toFixed(1) : '0.0';
        document.getElementById('maxPayload').textContent = maxPayload ? maxPayload.toFixed(1) : '0.0';
        document.getElementById('minPayload').textContent = minPayload ? minPayload.toFixed(1) : '0.0';
        document.getElementById('optimalCount').textContent = optimalCount;
        document.getElementById('underCount').textContent = underCount;
        document.getElementById('overloadCount').textContent = overloadCount;

        // Update header counters
        document.getElementById('totalUnits').textContent = this.fleetData.length;

        // Update last updated timestamp
        const now = new Date();
        const lastUpdateText = now.toLocaleString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        document.getElementById('lastUpdate').textContent = lastUpdateText;
    }

    updateFilters() {
        const excavatorFilter = document.getElementById('excavatorFilter');
        const hdFilter = document.getElementById('hdFilter');
        const supervisorFilter = document.getElementById('supervisorFilter');

        // Store current selected values before rebuilding options
        const currentExcavatorValue = excavatorFilter.value;
        const currentHdValue = hdFilter.value;
        const currentSupervisorValue = supervisorFilter.value;

        // Get unique values
        const excavators = [...new Set(this.fleetData.filter(item => item.eqNum.startsWith('EX')).map(item => item.eqNum))];
        const dumpTrucks = [...new Set(this.fleetData.filter(item => item.eqNum.startsWith('DT')).map(item => item.eqNum))];
        const supervisors = [...new Set(this.fleetData.map(item => item.supervisor).filter(supervisor => supervisor))];

        // Update excavator filter
        excavatorFilter.innerHTML = `<option value="">${this.config.ui.text.allExcavators}</option>`;
        excavators.forEach(excavator => {
            const option = document.createElement('option');
            option.value = excavator;
            option.textContent = excavator;
            excavatorFilter.appendChild(option);
        });

        // Update HD filter
        hdFilter.innerHTML = `<option value="">${this.config.ui.text.allDumpTrucks}</option>`;
        dumpTrucks.forEach(truck => {
            const option = document.createElement('option');
            option.value = truck;
            option.textContent = truck;
            hdFilter.appendChild(option);
        });

        // Update supervisor filter
        supervisorFilter.innerHTML = `<option value="">${this.config.ui.text.allSupervisors}</option>`;
        supervisors.forEach(supervisor => {
            const option = document.createElement('option');
            option.value = supervisor;
            option.textContent = supervisor;
            supervisorFilter.appendChild(option);
        });

        // Restore previously selected values if they still exist in the new options
        if (currentExcavatorValue && excavators.includes(currentExcavatorValue)) {
            excavatorFilter.value = currentExcavatorValue;
        }
        if (currentHdValue && dumpTrucks.includes(currentHdValue)) {
            hdFilter.value = currentHdValue;
        }
        if (currentSupervisorValue && supervisors.includes(currentSupervisorValue)) {
            supervisorFilter.value = currentSupervisorValue;
        }
    }

    // Clear all filters function
    clearAllFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('excavatorFilter').value = '';
        document.getElementById('hdFilter').value = '';
        document.getElementById('supervisorFilter').value = '';
        document.getElementById('statusFilter').value = '';

        // Reset quick filter button visual feedback
        document.querySelectorAll('.quick-status-filter').forEach(btn => {
            btn.classList.remove('ring-2', 'ring-blue-500');
        });

        this.updateDisplay();
        this.showStatusMessage(this.config.ui.text.filtersReset, 'info');
    }

    toggleEmptyState() {
        const emptyState = document.getElementById('emptyState');
        const tableContainer = emptyState.previousElementSibling;

        if (this.fleetData.length === 0) {
            emptyState.classList.remove('hidden');
            tableContainer.classList.add('hidden');
        } else {
            emptyState.classList.add('hidden');
            tableContainer.classList.remove('hidden');
        }
    }

    // Action handlers
    // Function to extract numeric part from equipment number
    extractEquipmentNumber(eqNum) {
        const match = eqNum.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
    }

    /**
     * Auto-assigns a supervisor to a group of dump trucks based on the preceding excavator.
     * This function iterates through the fleet data sequentially. When an excavator's supervisor is set,
     * this function assigns the same supervisor to all subsequent dump trucks until another excavator
     * is encountered in the array. This enforces the group hierarchy.
     *
     * @param {number} excavatorIndex - The index of the excavator in the `fleetData` array.
     * @param {string} supervisorName - The name of the supervisor to assign.
     */
    autoAssignSupervisor(excavatorIndex, supervisorName) {
        const excavator = this.fleetData[excavatorIndex];
        this.logger.debugLog(`Auto-assigning supervisor "${supervisorName}" for group starting with ${excavator.eqNum}`);

        if (!excavator.eqNum.startsWith('EX')) {
            this.logger.debugWarn('autoAssignSupervisor called on a non-excavator item. Aborting.');
            return;
        }

        // This logic relies on the data being sorted, with dump trucks following their assigned excavator.
        // It iterates from the excavator's position onwards.
        let assignedCount = 0;
        for (let i = excavatorIndex + 1; i < this.fleetData.length; i++) {
            const subsequentItem = this.fleetData[i];

            // If we encounter the next excavator, the current group ends.
            if (subsequentItem.eqNum.startsWith('EX')) {
                this.logger.debugLog(`Found next excavator (${subsequentItem.eqNum}), stopping assignment for ${excavator.eqNum}'s group.`);
                break;
            }

            // Assign the supervisor to all dump trucks in the group.
            if (subsequentItem.eqNum.startsWith('DT')) {
                subsequentItem.supervisor = supervisorName;
                assignedCount++;
            }
        }

        this.logger.debugLog(`Assigned supervisor "${supervisorName}" to ${assignedCount} dump trucks.`);
    }

    editSupervisor(index) {
        this.currentEditingIndex = index;
        const modal = document.getElementById('supervisorModal');
        const input = document.getElementById('supervisorNameInput');
        const isExcavator = this.fleetData[index].eqNum.startsWith('EX');

        input.value = this.fleetData[index].supervisor || '';

        // Update modal title using the configuration for better maintainability
        const modalTitle = document.getElementById('supervisorModalTitle');
        if (modalTitle) {
            const titleTemplate = this.config.ui.text.editSupervisorTitle || 'Edit Supervisor for {eqNum}';
            modalTitle.textContent = titleTemplate.replace('{eqNum}', this.fleetData[index].eqNum);
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        input.focus();
    }

    closeModal() {
        const modal = document.getElementById('supervisorModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        this.currentEditingIndex = -1;
    }

    saveSupervisor() {
        const input = document.getElementById('supervisorNameInput');
        const supervisorName = input.value.trim();

        if (this.currentEditingIndex >= 0) {
            const currentEquipment = this.fleetData[this.currentEditingIndex];

            this.logger.debugLog('Saving supervisor for:', currentEquipment.eqNum, 'New supervisor:', supervisorName);

            // Set supervisor for current equipment
            currentEquipment.supervisor = supervisorName;

            // If it's an excavator, auto-assign to related dump trucks
            if (currentEquipment.eqNum.startsWith('EX')) {
                this.logger.debugLog('This is an excavator, auto-assigning to dump trucks...');
                this.autoAssignSupervisor(this.currentEditingIndex, supervisorName);
            }

            this.updateDisplay();
            this.closeModal();
        }
    }

    // Inline editing functions
    editField(itemIndex, fieldType, cellElement) {
        if (!cellElement) {
            this.logger.debugWarn('editField called with a null cellElement. Aborting.');
            return;
        }

        const item = this.fleetData[itemIndex];
        const originalValue = fieldType === 'eqNum' ? item.eqNum :
            fieldType === 'payload' ? item.payload.toFixed(1) :
                this.getStatusText(this.getPayloadStatus(item.payload, item.statusOverride));

        // Prevent editing if already editing
        if (cellElement.querySelector('input') || cellElement.querySelector('select')) {
            return;
        }

        let inputElement;

        if (fieldType === 'status') {
            // Create select dropdown for status
            inputElement = document.createElement('select');
            inputElement.className = 'w-full px-2 py-1 border border-gray-300 rounded focus:border-blue-500 focus:outline-none text-sm';

            // Use the centralized statusTypes from config.js to build the dropdown options
            const statusTypes = this.config.fleet.statusTypes;
            for (const statusKey in statusTypes) {
                const optionElement = document.createElement('option');
                optionElement.value = statusKey;
                optionElement.textContent = statusTypes[statusKey].name;
                if (originalValue.toLowerCase() === statusTypes[statusKey].name.toLowerCase()) {
                    optionElement.selected = true;
                }
                inputElement.appendChild(optionElement);
            }
        } else {
            // Create input for fleet ID and payload
            inputElement = document.createElement('input');
            inputElement.type = fieldType === 'payload' ? 'number' : 'text';
            if (fieldType === 'payload') {
                inputElement.step = '0.1';
                inputElement.min = '0';
            }
            inputElement.value = originalValue;
            inputElement.className = 'w-full px-2 py-1 border border-gray-300 rounded focus:border-blue-500 focus:outline-none text-sm';
        }

        // Store original content
        const originalContent = cellElement.innerHTML;

        // Replace cell content with input
        cellElement.innerHTML = '';
        cellElement.appendChild(inputElement);

        // Focus and select
        inputElement.focus();
        if (inputElement.select) inputElement.select();

        // Save function
        const saveEdit = () => {
            // Set a flag to prevent other click handlers from running during the update.
            // This avoids a race condition where a click that causes a blur would also
            // trigger an edit on the new cell, but using a stale (detached) DOM element.
            this.isUpdating = true;

            const newValue = inputElement.value.trim();
            let dataChanged = false;

            if (newValue && newValue !== originalValue) {
                // Validate and save
                if (fieldType === 'eqNum') {
                    const existingItem = this.fleetData.find((data, index) =>
                        index !== itemIndex && data.eqNum === newValue
                    );
                    if (existingItem) {
                        this.showStatusMessage('Fleet ID already exists!', 'error');
                    } else {
                        item.eqNum = newValue;
                        dataChanged = true;
                    }
                } else if (fieldType === 'payload') {
                    const payloadValue = parseFloat(newValue);
                    if (isNaN(payloadValue) || payloadValue < 0) {
                        this.showStatusMessage('Please enter a valid payload value!', 'error');
                    } else {
                        item.payload = payloadValue;
                        item.statusOverride = null; // Reset override when payload changes
                        dataChanged = true;
                    }
                } else if (fieldType === 'status') {
                    item.statusOverride = newValue;
                    dataChanged = true;
                }

                if (dataChanged) {
                    this.updateDisplay();
                } else {
                    // Restore original content if validation failed
                    cellElement.innerHTML = originalContent;
                }
            } else {
                // Restore original content if value is unchanged
                cellElement.innerHTML = originalContent;
            }

            // Reset the flag after the current event queue is cleared,
            // allowing subsequent clicks to be processed.
            setTimeout(() => { this.isUpdating = false; }, 0);
        };

        // Cancel function
        const cancelEdit = () => {
            cellElement.innerHTML = originalContent;
        };

        // Event listeners
        inputElement.addEventListener('blur', saveEdit);
        inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });
    }

    async exportToExcel() {
        if (this.fleetData.length === 0) {
            this.showStatusMessage(this.config.ui.text.noDataToExport, 'warning');
            return;
        }

        try {
            // Create workbook using ExcelJS
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Fleet Data');

            // Get current date and automatic time range
            const now = new Date();
            const dateStr = now.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            // Generate automatic time range based on current time
            const startTime = new Date(now.getTime() - (2.5 * 60 * 60 * 1000));
            const timeStart = startTime.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            const timeEnd = now.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });

            const headerTitle = `${dateStr} ${timeStart} - ${timeEnd}`;

            // Set column widths
            worksheet.columns = [
                { header: 'Fleet', key: 'fleet', width: 12 },
                { header: 'Payload', key: 'payload', width: 12 },
                { header: 'Status', key: 'status', width: 12 },
                { header: 'Pengawas', key: 'pengawas', width: 18 }
            ];

            // Add and style header (merge cells A1 to D1)
            worksheet.mergeCells('A1:D1');
            const headerCell = worksheet.getCell('A1');
            headerCell.value = headerTitle;
            headerCell.style = {
                font: { bold: true, size: 12, color: { argb: 'FF000000' } },
                alignment: { horizontal: 'center', vertical: 'middle' },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } },
                border: {
                    top: { style: 'thin', color: { argb: 'FF000000' } },
                    left: { style: 'thin', color: { argb: 'FF000000' } },
                    bottom: { style: 'thin', color: { argb: 'FF000000' } },
                    right: { style: 'thin', color: { argb: 'FF000000' } }
                }
            };

            // Style column headers (row 2)
            const headerRow = worksheet.getRow(2);
            headerRow.values = ['Fleet', 'Payload', 'Status', 'Pengawas'];
            headerRow.eachCell((cell) => {
                cell.style = {
                    font: { bold: true, size: 10, color: { argb: 'FF000000' } },
                    alignment: { horizontal: 'center', vertical: 'middle' },
                    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } },
                    border: {
                        top: { style: 'thin', color: { argb: 'FF000000' } },
                        left: { style: 'thin', color: { argb: 'FF000000' } },
                        bottom: { style: 'thin', color: { argb: 'FF000000' } },
                        right: { style: 'thin', color: { argb: 'FF000000' } }
                    }
                };
            });

            // Add data rows starting from row 3
            let rowIndex = 3;
            for (const item of this.fleetData) {
                const row = worksheet.getRow(rowIndex);
                const isExcavator = item.eqNum.startsWith('EX');

                // Set row values - only Excavators display the supervisor's name
                row.values = [
                    item.eqNum,
                    item.payload,
                    this.getStatusText(this.getPayloadStatus(item.payload, item.statusOverride)),
                    isExcavator ? (item.supervisor || '') : '' // Only EX has a supervisor, DT is empty
                ];

                // Apply styling based on equipment type
                const backgroundColor = isExcavator ? 'FFB3E5FC' : 'FFFFFFFF'; // Blue for EX, White for DT

                row.eachCell((cell) => {
                    cell.style = {
                        font: { size: 10, color: { argb: 'FF000000' } },
                        alignment: { horizontal: 'center', vertical: 'middle' },
                        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: backgroundColor } },
                        border: {
                            top: { style: 'thin', color: { argb: 'FF000000' } },
                            left: { style: 'thin', color: { argb: 'FF000000' } },
                            bottom: { style: 'thin', color: { argb: 'FF000000' } },
                            right: { style: 'thin', color: { argb: 'FF000000' } }
                        }
                    };
                });

                rowIndex++;
            }

            // Set row heights
            worksheet.getRow(1).height = 25; // Header row
            worksheet.getRow(2).height = 20; // Column headers
            for (let i = 3; i < rowIndex; i++) {
                worksheet.getRow(i).height = 18; // Data rows
            }

            // Generate filename with current date and time
            const timestamp = now.toISOString().replace(/[:.]/g, '-').split('T')[0];
            const filename = `fleet-data-${timestamp}.xlsx`;

            // Write to buffer and download
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            this.showStatusMessage(`Data exported successfully to ${filename} with colors!`, 'success');

        } catch (error) {
            this.logger.debugError('Export error:', error);
            this.showStatusMessage('Error exporting to Excel. Please try again.', 'error');
        }
    }

    clearAllData() {
        this._showConfirmation(this.config.ui.text.confirmClearAll, () => {
            this.fleetData = [];
            this.extractedAvgPayload = null; // Reset extracted average payload
            this.updateDisplay();
        });
    }

    simulateImportPDF() {
        const fileInput = document.getElementById('pdfFileInput');
        fileInput.click();
    }

    async handleFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            if (file.type === 'application/pdf') {
                // Show modal first so user can select decimal format
                this.showPDFImportModal(file);
            } else {
                this.logger.debugLog('Please select a PDF file for import.');
                // Show error message in status instead of alert
                this.showStatusMessage('Please select a PDF file for import.', 'error');
            }
        } finally {
            // Always reset file input after processing (success or error)
            // This ensures user can select the same file again
            setTimeout(() => {
                e.target.value = '';
                this.logger.debugLog('File input reset after processing');
            }, 100);
        }
    }

    /**
     * Show PDF import modal with format selection
     */
    showPDFImportModal(file) {
        const modal = document.getElementById('pdfPreviewModal');
        const statusDiv = document.getElementById('pdfStatus');
        const summaryDiv = document.getElementById('pdfSummary');
        const importBtn = document.getElementById('importPDFData');
        const cancelBtn = document.getElementById('cancelPDF');
        const formatSelector = document.getElementById('decimalFormatSelector');

        // Store file for later processing
        this.pendingPDFFile = file;

        // Reset modal state
        statusDiv.innerHTML = `
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 class="font-semibold text-blue-800 mb-2"><i class="fas fa-file-pdf mr-2"></i>Ready to Process PDF</h4>
                <p class="text-blue-700 text-sm">File: <strong>${file.name}</strong></p>
                <p class="text-blue-600 text-xs mt-1">Please select the decimal format used in your PDF file below, then click "Process PDF" to continue.</p>
            </div>
        `;

        // Show format selector and hide other sections
        formatSelector.style.display = 'block';
        summaryDiv.classList.add('hidden');
        importBtn.style.display = 'none';

        // Add process button
        const processBtn = document.createElement('button');
        processBtn.id = 'processPDFBtn';
        processBtn.className = 'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors';
        processBtn.innerHTML = '<i class="fas fa-cogs mr-2"></i>Process PDF';
        processBtn.onclick = () => this.startPDFProcessing();

        // Update button area
        const buttonArea = cancelBtn.parentElement;
        // Remove existing process button if any
        const existingProcessBtn = document.getElementById('processPDFBtn');
        if (existingProcessBtn) existingProcessBtn.remove();

        buttonArea.insertBefore(processBtn, cancelBtn);

        // Show modal
        modal.classList.remove('hidden');
        modal.classList.add('flex');

        // Setup cancel handler
        cancelBtn.onclick = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            this.pendingPDFFile = null;
        };
    }

    /**
     * Start PDF processing with selected format
     */
    async startPDFProcessing() {
        if (!this.pendingPDFFile) return;

        const processBtn = document.getElementById('processPDFBtn');
        if (processBtn) processBtn.remove();

        // Hide format selector during processing
        const formatSelector = document.getElementById('decimalFormatSelector');
        formatSelector.style.display = 'none';

        await this.processPDFWithTextExtraction(this.pendingPDFFile);
        this.pendingPDFFile = null;
    }

    async processPDFWithTextExtraction(file) {
        if (!this.textExtractor) {
            this.logger.debugLog('PDF processing system is not ready. Please wait a moment and try again.');
            this.showStatusMessage('PDF processing system is not ready. Please wait a moment and try again.', 'error');
            return;
        }

        try {
            // Get selected decimal format from modal
            const selectedFormat = document.querySelector('input[name="decimal_format"]:checked')?.value || 'dot';
            this.logger.debugLog(`Processing PDF file: ${file.name} with decimal format: ${selectedFormat}`);

            // Extract data from PDF with selected format
            const extractionResult = await this.textExtractor.extractDataFromPDF(file, selectedFormat);

            if (!extractionResult.extractedData || extractionResult.extractedData.length === 0) {
                // Error handling is already done by textExtractor, just return
                return;
            }

            console.log('PDF extraction completed:', extractionResult);

            // Validate extracted data
            const { validData, invalidData } = this.textExtractor.validateExtractedData(extractionResult.extractedData);

            // Calculate statistics using the PDF extractor's method
            const statistics = this.textExtractor.calculateStatistics(validData);

            // Show preview modal
            this.showExtractionPreview(extractionResult, validData, invalidData, statistics);

        } catch (error) {
            this.logger.debugError('PDF processing failed:', error);
            this.showStatusMessage(this.config.pdf.extraction.messages.error + `: ${error.message}`, 'error');
        }
    }

    showExtractionPreview(extractionResult, validData, invalidData, statistics) {
        // Update modal content with extraction results
        const modal = document.getElementById('pdfPreviewModal');
        const statusDiv = document.getElementById('pdfStatus');
        const summaryDiv = document.getElementById('pdfSummary');
        const importBtn = document.getElementById('importPDFData');
        const cancelBtn = document.getElementById('cancelPDF');

        // Update status
        statusDiv.innerHTML = `
            <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 class="font-semibold text-green-800 mb-2"><i class="fas fa-check-circle mr-2"></i>PDF Processing Successful</h4>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-green-700">
                    <div><strong>Total Records:</strong> ${statistics.totalRecords}</div>
                    <div><strong>Average Payload:</strong> ${statistics.averagePayload} ${this.config.fleet.units.payload.symbol}</div>
                    <div><strong>Min Payload:</strong> ${statistics.minPayload} ${this.config.fleet.units.payload.symbol}</div>
                    <div><strong>Max Payload:</strong> ${statistics.maxPayload} ${this.config.fleet.units.payload.symbol}</div>
                    <div><strong>Excavators:</strong> ${statistics.excavatorCount}</div>
                    <div><strong>Dump Trucks:</strong> ${statistics.dumpTruckCount}</div>
                </div>
            </div>
        `;

        // Update summary counters
        document.getElementById('validCount').textContent = validData.length;
        document.getElementById('invalidCount').textContent = invalidData.length;
        document.getElementById('excavatorCountPreview').textContent = statistics.excavatorCount;
        document.getElementById('dumpTruckCountPreview').textContent = statistics.dumpTruckCount;

        // Update preview table
        const tableBody = document.getElementById('previewTableBody');
        tableBody.innerHTML = '';

        validData.slice(0, 10).forEach(item => {
            const statusName = this.getPayloadStatus(item.payload, item.statusOverride);
            const statusInfo = this._getStatusInfo(statusName);
            const row = document.createElement('tr');

            const eqNumCell = document.createElement('td');
            eqNumCell.className = 'px-3 py-2 text-sm font-medium text-gray-900';
            eqNumCell.textContent = item.eqNum;
            row.appendChild(eqNumCell);

            const payloadCell = document.createElement('td');
            payloadCell.className = 'px-3 py-2 text-sm text-gray-600';
            payloadCell.textContent = `${item.payload} ${this.config.fleet.units.payload.symbol}`;
            row.appendChild(payloadCell);

            const statusCell = document.createElement('td');
            statusCell.className = 'px-3 py-2';
            const statusSpan = document.createElement('span');
            // Use the same Tailwind classes as the main table for consistency
            statusSpan.className = statusInfo.tailwindClasses || '';
            statusSpan.innerHTML = `<i class="${statusInfo.icon || 'fas fa-question-circle'}"></i> ${statusInfo.name || statusName}`;
            statusCell.appendChild(statusSpan);
            row.appendChild(statusCell);

            tableBody.appendChild(row);
        });

        if (validData.length > 10) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="3" class="px-3 py-2 text-sm text-gray-500 italic text-center">
                    ... and ${validData.length - 10} more records
                </td>
            `;
            tableBody.appendChild(row);
        }

        // Show/hide error section
        const errorSection = document.getElementById('pdfErrors');
        if (invalidData.length > 0) {
            errorSection.classList.remove('hidden');
            const errorList = document.getElementById('errorList');
            errorList.innerHTML = '';
            invalidData.slice(0, 5).forEach(item => {
                const li = document.createElement('li');
                li.textContent = `${item.eqNum}: ${item.issues.join(', ')}`;
                errorList.appendChild(li);
            });
        } else {
            errorSection.classList.add('hidden');
        }

        // Show summary and import button
        summaryDiv.classList.remove('hidden');
        importBtn.classList.remove('hidden');
        importBtn.style.display = 'inline-block'; // Ensure button is visible

        // Hide format selector as processing is complete
        const formatSelector = document.getElementById('decimalFormatSelector');
        if (formatSelector) {
            formatSelector.style.display = 'none';
        }

        // Remove process button if it still exists
        const processBtn = document.getElementById('processPDFBtn');
        if (processBtn) {
            processBtn.remove();
        }

        // Setup import button click handler
        // Setup import button click handler
        importBtn.onclick = () => {
            this.importExtractedData(validData, extractionResult);
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        };

        // Setup cancel button click handler
        cancelBtn.onclick = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            // Reset file input to allow re-selecting the same file
            const fileInput = document.getElementById('pdfFileInput');
            if (fileInput) {
                fileInput.value = '';
            }
            this.logger.debugLog('PDF import cancelled, file input reset');
        };

        // Show modal
        modal.classList.remove('hidden');
    }

    importExtractedData(validData, extractionResult = null) {
        this.logger.debugLog('Importing extracted data:', validData);
        this.logger.debugLog('Extraction result:', extractionResult);
        console.log('Current fleet data before import:', this.fleetData);

        // Store extracted average payload if available
        if (extractionResult && extractionResult.extractedAvgPayload !== null) {
            this.extractedAvgPayload = extractionResult.extractedAvgPayload;
            console.log('Stored extracted average payload:', this.extractedAvgPayload);
        }

        if (this.fleetData.length > 0) {
            const message = this.config.ui.text.confirmReplaceData.replace('{count}', this.fleetData.length);
            this._showConfirmation(message, () => {
                this._performImport(validData, extractionResult);
            });
        } else {
            this._performImport(validData, extractionResult);
        }
    }

    _performImport(validData, extractionResult) {
        // Replace data with new extraction
        this.fleetData = [...validData]; // Use spread to ensure clean copy
        console.log('Data replaced with new PDF extraction:', this.fleetData.length, 'records');

        // Auto-assign supervisors if there are excavators with supervisors
        this.initializeSupervisors();

        console.log('Final fleet data after import:', this.fleetData);
        this.updateDisplay();

        // Show success message in console instead of alert
        console.log(`Successfully imported ${validData.length} fleet records! Supervisors have been auto-assigned based on excavator ranges.`);

        // Hide the modal after successful import
        const modal = document.getElementById('pdfPreviewModal');
        if (modal) {
            modal.classList.add('hidden');
        }

        // Reset file input after successful import
        const fileInput = document.getElementById('pdfFileInput');
        if (fileInput) {
            fileInput.value = '';
            this.logger.debugLog('File input reset after successful import');
        }

        // Show success message
        this.showStatusMessage(this.config.ui.text.importSuccess.replace('{count}', validData.length), 'success');
    }

    // Load sample data for testing purposes
    // Function to initialize supervisors based on excavator assignments
    initializeSupervisors() {
        // Get all excavators with supervisors
        const excavatorsWithSupervisors = this.fleetData.filter(item =>
            item.eqNum.startsWith('EX') && item.supervisor
        );

        // Auto-assign supervisors to dump trucks
        excavatorsWithSupervisors.forEach(excavator => {
            const excavatorIndex = this.fleetData.findIndex(item => item.eqNum === excavator.eqNum);
            if (excavatorIndex >= 0) {
                this.autoAssignSupervisor(excavatorIndex, excavator.supervisor);
            }
        });
    }

    loadSampleDataForTesting() {
        const load = () => {
            // Sample data for testing
            const sampleData = [
                { eqNum: "EX2046", payload: 38.9, supervisor: "Ahmad Subandi" },
                { eqNum: "DT2080", payload: 37.4, supervisor: "" },
                { eqNum: "DT2150", payload: 40.0, supervisor: "" },
                { eqNum: "DT2200", payload: 41.1, supervisor: "" },
                { eqNum: "DT2300", payload: 37.4, supervisor: "" },
                { eqNum: "DT2400", payload: 38.5, supervisor: "" },
                { eqNum: "DT2500", payload: 40.5, supervisor: "" },
                { eqNum: "EX3001", payload: 41.6, supervisor: "Budi Santoso" },
                { eqNum: "DT3050", payload: 36.1, supervisor: "" },
                { eqNum: "DT3100", payload: 39.7, supervisor: "" },
                { eqNum: "DT3200", payload: 42.9, supervisor: "" },
                { eqNum: "DT3300", payload: 40.2, supervisor: "" },
                { eqNum: "DT3400", payload: 43.5, supervisor: "" },
                { eqNum: "EX4003", payload: 40.8, supervisor: "Candra Wijaya" },
                { eqNum: "DT4010", payload: 42.6, supervisor: "" },
                { eqNum: "DT4050", payload: 40.0, supervisor: "" },
                { eqNum: "DT4100", payload: 42.5, supervisor: "" },
                { eqNum: "DT4200", payload: 41.1, supervisor: "" },
                { eqNum: "DT4300", payload: 40.9, supervisor: "" }
            ];

            this.fleetData = [...sampleData];
            this.extractedAvgPayload = null; // Reset extracted average payload for sample data

            // Auto-assign supervisors based on excavator ranges
            this.initializeSupervisors();

            this.updateDisplay();
            this.showStatusMessage(this.config.ui.text.sampleDataLoaded.replace('{count}', sampleData.length), 'success');
        };

        if (this.fleetData.length > 0) {
            const message = this.config.ui.text.confirmLoadSample.replace('{count}', this.fleetData.length);
            this._showConfirmation(message, load);
        } else {
            load();
        }
    }

    /**
     * Generate auto caption for sharing
     */
    generateAutoCaption() {
        if (this.fleetData.length === 0) {
            return 'Fleet Dashboard - No Data Available';
        }

        // Calculate statistics
        const payloads = this.fleetData.map(item => item.payload);
        const avgPayload = this.extractedAvgPayload !== null && this.extractedAvgPayload !== undefined
            ? this.extractedAvgPayload
            : (payloads.reduce((sum, p) => sum + p, 0) / payloads.length);
        const maxPayload = Math.max(...payloads);
        const minPayload = Math.min(...payloads);
        const optimalCount = this.fleetData.filter(item => this.getPayloadStatus(item.payload, item.statusOverride) === 'optimal').length;
        const underCount = this.fleetData.filter(item => this.getPayloadStatus(item.payload, item.statusOverride) === 'under').length;
        const overloadCount = this.fleetData.filter(item => this.getPayloadStatus(item.payload, item.statusOverride) === 'overload').length;

        // Format date as "18 November 2025, 00.35"
        const now = new Date();
        const formattedDate = now.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }) + ', ' + now.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).replace(':', '.');

        // Build caption with header
        let caption = '📊 *Laporan Fleet Payload Analysis Monitoring*\n';
        caption += `📅 ${formattedDate}\n`;
        caption += '━━━━━━━━━━━━━━━━━━━━\n\n';

        // Section 1: Dashboard statistics
        caption += '📊 *Ringkasan Statistik:*\n';
        caption += `• Rata-rata Payload: ${avgPayload.toFixed(1)} ton\n`;
        caption += `• Payload Maksimum: ${maxPayload.toFixed(1)} ton\n`;
        caption += `• Payload Minimum: ${minPayload.toFixed(1)} ton\n`;
        caption += `• Payload Under: ${underCount} unit\n`;
        caption += `• Payload Optimal: ${optimalCount} unit\n`;
        caption += `• Payload Overload: ${overloadCount} unit\n`;
        caption += '\n';

        // Section 2: List of Payload HD per fleet and supervisor
        caption += '🚜 *Detail Payload per Fleet:*\n\n';

        // Group data by excavator
        const groups = [];
        let currentGroup = [];
        this.fleetData.forEach(item => {
            if (item.eqNum.startsWith('EX')) {
                if (currentGroup.length > 0) groups.push(currentGroup);
                currentGroup = [item];
            } else {
                if (currentGroup.length > 0) currentGroup.push(item);
            }
        });
        if (currentGroup.length > 0) groups.push(currentGroup);

        // Format each group
        groups.forEach(group => {
            const excavator = group[0];
            const dumpTrucks = group.slice(1);

            caption += `Fleet ${excavator.eqNum}`;
            if (excavator.supervisor) {
                caption += ` - Pengawas: ${excavator.supervisor}`;
            }
            caption += '\n';

            // List dump trucks with payloads
            dumpTrucks.forEach(dt => {
                const status = this.getPayloadStatus(dt.payload, dt.statusOverride);
                const statusText = this.getStatusText(status);
                caption += `  • ${dt.eqNum}: ${dt.payload.toFixed(1)} ton (${statusText})\n`;
            });
            caption += '\n';
        });

        // Footer
        caption += '━━━━━━━━━━━━━━━━━━━━\n';
        caption += '📱 Fleet Payload Analysis Monitoring Dashboard\n';

        return caption;
    }

    /**
     * Share dashboard data as PDF with auto-generated caption
     * WhatsApp approach: Copy caption to clipboard first, then share PDF file only
     */
    async shareDashboard() {
        if (this.fleetData.length === 0) {
            this.showStatusMessage('Tidak ada data untuk dibagikan', 'warning');
            return;
        }

        // Check if Web Share API is supported
        // Note: We check support but don't block - fallback to download if sharing unavailable
        const webShareSupported = typeof navigator.share === 'function';
        const canShareFiles = (file) => {
            try {
                return navigator.canShare && navigator.canShare({ files: [file] });
            } catch {
                return false;
            }
        };

        try {
            this.showLoadingState('Memproses PDF untuk dibagikan...');

            // Generate auto caption
            const caption = this.generateAutoCaption();

            // Step 1: Copy caption to clipboard FIRST (WhatsApp doesn't support caption with files)
            // This ensures caption is available regardless of share outcome
            let clipboardSuccess = false;
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(caption);
                    clipboardSuccess = true;
                    this.logger.debugLog('Caption copied to clipboard');
                }
            } catch (clipboardError) {
                this.logger.debugWarn('Could not copy to clipboard:', clipboardError);
            }

            // Generate PDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('l', 'mm', 'a4');
            let yPos = 15;

            // Title
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.text('Fleet Monitoring Dashboard Report', 14, yPos);
            yPos += 7;

            // Format date as "2 November 2025, 23.09"
            const now = new Date();
            const formattedDate = now.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }) + ', ' + now.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).replace(':', '.');

            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text(`Generated: ${formattedDate}`, 14, yPos);
            yPos += 10;

            // Section 1: Statistics
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('1. Dashboard Statistics', 14, yPos);
            yPos += 7;

            const payloads = this.fleetData.map(item => item.payload);
            const avgPayload = this.extractedAvgPayload !== null && this.extractedAvgPayload !== undefined
                ? this.extractedAvgPayload
                : (payloads.reduce((sum, p) => sum + p, 0) / payloads.length);
            const maxPayload = Math.max(...payloads);
            const minPayload = Math.min(...payloads);
            const optimalCount = this.fleetData.filter(item => this.getPayloadStatus(item.payload, item.statusOverride) === 'optimal').length;
            const underCount = this.fleetData.filter(item => this.getPayloadStatus(item.payload, item.statusOverride) === 'under').length;
            const overloadCount = this.fleetData.filter(item => this.getPayloadStatus(item.payload, item.statusOverride) === 'overload').length;

            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text(`Rata-rata Payload: ${avgPayload.toFixed(1)} ton`, 20, yPos);
            yPos += 5;
            doc.text(`Payload Maksimum: ${maxPayload.toFixed(1)} ton`, 20, yPos);
            yPos += 5;
            doc.text(`Payload Minimum: ${minPayload.toFixed(1)} ton`, 20, yPos);
            yPos += 5;
            doc.text(`Payload Under: ${underCount} unit`, 20, yPos);
            yPos += 5;
            doc.text(`Payload Optimal: ${optimalCount} unit`, 20, yPos);
            yPos += 5;
            doc.text(`Payload Overload: ${overloadCount} unit`, 20, yPos);
            yPos += 10;

            // Section 2: Fleet Data Table
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('2. Fleet Payload Details', 14, yPos);
            yPos += 5;

            // Prepare table data
            const tableData = this.fleetData.map(item => {
                const isExcavator = item.eqNum.startsWith('EX');
                return [
                    item.eqNum,
                    item.payload.toFixed(1),
                    this.getStatusText(this.getPayloadStatus(item.payload, item.statusOverride)),
                    isExcavator ? (item.supervisor || '-') : ''
                ];
            });

            // Create table using autoTable
            doc.autoTable({
                startY: yPos,
                head: [['Fleet', 'Payload (ton)', 'Status', 'Pengawas']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 2 },
                columnStyles: {
                    0: { cellWidth: 30, fontStyle: 'bold' },
                    1: { cellWidth: 30, halign: 'center' },
                    2: { cellWidth: 35, halign: 'center' },
                    3: { cellWidth: 50 }
                },
                didParseCell: (data) => {
                    // Color excavator rows
                    if (data.section === 'body' && data.column.index === 0) {
                        const eqNum = data.cell.raw;
                        if (typeof eqNum === 'string' && eqNum.startsWith('EX')) {
                            data.cell.styles.fillColor = [179, 229, 252]; // Light blue for excavators
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                }
            });

            // Convert PDF to blob
            const pdfBlob = doc.output('blob');
            const filename = `fleet-dashboard-${new Date().toISOString().split('T')[0]}.pdf`;

            // Create file from blob
            const file = new File([pdfBlob], filename, { type: 'application/pdf' });

            this.hideLoadingState();

            // Step 2: Attempt to share using Web Share API with graceful fallback
            if (webShareSupported && canShareFiles(file)) {
                // Browser supports file sharing - use Web Share API
                try {
                    await navigator.share({
                        files: [file]
                    });

                    if (clipboardSuccess) {
                        this.showStatusMessage('PDF berhasil dibagikan! Caption sudah disalin ke clipboard.', 'success', 5000);
                    } else {
                        this.showStatusMessage('PDF berhasil dibagikan!', 'success', 5000);
                    }
                } catch (shareError) {
                    if (shareError.name === 'AbortError') {
                        this.showStatusMessage('Sharing dibatalkan', 'info');
                    } else {
                        // Share failed - fallback to download
                        this.logger.debugWarn('Share failed, falling back to download:', shareError);
                        this.downloadPdfFallback(pdfBlob, filename);
                        if (clipboardSuccess) {
                            this.showStatusMessage('Caption disalin ke clipboard! PDF diunduh karena sharing gagal.', 'success', 5000);
                        } else {
                            this.showStatusMessage('PDF berhasil diunduh.', 'success', 5000);
                        }
                    }
                }
            } else {
                // Browser doesn't support file sharing - fallback to download
                this.downloadPdfFallback(pdfBlob, filename);
                if (clipboardSuccess) {
                    this.showStatusMessage('Caption disalin ke clipboard! PDF diunduh (browser tidak mendukung share file).', 'success', 5000);
                } else {
                    this.showStatusMessage('PDF berhasil diunduh.', 'success', 5000);
                }
            }

        } catch (error) {
            this.hideLoadingState();
            this.logger.debugError('Share error:', error);
            this.showStatusMessage('Gagal memproses dashboard: ' + error.message, 'error');
        }
    }

    /**
     * Fallback method to download PDF when sharing is not available
     */
    downloadPdfFallback(pdfBlob, filename) {
        const url = window.URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
}

// Initialize dashboard when DOM is loaded
let dashboard;
document.addEventListener('DOMContentLoaded', function () {
    dashboard = new FleetDashboard();

    // Make dashboard globally available for PDF extractor and other modules
    window.dashboard = dashboard;

    // Use debug logging for initialization message
    if (window.FleetConfig && window.FleetConfig.environment.debugMode) {
        dashboard.logger.debugLog('Dashboard initialized and exposed globally');
    }
});