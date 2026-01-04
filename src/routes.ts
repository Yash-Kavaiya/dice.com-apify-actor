import { createCheerioRouter, log, Dataset, Request } from 'crawlee';
import type { CheerioAPI } from 'cheerio';
import type {
    Input,
    RequestUserData,
    JobListingBasic,
    JobListingFull,
    DiceSearchResponse,
    SearchParams,
} from './types.js';
import {
    DICE_API_URL,
    DEFAULT_HEADERS,
    SELECTORS,
    REQUEST_CONFIG,
} from './constants.js';
import {
    buildSearchApiUrl,
    parseJobFromApi,
    cleanText,
    extractSkills,
    parseSalaryFromText,
    extractJobIdFromUrl,
} from './utils.js';

// Create the router instance
export const router = createCheerioRouter();

// State management
let jobsScraped = 0;
let maxJobs = 100;
let scrapeJobDetails = true;

/**
 * Initialize router configuration
 */
export function initRouter(input: Input): void {
    maxJobs = input.maxJobs || 100;
    scrapeJobDetails = input.scrapeJobDetails ?? true;
    jobsScraped = 0;
}

/**
 * Check if we should continue scraping
 */
function shouldContinue(): boolean {
    return maxJobs === 0 || jobsScraped < maxJobs;
}

/**
 * Handle API search requests
 */
router.addHandler<RequestUserData>('SEARCH_API', async ({ request, sendRequest, crawler }) => {
    const userData = request.userData;
    const searchParams = userData.searchParams!;

    log.info(`Processing API search page ${searchParams.page}`, { url: request.url });

    if (!shouldContinue()) {
        log.info('Max jobs limit reached, stopping');
        return;
    }

    try {
        const queryString = buildSearchApiUrl(searchParams);
        const apiUrl = `${DICE_API_URL}?${queryString}`;

        const response = await sendRequest({
            url: apiUrl,
            method: 'GET',
            headers: DEFAULT_HEADERS,
            responseType: 'json',
        });

        const data = response.body as DiceSearchResponse;

        if (!data || !data.data) {
            log.warning('No data received from API', { url: apiUrl });
            return;
        }

        const jobs = data.data;
        const totalJobs = data.meta?.totalJobs || 0;
        const totalPages = data.meta?.totalPages || 1;

        log.info(`Found ${totalJobs} total jobs, processing page ${searchParams.page}/${totalPages}`, {
            jobsOnPage: jobs.length,
        });

        // Process each job
        const jobsToProcess: JobListingBasic[] = [];

        for (const job of jobs) {
            if (!shouldContinue()) break;

            const parsedJob = parseJobFromApi(job);
            jobsToProcess.push(parsedJob);
            jobsScraped++;
        }

        // If we need to scrape details, add requests for each job
        if (scrapeJobDetails && jobsToProcess.length > 0) {
            const detailRequests = jobsToProcess.map(job => new Request({
                url: job.url,
                label: 'JOB_DETAIL',
                userData: {
                    label: 'JOB_DETAIL' as const,
                    jobBasic: job,
                },
            }));

            await crawler.addRequests(detailRequests);
            log.info(`Added ${detailRequests.length} job detail requests`);
        } else {
            // Save basic job data directly
            for (const job of jobsToProcess) {
                await Dataset.pushData({
                    ...job,
                    scrapedAt: new Date().toISOString(),
                });
            }
            log.info(`Saved ${jobsToProcess.length} jobs without details`);
        }

        // Add next page request if there are more jobs
        if (shouldContinue() && searchParams.page < totalPages) {
            const nextPage = searchParams.page + 1;
            const nextPageParams: SearchParams = {
                ...searchParams,
                page: nextPage,
            };

            await crawler.addRequests([new Request({
                url: `${DICE_API_URL}?page=${nextPage}`,
                label: 'SEARCH_API',
                userData: {
                    label: 'SEARCH_API' as const,
                    page: nextPage,
                    searchParams: nextPageParams,
                },
                uniqueKey: `search-page-${nextPage}`,
            })]);

            log.info(`Added request for page ${nextPage}`);
        }
    } catch (error) {
        log.error('Error fetching search results from API', { error });
        throw error;
    }
});

/**
 * Handle HTML search page (fallback)
 */
router.addHandler<RequestUserData>('SEARCH', async ({ request, $, crawler }) => {
    const userData = request.userData;
    const page = userData.page || 1;

    log.info(`Processing HTML search page ${page}`, { url: request.url });

    if (!shouldContinue()) {
        log.info('Max jobs limit reached, stopping');
        return;
    }

    // Extract job cards from search results
    const jobCards = $('div[data-cy="card"], div.card-job');

    if (jobCards.length === 0) {
        log.warning('No job cards found on page', { url: request.url });
        return;
    }

    log.info(`Found ${jobCards.length} job cards on page ${page}`);

    const jobsToProcess: JobListingBasic[] = [];

    jobCards.each((_index, element) => {
        if (!shouldContinue()) return false;

        const $card = $(element);

        const title = cleanText($card.find('a[data-cy="card-title-link"]').text());
        const company = cleanText($card.find('a[data-cy="card-company-link"]').text());
        const location = cleanText($card.find('span[data-cy="card-location"]').text());
        const salary = cleanText($card.find('span[data-cy="card-salary"]').text());
        const postedDate = cleanText($card.find('span[data-cy="card-posted-date"]').text());
        const jobUrl = $card.find('a[data-cy="card-title-link"]').attr('href') || '';

        const fullUrl = jobUrl.startsWith('http') ? jobUrl : `https://www.dice.com${jobUrl}`;
        const jobId = extractJobIdFromUrl(fullUrl) || `job-${Date.now()}-${_index}`;

        const job: JobListingBasic = {
            id: jobId,
            title,
            company,
            location,
            salary: salary || undefined,
            postedDate,
            url: fullUrl,
            easyApply: $card.find('[data-cy="easyApplyBadge"]').length > 0,
        };

        jobsToProcess.push(job);
        jobsScraped++;
    });

    // Process jobs
    if (scrapeJobDetails && jobsToProcess.length > 0) {
        const detailRequests = jobsToProcess.map(job => new Request({
            url: job.url,
            label: 'JOB_DETAIL',
            userData: {
                label: 'JOB_DETAIL' as const,
                jobBasic: job,
            },
        }));

        await crawler.addRequests(detailRequests);
    } else {
        for (const job of jobsToProcess) {
            await Dataset.pushData({
                ...job,
                scrapedAt: new Date().toISOString(),
            });
        }
    }

    // Check for next page
    const nextButton = $('button[data-cy="pagination-next"]:not([disabled])');
    if (shouldContinue() && nextButton.length > 0) {
        const nextPage = page + 1;
        const nextUrl = new URL(request.url);
        nextUrl.searchParams.set('page', nextPage.toString());

        await crawler.addRequests([new Request({
            url: nextUrl.toString(),
            label: 'SEARCH',
            userData: {
                label: 'SEARCH' as const,
                page: nextPage,
            },
        })]);
    }
});

/**
 * Handle job detail page requests
 */
router.addHandler<RequestUserData>('JOB_DETAIL', async ({ request, $, response }) => {
    const userData = request.userData;
    const jobBasic = userData.jobBasic;

    log.info(`Processing job detail: ${jobBasic?.title || 'Unknown'}`, { url: request.url });

    try {
        // Try to extract job details from the page
        const jobDetail = extractJobDetails($, jobBasic, request.url);

        // Save the job data
        await Dataset.pushData(jobDetail);

        log.debug(`Saved job: ${jobDetail.title}`, { id: jobDetail.id });
    } catch (error) {
        log.error(`Error processing job detail: ${request.url}`, { error });

        // Save basic data if detail extraction fails
        if (jobBasic) {
            await Dataset.pushData({
                ...jobBasic,
                scrapedAt: new Date().toISOString(),
                error: 'Failed to extract full details',
            });
        }
    }
});

/**
 * Default handler for unmatched requests
 */
router.addDefaultHandler(async ({ request }) => {
    log.warning(`Unhandled request: ${request.url}`);
});

/**
 * Extract full job details from detail page
 */
function extractJobDetails(
    $: CheerioAPI,
    jobBasic: JobListingBasic | undefined,
    url: string
): JobListingFull {
    // Extract title
    const title = cleanText($(SELECTORS.JOB_TITLE).text()) ||
        cleanText($('h1').first().text()) ||
        jobBasic?.title ||
        'Unknown Title';

    // Extract company
    const company = cleanText($(SELECTORS.COMPANY_NAME).text()) ||
        jobBasic?.company ||
        'Unknown Company';

    // Extract location
    const location = cleanText($(SELECTORS.LOCATION).text()) ||
        cleanText($('li:contains("Location")').text().replace('Location', '')) ||
        jobBasic?.location ||
        'Unknown Location';

    // Extract salary
    let salary = cleanText($(SELECTORS.SALARY).text()) || jobBasic?.salary;
    const salaryData = parseSalaryFromText(salary || '');

    // Extract job type and employment type
    const jobType = cleanText($(SELECTORS.JOB_TYPE).text()) ||
        jobBasic?.jobType;

    const workplaceType = cleanText($(SELECTORS.WORKPLACE_TYPE).text()) ||
        jobBasic?.workplaceType;

    // Extract posted date
    const postedDate = cleanText($(SELECTORS.POSTED_DATE).text().replace('Posted', '').trim()) ||
        jobBasic?.postedDate ||
        'Unknown';

    // Extract description
    const descriptionElement = $(SELECTORS.DESCRIPTION);
    const descriptionHtml = descriptionElement.html() || '';
    const description = cleanText(descriptionElement.text());

    // Extract skills
    const skillElements = $(SELECTORS.SKILLS);
    const skills: string[] = [];
    skillElements.each((_i, el) => {
        const skill = cleanText($(el).text());
        if (skill && !skills.includes(skill)) {
            skills.push(skill);
        }
    });

    // Also extract skills from description
    const extractedSkills = extractSkills(description);
    extractedSkills.forEach(skill => {
        if (!skills.includes(skill)) {
            skills.push(skill);
        }
    });

    // Extract experience level
    const experienceLevel = cleanText($(SELECTORS.EXPERIENCE_LEVEL).text()) ||
        extractExperienceLevel(description);

    // Extract education level
    const educationLevel = cleanText($(SELECTORS.EDUCATION_LEVEL).text()) ||
        extractEducationLevel(description);

    // Extract benefits
    const benefits: string[] = [];
    $(SELECTORS.BENEFITS).each((_i, el) => {
        const benefit = cleanText($(el).text());
        if (benefit) benefits.push(benefit);
    });

    // Extract company description
    const companyDescription = cleanText($(SELECTORS.COMPANY_DESCRIPTION).text());

    // Extract company logo
    const companyLogo = $(SELECTORS.COMPANY_LOGO).attr('src') || undefined;

    // Check for easy apply
    const easyApply = $(SELECTORS.EASY_APPLY_BADGE).length > 0 || jobBasic?.easyApply;

    // Extract application URL
    const applyButton = $(SELECTORS.APPLY_BUTTON);
    const applicationUrl = applyButton.attr('href') || undefined;

    // Build the full job listing
    const jobDetail: JobListingFull = {
        id: jobBasic?.id || extractJobIdFromUrl(url) || `job-${Date.now()}`,
        title,
        company,
        companyId: jobBasic?.companyId,
        location,
        salary,
        salaryMin: salaryData?.min || jobBasic?.salaryMin,
        salaryMax: salaryData?.max || jobBasic?.salaryMax,
        salaryCurrency: salaryData?.currency || jobBasic?.salaryCurrency || 'USD',
        salaryPeriod: salaryData?.period || jobBasic?.salaryPeriod,
        jobType,
        employmentType: jobBasic?.employmentType,
        workplaceType,
        postedDate,
        postedDateTimestamp: jobBasic?.postedDateTimestamp,
        url,
        easyApply,
        summary: jobBasic?.summary,
        description,
        descriptionHtml: descriptionHtml.length < 50000 ? descriptionHtml : undefined,
        skills: skills.length > 0 ? skills : undefined,
        experienceLevel: experienceLevel || undefined,
        educationLevel: educationLevel || undefined,
        benefits: benefits.length > 0 ? benefits : undefined,
        companyDescription: companyDescription || undefined,
        companyLogo,
        applicationUrl,
        scrapedAt: new Date().toISOString(),
    };

    return jobDetail;
}

/**
 * Extract experience level from text
 */
function extractExperienceLevel(text: string): string | null {
    const patterns = [
        /(\d+\+?\s*(?:years?|yrs?)(?:\s+of)?\s+experience)/i,
        /(entry[\s-]?level|junior|mid[\s-]?level|senior|lead|principal|staff)/i,
        /(associate|intern|executive|director|manager)/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[1];
    }

    return null;
}

/**
 * Extract education level from text
 */
function extractEducationLevel(text: string): string | null {
    const patterns = [
        /(bachelor'?s?|master'?s?|ph\.?d\.?|doctorate|associate'?s?)\s*(degree)?/i,
        /(high school|ged|diploma)/i,
        /(bs|ba|ms|ma|mba|phd)\s+(?:in|degree)/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[0];
    }

    return null;
}
