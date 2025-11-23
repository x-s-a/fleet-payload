/**
 * Fleet Dashboard Configuration
 * Centralized configuration for the entire application
 * @author www.asa.sh
 * @version 1.2.1
 */

window.FleetConfig = {
    /**
     * Environment Configuration
     * Set production to true to hide development features
     */
    environment: {
        production: false, // Set to true for production deployment
        showDevelopmentFeatures: true, // Will be automatically set based on production flag
        debugMode: true // Enable/disable debug logging
    },

    /**
     * Application Information
     */
    app: {
        name: 'Fleet Monitoring Dashboard',
        version: '1.2.1',
        author: 'www.asa.sh',
        description: 'Fleet payload analysis monitoring'
    },

    /**
     * Status Message System Configuration
     */
    statusMessages: {
        // Default duration for all messages (7 seconds)
        defaultDuration: 7000,

        // Animation settings
        animation: {
            slideInDelay: 10,
            transitionDuration: 300,
            easeFunction: 'ease-in-out'
        },

        // Message type configurations with consistent 7-second duration
        types: {
            'error': {
                bg: 'bg-red-500',
                icon: 'fas fa-exclamation-circle',
                border: 'border-red-600',
                duration: 7000,
                description: 'Failed operations, validation errors'
            },
            'success': {
                bg: 'bg-green-500',
                icon: 'fas fa-check-circle',
                border: 'border-green-600',
                duration: 7000,
                description: 'Successful completion, data imported'
            },
            'info': {
                bg: 'bg-blue-500',
                icon: 'fas fa-info-circle',
                border: 'border-blue-600',
                duration: 7000,
                description: 'General information, instructions'
            },
            'warning': {
                bg: 'bg-yellow-500',
                icon: 'fas fa-exclamation-triangle',
                border: 'border-yellow-600',
                duration: 7000,
                description: 'Warnings, no data found'
            },
            'processing': {
                bg: 'bg-purple-500',
                icon: 'fas fa-spinner fa-spin',
                border: 'border-purple-600',
                duration: 7000, // Can be overridden for persistent display
                description: 'Ongoing operations, PDF extraction'
            }
        },

        // Special configurations
        special: {
            // For processing messages that need persistent display
            persistentProcessing: {
                duration: 0, // 0 = no auto-hide
                manualClose: true
            },
            // For critical errors that need longer display
            criticalError: {
                duration: 10000, // 10 seconds
                manualClose: true
            }
        }
    },

    /**
     * Fleet Data Configuration
     */
    fleet: {
        // Unit configuration - centralized unit settings
        units: {
            payload: {
                symbol: 'ton',
                name: 'Ton',
                description: 'Metric Ton - unit massa untuk payload'
            }
        },

        // Payload threshold ranges for status calculation
        thresholds: {
            under: {
                min: 0,
                max: 97.99,  // < 98
                description: 'Under threshold'
            },
            optimal: {
                min: 98,
                max: 105,   // >= 98 and <= 105
                description: 'Optimal range'
            },
            overload: {
                min: 105.01,  // > 105
                max: 1000,
                description: 'Overload condition'
            }
        },

        // Validation rules
        validation: {
            eqNum: {
                pattern: /^(EX|DT)\d{4}$/,
                formats: ['EX####', 'DT####'],
                description: 'Equipment number format'
            },
            payload: {
                min: 0,
                max: 1000,
                unit: 'ton',
                description: 'Payload range in {unit}'
            }
        },

        // Equipment types
        equipmentTypes: {
            excavator: {
                prefix: 'EX',
                name: 'Excavator',
                icon: 'fas fa-cogs',
                color: 'blue'
            },
            dumpTruck: {
                prefix: 'DT',
                name: 'Dump Truck',
                icon: 'fas fa-truck',
                color: 'green'
            }
        },

        // Status configurations
        statusTypes: {
            under: {
                name: 'Under',
                description: 'Payload < 98 {unit}',
                color: 'yellow',
                icon: 'fas fa-exclamation-triangle',
                tailwindClasses: 'bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-full font-semibold text-sm inline-flex items-center gap-2 text-center min-w-[100px]'
            },
            optimal: {
                name: 'Optimal',
                description: 'Payload 98-105 {unit}',
                color: 'green',
                icon: 'fas fa-check-circle',
                tailwindClasses: 'bg-green-100 text-green-800 px-3 py-1.5 rounded-full font-semibold text-sm inline-flex items-center gap-2 text-center min-w-[100px]'
            },
            overload: {
                name: 'Overload',
                description: 'Payload > 105 {unit}',
                color: 'red',
                icon: 'fas fa-exclamation-circle',
                tailwindClasses: 'bg-red-100 text-red-800 px-3 py-1.5 rounded-full font-semibold text-sm inline-flex items-center gap-2 text-center min-w-[100px]'
            }
        },

        // Helper function to get formatted descriptions with units
        getStatusDescription: function (status) {
            const statusType = this.statusTypes[status];
            if (statusType && statusType.description) {
                return statusType.description.replace('{unit}', this.units.payload.symbol);
            }
            return '';
        },

        // Helper function to format payload validation description
        getPayloadValidationDescription: function () {
            return this.validation.payload.description.replace('{unit}', this.units.payload.name);
        },

        // Helper function to format PDF messages with units
        formatPDFMessage: function (messageKey, values = {}) {
            try {
                // Access PDF messages through the root FleetConfig with fallback
                const messages = window.FleetConfig?.pdf?.extraction?.messages;
                if (!messages || !messages[messageKey]) {
                    console.warn(`PDF message '${messageKey}' not found`);
                    return messageKey; // Return the key as fallback
                }

                let formattedMessage = messages[messageKey];
                // Replace {unit} placeholder
                formattedMessage = formattedMessage.replace('{unit}', this.units.payload.symbol);
                // Replace other placeholders from values object
                Object.keys(values).forEach(key => {
                    formattedMessage = formattedMessage.replace(new RegExp(`{${key}}`, 'g'), values[key]);
                });
                return formattedMessage;
            } catch (error) {
                console.error(`Error formatting PDF message '${messageKey}':`, error);
                return messageKey; // Return the key as fallback
            }
        }
    },

    /**
     * PDF Processing Configuration
     */
    pdf: {
        // PDF.js version and settings
        version: '5.4.149',
        workerPath: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.worker.min.mjs',

        // Text extraction settings
        extraction: {
            version: '2.0.0',
            // Regex pattern for fleet data matching
            dataPattern: /^\s*(EX\d{4}|DT\d{4}|Total)\s+([\d\.-]+)/,

            // CSV format configuration
            csvHeaders: ['EqNum', 'Payload'],

            // Processing messages
            messages: {
                reading: 'Membaca file PDF...',
                loaded: 'PDF berhasil dimuat. Jumlah halaman: {pages}. Mengekstrak teks...',
                processing: 'Ekstraksi teks selesai. Memformat ke CSV...',
                success: 'Ekstraksi berhasil! Semua data ditemukan.',
                empty: 'Ekstraksi selesai, tetapi tidak ada data yang cocok ditemukan.',
                error: 'Gagal memproses PDF',
                invalidFile: 'Silakan pilih file dengan format PDF.',
                notReady: 'PDF library belum siap. Silakan tunggu sebentar dan coba lagi.',

                // Additional condition messages
                validating: 'Memvalidasi data yang diekstrak...',
                partialSuccess: 'Ekstraksi selesai dengan {valid} data valid dan {invalid} data tidak valid.',
                noValidData: 'Tidak ada data valid yang dapat digunakan dari PDF ini.',
                largePDF: 'PDF berukuran besar terdeteksi, proses mungkin membutuhkan waktu lebih lama...',
                multiPage: 'Memproses PDF dengan {pages} halaman...',
                dataFound: 'Ditemukan {count} record data fleet.',
                parseComplete: 'Parsing selesai, mempersiapkan hasil...',
                averageCalculated: 'Rata-rata payload: {average} {unit} dari {total} unit.',
                noDataFoundInPdf: 'Tidak ada data fleet yang cocok ditemukan dalam PDF.'
            }
        }
    },

    /**
     * UI Configuration
     */
    ui: {
        // Table settings
        table: {
            maxPreviewRows: 10,
            hierarchicalDisplay: true,
            showRowNumbers: true
        },

        // Modal settings
        modal: {
            maxWidth: '4xl',
            maxHeight: '90vh',
            backdrop: 'modal-backdrop'
        },

        // Loading indicator settings
        loading: {
            position: 'top-right',
            autoHide: true,
            showSpinner: true
        },

        // Search Configuration
        search: {
            enabled: true,
            global: true, // If true, search across all fields; if false, search only eqNum
            placeholder: 'Cari apapun: nomor unit, supervisor, status...',
            placeholderFallback: 'Cari EqNum...',
            showIcon: true,
            showTooltip: true,
            tooltipText: 'Contoh: "Asa", "EX2046", "Overload", "42"',
            helperText: '<div class="flex items-center"><i class="fas fa-info-circle mr-2 text-blue-400"></i><span>Tips: Ketik <span class="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium mx-1">EX</span> untuk excavator, <span class="inline-block px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium mx-1">DT</span> untuk dump truck, atau nama supervisor</span></div>',

            // Define which fields are searchable when global search is enabled
            searchableFields: {
                eqNum: { enabled: true, label: 'Equipment Number' },
                supervisor: { enabled: true, label: 'Supervisor Name' },
                status: { enabled: true, label: 'Payload Status' },
                payload: { enabled: true, label: 'Payload Value' }
            },

            // Search behavior
            caseSensitive: false,
            partialMatch: true,
            realTime: true
        },

        // Filter Configuration
        filters: {
            enabled: true,

            // Individual filter controls
            excavatorFilter: {
                enabled: true,
                label: 'Filter Excavator',
                placeholder: 'Semua Excavator',
                icon: 'fas fa-cogs'
            },

            dumpTruckFilter: {
                enabled: true,
                label: 'Filter Dump Truck',
                placeholder: 'Semua Dump Truck',
                icon: 'fas fa-truck',
                // Note: This replaces the confusing "HD" filter
                oldName: 'hdFilter' // For migration purposes
            },

            supervisorFilter: {
                enabled: true,
                label: 'Filter Supervisor',
                placeholder: 'Semua Supervisor',
                icon: 'fas fa-user-tie'
            },

            statusFilter: {
                enabled: true,
                label: 'Filter Status Payload',
                placeholder: 'Semua Status',
                icon: 'fas fa-chart-bar',
                options: [
                    { value: '', label: 'Semua Status' },
                    { value: 'under', label: 'Underload', color: 'text-yellow-600' },
                    { value: 'optimal', label: 'Optimal', color: 'text-green-600' },
                    { value: 'overload', label: 'Overload', color: 'text-red-600' }
                ]
            },

            // Clear filters button
            clearButton: {
                enabled: true,
                label: 'Reset Semua Filter',
                icon: 'fas fa-eraser',
                style: 'bg-red-600 hover:bg-red-700 text-white'
            },

            // Layout configuration
            layout: {
                responsive: true,
                desktop: { columns: 3, spacing: 'gap-6' }, // 3 columns on desktop
                tablet: { columns: 2, spacing: 'gap-4' },  // 2 columns on tablet
                mobile: { columns: 1, spacing: 'gap-3' }   // 1 column on mobile
            },

            // Quick filter buttons for status
            quickFilters: {
                enabled: true,
                statusButtons: {
                    enabled: true,
                    showIcons: true,
                    buttons: [
                        { value: '', label: '<i class="fas fa-chart-bar"></i> Semua', style: 'bg-gray-600 hover:bg-gray-700' },
                        { value: 'under', label: '<i class="fas fa-exclamation-triangle"></i> Under', style: 'bg-yellow-600 hover:bg-yellow-700' },
                        { value: 'optimal', label: '<i class="fas fa-check-circle"></i> Optimal', style: 'bg-green-600 hover:bg-green-700' },
                        { value: 'overload', label: '<i class="fas fa-exclamation-circle"></i> Over', style: 'bg-red-600 hover:bg-red-700' }
                    ]
                }
            }
        },

        // Theme colors (Tailwind CSS classes)
        colors: {
            primary: 'blue',
            secondary: 'gray',
            success: 'green',
            warning: 'yellow',
            error: 'red',
            info: 'blue'
        },

        // Centralized UI text for internationalization
        text: {
            // Sidebar and buttons
            importPDF: 'Import PDF',
            exportExcel: 'Export Excel',
            printReport: 'Print Report',
            resetFilters: 'Reset Filters',
            loadSampleData: 'Load Sample',
            clearData: 'Clear Data',

            // Filters
            allExcavators: 'Semua Excavator',
            allDumpTrucks: 'Semua Dump Truck',
            allSupervisors: 'Semua Supervisor',

            // Modals
            editSupervisorTitle: 'Edit Pengawas untuk {eqNum}',
            pdfPreviewTitle: 'PDF Import Preview',
            decimalFormatTitle: 'Format Angka di PDF',
            btnSave: 'Simpan',
            btnCancel: 'Batal',
            btnConfirm: 'Confirm',
            btnEdit: 'Edit',
            btnImport: 'Import Data',
            editSupervisorNote: '<strong><i class="fas fa-lightbulb"></i> Catatan:</strong> Jika Anda mengedit pengawas untuk Excavator (EX), semua Dump Truck (DT) dalam range akan memiliki pengawas yang sama.',

            // Modal Titles
            confirmationModalTitle: 'Confirmation',

            // Confirmations
            confirmClearAll: 'Yakin ingin menghapus semua data? Tindakan ini tidak dapat dibatalkan.',
            confirmReplaceData: 'Data sudah ada ({count} records).\n\nImport akan MENGGANTI SEMUA data yang sudah ada.\n\nLanjutkan?',
            confirmLoadSample: 'Data sudah ada ({count} records).\n\nSample data akan MENGGANTI semua data yang ada.\n\nLanjutkan?',

            // Status Messages
            filtersReset: 'Semua filter telah direset',
            noDataToExport: 'Tidak ada data untuk diekspor',
            importCancelled: 'Import PDF dibatalkan oleh user',
            importSuccess: 'Berhasil mengimpor {count} data fleet!',
            sampleDataLoaded: 'Sample data loaded! {count} records added.'
        }
    },

    /**
     * Export Configuration
     */
    export: {
        excel: {
            filename: 'fleet-monitoring-data',
            sheetName: 'Fleet Data',
            includeTimestamp: true,
            includeStatistics: true
        },

        csv: {
            filename: 'fleet-data',
            delimiter: ',',
            includeHeaders: true
        }
    },

    /**
     * Development & Debug Configuration
     */
    debug: {
        logLevel: 'info', // 'debug', 'info', 'warn', 'error'
        showConsoleEmojis: true,
        showPerformanceMetrics: true
    }
};

// Freeze configuration to prevent accidental modifications
Object.freeze(window.FleetConfig);

// Log configuration load
if (window.FleetConfig.environment.debugMode) {
    const showEmojis = window.FleetConfig.debug.showConsoleEmojis;

    console.log(`DEBUG: showConsoleEmojis = ${showEmojis}`); // Debug line to verify setting

    console.log(showEmojis ? '⚙️ Fleet Dashboard Configuration loaded successfully' : 'Fleet Dashboard Configuration loaded successfully');
    console.log(showEmojis ? `📊 App: ${window.FleetConfig.app.name} v${window.FleetConfig.app.version}` : `App: ${window.FleetConfig.app.name} v${window.FleetConfig.app.version}`);
    console.log(showEmojis ? `🕒 Status Message Duration: ${window.FleetConfig.statusMessages.defaultDuration}ms` : `Status Message Duration: ${window.FleetConfig.statusMessages.defaultDuration}ms`);
    console.log(showEmojis ? `🚛 Payload Unit: ${window.FleetConfig.fleet.units.payload.symbol} (${window.FleetConfig.fleet.units.payload.name})` : `Payload Unit: ${window.FleetConfig.fleet.units.payload.symbol} (${window.FleetConfig.fleet.units.payload.name})`);
    console.log(showEmojis ? `⚖️ Thresholds: Under <${window.FleetConfig.fleet.thresholds.optimal.min}, Optimal ${window.FleetConfig.fleet.thresholds.optimal.min}-${window.FleetConfig.fleet.thresholds.optimal.max}, Overload >${window.FleetConfig.fleet.thresholds.optimal.max} ${window.FleetConfig.fleet.units.payload.symbol}` : `Thresholds: Under <${window.FleetConfig.fleet.thresholds.optimal.min}, Optimal ${window.FleetConfig.fleet.thresholds.optimal.min}-${window.FleetConfig.fleet.thresholds.optimal.max}, Overload >${window.FleetConfig.fleet.thresholds.optimal.max} ${window.FleetConfig.fleet.units.payload.symbol}`);
}