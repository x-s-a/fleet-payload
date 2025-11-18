/**
 * PDF Text Extraction Module
 * Advanced text processing for fleet data extraction
 * @author www.asa.sh
 * @version 1.0.0
 */

class PDFTextExtractor {
    constructor() {
        this.isInitialized = false;

        // Use centralized configuration
        this.config = window.FleetConfig;

        // Initialize the shared logger
        this.logger = new window.Logger(this.config);

        // Validate configuration is loaded
        if (!this.config) {
            console.error('FleetConfig not found! Make sure config.js is loaded before pdf-text-extractor.js'); // Keep direct console.error for initialization errors (no emoji since config not available)
            throw new Error('Configuration not loaded');
        }

        this.initialize();
    }

    /**
     * Performance monitoring utility - measures execution time
     */
    startPerformanceTimer(label) {
        if (this.config && this.config.environment.debugMode && this.config.debug.showPerformanceMetrics) {
            const timerLabel = this.config.debug.showConsoleEmojis ? `⏱️ PDF: ${label}` : `PDF: ${label}`;
            console.time(timerLabel);
        }
    }

    endPerformanceTimer(label) {
        if (this.config && this.config.environment.debugMode && this.config.debug.showPerformanceMetrics) {
            const timerLabel = this.config.debug.showConsoleEmojis ? `⏱️ PDF: ${label}` : `PDF: ${label}`;
            console.timeEnd(timerLabel);
        }
    }

    logPerformanceMetric(label, startTime, data = {}) {
        if (this.config && this.config.environment.debugMode && this.config.debug.showPerformanceMetrics) {
            const endTime = performance.now();
            const duration = (endTime - startTime).toFixed(2);
            const perfMessage = this.logger._formatLogMessage(`PDF ${label}: ${duration}ms`, 'performance');
            console.log(perfMessage, data);
        }
    }

    /**
     * Normalize number string based on decimal format selection
     * @param {string} str - Raw number string from PDF
     * @param {string} format - 'comma' for European format (1.234,56) or 'dot' for US format (1,234.56)
     * @returns {string} - Standardized number string with dot as decimal separator
     */
    normalizeNumber(str, format) {
        if (format === 'comma') {
            // European format: dot as thousands separator, comma as decimal
            // - Remove all dots (thousands separators)
            // - Replace comma with dot (decimal separator)
            return str.replace(/\./g, '').replace(',', '.');
        } else { // format === 'dot'
            // US format: comma as thousands separator, dot as decimal
            // - Remove all commas (thousands separators)
            // - Keep dots as decimal separators
            return str.replace(/,/g, '');
        }
    }

    /**
     * Initialize PDF.js library
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            if (window.pdfjsLib) {
                this.isInitialized = true;
                this.logger.debugLog('PDF.js library loaded successfully');
            } else {
                this.logger.debugLog('Waiting for PDF.js to load...');
                setTimeout(() => this.initialize(), 100);
            }
        } catch (error) {
            this.logger.debugError('Failed to initialize PDF.js:', error);
        }
    }

    /**
     * Main method for PDF data extraction
     * @param {File} file - PDF file to extract
     * @param {string} decimalFormat - 'comma' or 'dot' format selection
     * @returns {Promise<Object>} Extraction result with data and statistics
     */
    async extractDataFromPDF(file, decimalFormat = 'dot') {
        const overallStartTime = performance.now();
        this.startPerformanceTimer('PDF Extraction - Total');

        // Start loading state immediately when extraction begins
        this.startLoading('Memulai proses ekstraksi PDF...');

        if (!file || file.type !== 'application/pdf') {
            this.finishLoading(this.config.pdf.extraction.messages.invalidFile, 'error');
            throw new Error(this.config.pdf.extraction.messages.invalidFile);
        }

        if (!this.isInitialized || !window.pdfjsLib) {
            this.finishLoading(this.config.pdf.extraction.messages.notReady, 'warning');
            throw new Error(this.config.pdf.extraction.messages.notReady);
        }

        this.logger.debugLog(`Starting PDF extraction with decimal format: ${decimalFormat}`);

        // Implementation of extraction using FileReader
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();

            fileReader.onload = async () => {
                try {
                    // Convert the file to a format that PDF.js can read
                    const typedarray = new Uint8Array(fileReader.result);

                    // Update loading message using dashboard integration
                    this.updateStatus(this.config.pdf.extraction.messages.reading, 'processing');

                    // Load the PDF using PDF.js
                    const pdf = await window.pdfjsLib.getDocument(typedarray).promise;

                    // Show appropriate message based on PDF size
                    if (pdf.numPages > 5) {
                        this.updateStatus(this.config.pdf.extraction.messages.largePDF, 'processing');
                        await new Promise(resolve => setTimeout(resolve, 1500)); // Brief pause for large PDF warning
                        const multiPageMessage = this.config.fleet.formatPDFMessage('multiPage', { pages: pdf.numPages });
                        this.updateStatus(multiPageMessage, 'processing');
                    } else if (pdf.numPages > 1) {
                        const multiPageMessage = this.config.fleet.formatPDFMessage('multiPage', { pages: pdf.numPages });
                        this.updateStatus(multiPageMessage, 'processing');
                    } else {
                        const loadedMessage = this.config.fleet.formatPDFMessage('loaded', { pages: pdf.numPages });
                        this.updateStatus(loadedMessage, 'processing');
                    }

                    // Update progress for text extraction
                    this.updateStatus('Extracting text from PDF pages...', 'processing');

                    let allLines = [];

                    // Process each page of the PDF
                    for (let i = 1; i <= pdf.numPages; i++) {
                        if (pdf.numPages > 1) {
                            this.updateStatus(`Processing page ${i} of ${pdf.numPages}...`, 'processing');
                        }

                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();

                        // Extract coordinates and text from each item
                        const lines = {};
                        textContent.items.forEach((item) => {
                            const y = Math.round(item.transform[5]);
                            if (!lines[y]) lines[y] = [];
                            lines[y].push({ x: item.transform[4], text: item.str });
                        });

                        // Sort by vertical (Y) then horizontal (X) coordinates
                        const sortedYCoordinates = Object.keys(lines).map(Number);
                        sortedYCoordinates.sort((a, b) => b - a);

                        // Build text lines based on coordinates
                        for (const y of sortedYCoordinates) {
                            lines[y].sort((a, b) => a.x - b.x);
                            const lineText = lines[y].map((item) => item.text).join(" ");
                            allLines.push(lineText);
                        }
                    }

                    this.updateStatus(this.config.pdf.extraction.messages.processing, 'processing');

                    // Convert to CSV format
                    let csvContent = "EqNum,Payload\n";
                    const extractedData = [];
                    let extractedAvgPayload = null; // Store the "Total" value

                    // Regex pattern to match fleet data
                    const dataRegex = /^\s*(EX\d{4}|DT\d{4}|Total)\s+([\d\.,\-]+)/; // Updated to include comma and dot patterns
                    let dataFound = false;

                    // Process each line only once to fix duplication bug
                    allLines.forEach((line) => {
                        const match = line.match(dataRegex);
                        if (match) {
                            const eqNum = match[1];
                            let rawPayload = match[2];

                            // Normalize the payload number based on the selected format
                            const normalizedPayload = this.normalizeNumber(rawPayload, decimalFormat);
                            const numericPayload = parseFloat(normalizedPayload);

                            // Add debug logging for number conversion
                            this.logger.debugLog(`Number conversion: "${rawPayload}" (${decimalFormat}) -> "${normalizedPayload}" -> ${numericPayload}`);

                            csvContent += `${eqNum},${normalizedPayload}\n`;

                            // Store the "Total" value as the average payload
                            if (eqNum === 'Total') {
                                extractedAvgPayload = numericPayload;
                                this.logger.debugLog(`Found Total average payload: ${extractedAvgPayload}`);
                            } else {
                                // Add to extracted data (exclude "Total" for the dashboard)
                                extractedData.push({
                                    eqNum: eqNum,
                                    payload: numericPayload,
                                    supervisor: ''
                                });
                            }

                            dataFound = true;
                            this.logger.debugLog(`Found: ${eqNum} -> ${rawPayload} -> ${numericPayload}`);
                        }
                    });

                    this.logger.debugLog(`Debug: Total lines processed: ${allLines.length}`);
                    this.logger.debugLog(`Debug: Total records found: ${extractedData.length}`);
                    this.logger.debugLog(`Debug: Extracted data:`, extractedData);

                    // Show data found message
                    if (extractedData.length > 0) {
                        const dataFoundMessage = this.config.fleet.formatPDFMessage('dataFound', { count: extractedData.length });
                        this.updateStatus(dataFoundMessage, 'info');
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause

                        // Show validation message
                        this.updateStatus(this.config.pdf.extraction.messages.validating, 'processing');
                        await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause
                    }

                    // Prepare the extraction result
                    if (dataFound) {
                        // Show parse complete message
                        this.updateStatus(this.config.pdf.extraction.messages.parseComplete, 'processing');
                        await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause

                        // Show average if available
                        if (extractedAvgPayload) {
                            const avgMessage = this.config.fleet.formatPDFMessage('averageCalculated', {
                                average: extractedAvgPayload,
                                total: extractedData.length
                            });
                            this.finishLoading(avgMessage, 'info');
                            await new Promise(resolve => setTimeout(resolve, 2000)); // Longer pause for average
                        }

                        // Final success message
                        this.finishLoading(this.config.pdf.extraction.messages.success, 'success');

                        // Performance logging
                        this.endPerformanceTimer('PDF Extraction - Total');
                        this.logPerformanceMetric('Extraction Complete', overallStartTime, {
                            fileSize: file.size,
                            totalRecords: extractedData.length,
                            extractedAverage: extractedAvgPayload,
                            csvLength: csvContent.length
                        });

                        resolve({
                            csvContent: csvContent,
                            extractedData: extractedData,
                            extractedAvgPayload: extractedAvgPayload, // Add extracted average payload
                            totalRecords: extractedData.length,
                            success: true
                        });
                    } else {
                        // No data found - finish loading with a warning
                        this.finishLoading(this.config.pdf.extraction.messages.empty, 'warning');

                        reject(new Error(this.config.pdf.extraction.messages.noDataFoundInPdf));
                    }

                } catch (error) {
                    // An error occurred - finish loading with an error message
                    this.finishLoading(this.config.pdf.extraction.messages.error, 'error');
                    this.logger.debugError('Error processing PDF:', error);
                    reject(new Error(`Failed to process PDF: ${error.message}`));
                }
            };

            // Start reading the file
            fileReader.readAsArrayBuffer(file);
        });
    }

    /**
     * Helper methods for status and output management
     */

    /**
     * Update processing status with visual feedback
     * Uses dashboard's centralized status system with persistent loading for ongoing processes
     * @param {string} message - Status message to display
     * @param {string} type - Message type (info, success, error, warning, processing)
     */
    updateStatus(message, type = 'info') {
        this.logger.debugLog(`updateStatus called: "${message}" (${type})`);
        this.logger.debugLog('window.dashboard available:', !!window.dashboard);

        // Update status element if available (for fallback)
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = message;
            this.logger.debugLog('Updated status element');
        }

        // Use dashboard's centralized status system if available
        if (window.dashboard && typeof window.dashboard.showStatusMessage === 'function') {
            if (type === 'processing') {
                // Use persistent loading state for ongoing processes
                if (typeof window.dashboard.updateLoadingState === 'function') {
                    this.logger.debugLog('Using dashboard.updateLoadingState');
                    window.dashboard.updateLoadingState(message);
                } else {
                    this.logger.debugLog('Using dashboard.showStatusMessage (persistent)');
                    window.dashboard.showStatusMessage(message, type, 0); // 0 = no auto-hide
                }
            } else {
                // For other types, hide loading first then show result
                if (typeof window.dashboard.hideLoadingState === 'function') {
                    window.dashboard.hideLoadingState();
                }
                setTimeout(() => {
                    this.logger.debugLog('Using dashboard.showStatusMessage (timed)');
                    window.dashboard.showStatusMessage(message, type);
                }, 100); // Brief delay for smooth transition
            }
        } else {
            this.logger.debugLog('Dashboard not available - status update skipped');
        }

        this.logger.debugLog(`Status (${type}): ${message}`);
    }

    /**
     * Start loading process with persistent toast
     * @param {string} message - Initial loading message
     */
    startLoading(message) {
        this.logger.debugLog('startLoading called with message:', message);
        this.logger.debugLog('window.dashboard available:', !!window.dashboard);

        if (window.dashboard && typeof window.dashboard.showLoadingState === 'function') {
            this.logger.debugLog('Using dashboard.showLoadingState');
            window.dashboard.showLoadingState(message);
        } else {
            this.logger.debugLog('Fallback to updateStatus');
            this.updateStatus(message, 'processing');
        }
    }

    /**
     * Finish loading process and show final result
     * @param {string} message - Final result message
     * @param {string} type - Result type (success, error, warning, info)
     */
    finishLoading(message, type = 'success') {
        if (window.dashboard && typeof window.dashboard.hideLoadingState === 'function') {
            window.dashboard.hideLoadingState();
            setTimeout(() => {
                window.dashboard.showStatusMessage(message, type);
            }, 200); // Smooth transition delay
        } else {
            this.updateStatus(message, type);
        }
    }


    /**
     * Validate extracted fleet data
     * @param {Array} data - Raw extracted data
     * @returns {Object} Validation result with valid and invalid data
     */
    validateExtractedData(data) {
        const validData = [];
        const invalidData = [];

        // Show validation start message
        this.updateStatus(this.config.pdf.extraction.messages.validating, 'processing');

        data.forEach(item => {
            const issues = [];

            // Validate EqNum format using config pattern
            if (!this.config.fleet.validation.eqNum.pattern.test(item.eqNum)) {
                issues.push('Invalid equipment number format');
            }

            // Validate payload range using config
            const payload = parseFloat(item.payload);
            if (isNaN(payload) || payload < this.config.fleet.validation.payload.min || payload > this.config.fleet.validation.payload.max) {
                issues.push(`Payload out of valid range (${this.config.fleet.validation.payload.min}-${this.config.fleet.validation.payload.max} ${this.config.fleet.validation.payload.unit})`);
            }

            if (issues.length === 0) {
                validData.push(item);
            } else {
                invalidData.push({ ...item, issues });
            }
        });

        // Show validation results with appropriate messages
        if (validData.length === 0) {
            this.updateStatus(this.config.pdf.extraction.messages.noValidData, 'warning');
        } else if (invalidData.length > 0) {
            const partialMessage = this.config.fleet.formatPDFMessage('partialSuccess', {
                valid: validData.length,
                invalid: invalidData.length
            });
            this.updateStatus(partialMessage, 'warning');
        } else {
            this.updateStatus(`Validasi selesai: ${validData.length} data valid`, 'success');
        }

        return { validData, invalidData };
    }

    /**
     * Validate equipment number format
     * Uses centralized configuration for validation pattern
     * @param {string} eqNum - Equipment number to validate
     * @returns {boolean} True if valid format
     */
    isValidEqNum(eqNum) {
        return this.config.fleet.validation.eqNum.pattern.test(eqNum);
    }

    /**
     * Validate payload range
     * Uses centralized configuration for payload limits
     * @param {number} payload - Payload value to validate  
     * @returns {boolean} True if within acceptable range
     */
    isValidPayload(payload) {
        const numPayload = parseFloat(payload);
        return !isNaN(numPayload) &&
            numPayload >= this.config.fleet.validation.payload.min &&
            numPayload <= this.config.fleet.validation.payload.max;
    }

    /**
     * Calculate comprehensive statistics from extracted data
     * @param {Array} data - Extracted fleet data
     * @returns {Object} Statistical summary
     */
    calculateStatistics(data) {
        if (!data || data.length === 0) {
            return {
                totalRecords: 0,
                averagePayload: 0,
                minPayload: 0,
                maxPayload: 0,
                excavatorCount: 0,
                dumpTruckCount: 0
            };
        }

        const payloads = data.map(item => item.payload);
        const excavators = data.filter(item => item.eqNum.startsWith('EX'));
        const dumpTrucks = data.filter(item => item.eqNum.startsWith('DT'));

        return {
            totalRecords: data.length,
            averagePayload: parseFloat((payloads.reduce((sum, p) => sum + p, 0) / payloads.length).toFixed(1)),
            minPayload: Math.min(...payloads),
            maxPayload: Math.max(...payloads),
            excavatorCount: excavators.length,
            dumpTruckCount: dumpTrucks.length
        };
    }

    /**
     * Dashboard integration methods
     */

    /**
     * Generate CSV content from fleet data
     * @param {Array} data - Fleet data array
     * @returns {string} Formatted CSV content
     */
    generateCSVContent(data) {
        let csv = 'EqNum,Payload\n';
        data.forEach(item => {
            csv += `${item.eqNum},${item.payload}\n`;
        });
        return csv;
    }
}

// Export for dashboard integration
window.PDFTextExtractor = PDFTextExtractor;

// Module info
// Only show this message if debug mode is enabled
if (window.FleetConfig && window.FleetConfig.environment.debugMode) {
    const version = window.FleetConfig.pdf.extraction.version || 'N/A';
    const message = window.FleetConfig.debug.showConsoleEmojis ?
        `🚛 PDF Text Extractor v${version} - Fleet Data Processing Module loaded successfully` :
        `PDF Text Extractor v${version} - Fleet Data Processing Module loaded successfully`;
    console.log(message);
}