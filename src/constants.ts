// Dice.com API and URL constants
export const DICE_BASE_URL = 'https://www.dice.com';
export const DICE_API_URL = 'https://job-search-api.svc.dhigroupinc.com/v1/dice/jobs/search';

// Default headers for API requests
export const DEFAULT_HEADERS = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Content-Type': 'application/json',
    'Origin': 'https://www.dice.com',
    'Referer': 'https://www.dice.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'x-api-key': 'DHIv3.0',
};

// Request configuration
export const REQUEST_CONFIG = {
    RETRY_COUNT: 3,
    REQUEST_TIMEOUT_SECS: 60,
    NAVIGATION_TIMEOUT_SECS: 60,
    PAGE_SIZE: 100, // Max jobs per API page
};

// Selectors for job detail page
export const SELECTORS = {
    // Job detail page selectors
    JOB_TITLE: 'h1[data-cy="jobTitle"]',
    COMPANY_NAME: 'a[data-cy="companyNameLink"], span[data-cy="companyName"]',
    LOCATION: 'li[data-cy="location"]',
    SALARY: 'li[data-cy="compensationText"]',
    JOB_TYPE: 'li[data-cy="employmentType"]',
    POSTED_DATE: 'li[data-cy="postedDate"]',
    DESCRIPTION: 'div[data-cy="jobDescription"]',
    SKILLS: 'div[data-cy="skillsList"] span, div.skill-badge',
    APPLY_BUTTON: 'a[data-cy="apply-button-wl"], button[data-cy="apply-button"]',
    COMPANY_LOGO: 'img[data-cy="company-logo"]',
    EASY_APPLY_BADGE: '[data-cy="easyApplyBadge"]',

    // Additional selectors
    WORKPLACE_TYPE: 'li[data-cy="workFromHome"]',
    EXPERIENCE_LEVEL: 'li[data-cy="experienceLevel"]',
    EDUCATION_LEVEL: 'li[data-cy="educationLevel"]',
    COMPANY_DESCRIPTION: 'div[data-cy="companyDescription"]',
    BENEFITS: 'div[data-cy="benefits"] li',

    // Search page selectors
    SEARCH_RESULTS: 'div[data-cy="search-results"] > div',
    JOB_CARD: 'div[data-cy="card"]',
    PAGINATION_NEXT: 'button[data-cy="pagination-next"]',
    TOTAL_JOBS: 'span[data-cy="totalJobs"]',
};

// Employment type mappings
export const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
    'FULLTIME': 'Full-time',
    'PARTTIME': 'Part-time',
    'CONTRACT': 'Contract',
    'THIRD_PARTY': 'Third Party',
};

// Posted date filter mappings (days)
export const POSTED_DATE_MAP: Record<string, number> = {
    'ONE': 1,
    'THREE': 3,
    'SEVEN': 7,
    'THIRTY': 30,
    'ANY': 0,
};

// Workplace type mappings
export const WORKPLACE_TYPE_MAP: Record<string, string> = {
    'Remote': 'REMOTE',
    'On-Site': 'ON_SITE',
    'Hybrid': 'HYBRID',
};
