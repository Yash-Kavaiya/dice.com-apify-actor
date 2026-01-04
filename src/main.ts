/**
 * Dice.com Job Scraper - Apify Actor
 *
 * A production-level actor for scraping job listings from dice.com.
 * Supports search filtering, pagination, and full job detail extraction.
 */

import { Actor, log } from 'apify';
import {
    CheerioCrawler,
    Request,
    ProxyConfiguration,
    createRequestDebugInfo,
} from 'crawlee';
import { router, initRouter } from './routes.js';
import { InputSchema, type Input, type SearchParams, type RunStatistics } from './types.js';
import { DICE_API_URL, REQUEST_CONFIG, DEFAULT_HEADERS } from './constants.js';
import { buildSearchUrl } from './utils.js';

// Initialize the Apify Actor
await Actor.init();

// Track run statistics
const statistics: RunStatistics = {
    jobsFound: 0,
    jobsScraped: 0,
    jobsWithDetails: 0,
    errors: 0,
    startTime: new Date(),
};

try {
    // Get and validate input
    const rawInput = await Actor.getInput<Input>();
    const parseResult = InputSchema.safeParse(rawInput || {});

    if (!parseResult.success) {
        log.error('Invalid input configuration', { errors: parseResult.error.errors });
        throw new Error(`Invalid input: ${parseResult.error.message}`);
    }

    const input = parseResult.data;

    log.info('Starting Dice.com Job Scraper', {
        searchQuery: input.searchQuery,
        location: input.location,
        maxJobs: input.maxJobs,
        scrapeDetails: input.scrapeJobDetails,
    });

    // Initialize the router with input configuration
    initRouter(input);

    // Configure proxy if provided
    let proxyConfiguration: ProxyConfiguration | undefined;
    if (input.proxyConfiguration) {
        proxyConfiguration = await Actor.createProxyConfiguration(input.proxyConfiguration);
        log.info('Proxy configuration enabled');
    }

    // Create the crawler
    const crawler = new CheerioCrawler({
        proxyConfiguration,
        requestHandler: router,

        // Request configuration
        maxRequestRetries: REQUEST_CONFIG.RETRY_COUNT,
        requestHandlerTimeoutSecs: REQUEST_CONFIG.REQUEST_TIMEOUT_SECS,
        navigationTimeoutSecs: REQUEST_CONFIG.NAVIGATION_TIMEOUT_SECS,

        // Concurrency settings
        maxConcurrency: input.maxConcurrency,
        minConcurrency: 1,

        // Additional request options
        additionalMimeTypes: ['application/json'],

        // Pre-navigation hook for setting headers
        preNavigationHooks: [
            async ({ request }, gotOptions) => {
                // Set custom headers for API requests
                if (request.url.includes('job-search-api')) {
                    gotOptions.headers = {
                        ...gotOptions.headers,
                        ...DEFAULT_HEADERS,
                    };
                }

                // Set browser-like headers for web requests
                gotOptions.headers = {
                    ...gotOptions.headers,
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                };
            },
        ],

        // Failed request handler
        failedRequestHandler: async ({ request }, error) => {
            statistics.errors++;
            log.error(`Request failed: ${request.url}`, {
                error: error.message,
                ...createRequestDebugInfo(request),
            });
        },
    });

    // Build start requests
    const startRequests: Request[] = [];

    // Check for custom start URLs first
    if (input.startUrls && input.startUrls.length > 0) {
        log.info(`Using ${input.startUrls.length} custom start URLs`);

        for (const startUrl of input.startUrls) {
            const url = startUrl.url;

            // Determine the type of URL
            if (url.includes('/job-detail/')) {
                startRequests.push(new Request({
                    url,
                    label: 'JOB_DETAIL',
                    userData: {
                        label: 'JOB_DETAIL' as const,
                    },
                }));
            } else {
                startRequests.push(new Request({
                    url,
                    label: 'SEARCH',
                    userData: {
                        label: 'SEARCH' as const,
                        page: 1,
                    },
                }));
            }
        }
    } else {
        // Build search request using API
        const searchParams: SearchParams = {
            query: input.searchQuery || '',
            location: input.location || '',
            radius: input.radius || 30,
            employmentTypes: input.employmentTypes || [],
            postedDate: input.postedDate || 'ANY',
            workplaceTypes: input.workplaceTypes || [],
            easyApply: input.easyApply || false,
            page: 1,
            pageSize: REQUEST_CONFIG.PAGE_SIZE,
        };

        log.info('Building search request', { searchParams });

        // Use API-based search (more reliable)
        startRequests.push(new Request({
            url: `${DICE_API_URL}?page=1`,
            label: 'SEARCH_API',
            userData: {
                label: 'SEARCH_API' as const,
                page: 1,
                searchParams,
            },
            uniqueKey: 'search-page-1',
        }));

        // Also add HTML fallback search URL
        const htmlSearchUrl = buildSearchUrl(input, 1);
        startRequests.push(new Request({
            url: htmlSearchUrl,
            label: 'SEARCH',
            userData: {
                label: 'SEARCH' as const,
                page: 1,
            },
            uniqueKey: 'html-search-page-1',
        }));
    }

    log.info(`Starting crawler with ${startRequests.length} initial requests`);

    // Run the crawler
    await crawler.run(startRequests);

    // Update final statistics
    statistics.endTime = new Date();
    const duration = (statistics.endTime.getTime() - statistics.startTime.getTime()) / 1000;

    // Get dataset info for final count
    const dataset = await Actor.openDataset();
    const { itemCount } = await dataset.getInfo() || { itemCount: 0 };

    log.info('Scraping completed', {
        jobsScraped: itemCount,
        errors: statistics.errors,
        durationSeconds: duration.toFixed(2),
    });

    // Save run statistics to key-value store
    await Actor.setValue('RUN_STATISTICS', {
        ...statistics,
        jobsScraped: itemCount,
        durationSeconds: duration,
    });

} catch (error) {
    log.error('Actor failed with error', { error });
    throw error;
} finally {
    // Clean up
    await Actor.exit();
}
