import { log } from 'crawlee';
import type { Input, JobListingBasic, DiceSearchJob, SearchParams } from './types.js';
import { DICE_BASE_URL, POSTED_DATE_MAP, WORKPLACE_TYPE_MAP } from './constants.js';

/**
 * Build the search URL for Dice.com API
 */
export function buildSearchApiUrl(params: SearchParams): string {
    const urlParams = new URLSearchParams();

    if (params.query) {
        urlParams.set('q', params.query);
    }

    if (params.location) {
        urlParams.set('location', params.location);
        urlParams.set('latitude', '');
        urlParams.set('longitude', '');
        urlParams.set('countryCode2', 'US');
    }

    if (params.radius > 0) {
        urlParams.set('radius', params.radius.toString());
    }

    if (params.employmentTypes.length > 0) {
        urlParams.set('employmentType', params.employmentTypes.join(','));
    }

    if (params.postedDate && params.postedDate !== 'ANY') {
        const days = POSTED_DATE_MAP[params.postedDate] || 0;
        if (days > 0) {
            urlParams.set('postedDate', days.toString());
        }
    }

    if (params.workplaceTypes.length > 0) {
        const mappedTypes = params.workplaceTypes
            .map(t => WORKPLACE_TYPE_MAP[t])
            .filter(Boolean);
        if (mappedTypes.length > 0) {
            urlParams.set('workplaceTypes', mappedTypes.join(','));
        }
    }

    if (params.easyApply) {
        urlParams.set('easyApply', 'true');
    }

    urlParams.set('page', params.page.toString());
    urlParams.set('pageSize', params.pageSize.toString());
    urlParams.set('filters.isRemote', 'true');
    urlParams.set('language', 'en');

    return `${urlParams.toString()}`;
}

/**
 * Build the search URL for Dice.com website
 */
export function buildSearchUrl(input: Input, page: number = 1): string {
    const params = new URLSearchParams();

    if (input.searchQuery) {
        params.set('q', input.searchQuery);
    }

    if (input.location) {
        params.set('location', input.location);
    }

    if (input.radius > 0) {
        params.set('radius', input.radius.toString());
    }

    if (input.employmentTypes && input.employmentTypes.length > 0) {
        input.employmentTypes.forEach(type => {
            params.append('filters.employmentType', type);
        });
    }

    if (input.postedDate && input.postedDate !== 'ANY') {
        params.set('filters.postedDate', input.postedDate);
    }

    if (input.workplaceTypes && input.workplaceTypes.length > 0) {
        input.workplaceTypes.forEach(type => {
            params.append('filters.workplaceTypes', type);
        });
    }

    if (input.easyApply) {
        params.set('filters.easyApply', 'true');
    }

    params.set('page', page.toString());
    params.set('pageSize', '100');

    return `${DICE_BASE_URL}/jobs?${params.toString()}`;
}

/**
 * Parse job data from Dice API response
 */
export function parseJobFromApi(job: DiceSearchJob): JobListingBasic {
    const jobUrl = job.detailsPageUrl?.startsWith('http')
        ? job.detailsPageUrl
        : `${DICE_BASE_URL}${job.detailsPageUrl}`;

    return {
        id: job.id || job.guid || '',
        title: cleanText(job.title || ''),
        company: cleanText(job.companyName || ''),
        companyId: job.companyId,
        location: cleanText(job.jobLocation?.displayName || ''),
        salary: job.salary || formatSalary(job.salaryEstimate),
        salaryMin: job.salaryEstimate?.minValue,
        salaryMax: job.salaryEstimate?.maxValue,
        salaryCurrency: job.salaryEstimate?.currency,
        salaryPeriod: job.salaryEstimate?.unitText,
        employmentType: job.employmentType,
        workplaceType: job.workFromHomeAvailability || (job.isRemote ? 'Remote' : undefined),
        postedDate: formatPostedDate(job.postedDate),
        postedDateTimestamp: job.postedDate ? new Date(job.postedDate).getTime() : undefined,
        url: jobUrl,
        easyApply: job.easyApply,
        summary: cleanText(job.summary || ''),
    };
}

/**
 * Format salary from estimate object
 */
export function formatSalary(estimate?: { minValue?: number; maxValue?: number; currency?: string; unitText?: string }): string | undefined {
    if (!estimate || (!estimate.minValue && !estimate.maxValue)) {
        return undefined;
    }

    const currency = estimate.currency || 'USD';
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    });

    const min = estimate.minValue ? formatter.format(estimate.minValue) : null;
    const max = estimate.maxValue ? formatter.format(estimate.maxValue) : null;
    const period = estimate.unitText ? `/${estimate.unitText.toLowerCase()}` : '';

    if (min && max) {
        return `${min} - ${max}${period}`;
    }
    return `${min || max}${period}`;
}

/**
 * Format posted date to human-readable format
 */
export function formatPostedDate(dateString: string): string {
    if (!dateString) return 'Unknown';

    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        }
    } catch {
        return dateString;
    }
}

/**
 * Clean text by removing extra whitespace and HTML entities
 */
export function cleanText(text: string): string {
    if (!text) return '';

    return text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Extract skills from text
 */
export function extractSkills(text: string): string[] {
    // Common tech skills pattern
    const skillPatterns = [
        /\b(JavaScript|TypeScript|Python|Java|C\+\+|C#|Ruby|Go|Rust|Swift|Kotlin|PHP|Scala|R)\b/gi,
        /\b(React|Angular|Vue|Node\.js|Express|Django|Flask|Spring|Rails|Laravel)\b/gi,
        /\b(AWS|Azure|GCP|Docker|Kubernetes|Jenkins|Git|CI\/CD|DevOps)\b/gi,
        /\b(SQL|MySQL|PostgreSQL|MongoDB|Redis|Elasticsearch|GraphQL|REST|API)\b/gi,
        /\b(Machine Learning|ML|AI|Data Science|Deep Learning|NLP|TensorFlow|PyTorch)\b/gi,
        /\b(Agile|Scrum|Jira|Confluence|Slack|Teams)\b/gi,
    ];

    const skills = new Set<string>();

    for (const pattern of skillPatterns) {
        const matches = text.match(pattern);
        if (matches) {
            matches.forEach(skill => skills.add(skill));
        }
    }

    return Array.from(skills);
}

/**
 * Parse salary range from text
 */
export function parseSalaryFromText(text: string): { min?: number; max?: number; currency?: string; period?: string } | null {
    if (!text) return null;

    // Match patterns like "$80,000 - $120,000", "$50/hour", "$100K - $150K"
    const rangeMatch = text.match(/\$?([\d,]+(?:\.?\d{0,2})?)\s*[kK]?\s*[-–to]+\s*\$?([\d,]+(?:\.?\d{0,2})?)\s*[kK]?/);
    const singleMatch = text.match(/\$?([\d,]+(?:\.?\d{0,2})?)\s*[kK]?/);
    const periodMatch = text.match(/\/(hour|hr|year|yr|month|mo|week|wk|day)/i);

    const parseValue = (val: string): number => {
        const cleaned = val.replace(/,/g, '');
        let num = parseFloat(cleaned);
        if (val.toLowerCase().includes('k') || (num < 1000 && !periodMatch)) {
            num *= 1000;
        }
        return num;
    };

    if (rangeMatch) {
        return {
            min: parseValue(rangeMatch[1]),
            max: parseValue(rangeMatch[2]),
            currency: 'USD',
            period: periodMatch ? periodMatch[1].toLowerCase() : 'year',
        };
    }

    if (singleMatch) {
        const value = parseValue(singleMatch[1]);
        return {
            min: value,
            max: value,
            currency: 'USD',
            period: periodMatch ? periodMatch[1].toLowerCase() : 'year',
        };
    }

    return null;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelayMs: number = 1000
): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            log.warning(`Attempt ${attempt + 1}/${maxRetries} failed: ${lastError.message}`);

            if (attempt < maxRetries - 1) {
                const delay = initialDelayMs * Math.pow(2, attempt);
                await sleep(delay);
            }
        }
    }

    throw lastError;
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Extract job ID from Dice URL
 */
export function extractJobIdFromUrl(url: string): string | null {
    const match = url.match(/\/job-detail\/([a-f0-9-]+)/i);
    return match ? match[1] : null;
}

/**
 * Rate limiter class
 */
export class RateLimiter {
    private tokens: number;
    private lastRefill: number;
    private readonly maxTokens: number;
    private readonly refillRate: number; // tokens per second

    constructor(maxTokens: number = 10, refillRate: number = 2) {
        this.maxTokens = maxTokens;
        this.tokens = maxTokens;
        this.refillRate = refillRate;
        this.lastRefill = Date.now();
    }

    async acquire(): Promise<void> {
        this.refill();

        if (this.tokens < 1) {
            const waitTime = (1 / this.refillRate) * 1000;
            await sleep(waitTime);
            this.refill();
        }

        this.tokens -= 1;
    }

    private refill(): void {
        const now = Date.now();
        const elapsed = (now - this.lastRefill) / 1000;
        const tokensToAdd = elapsed * this.refillRate;

        this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
        this.lastRefill = now;
    }
}
