import { z } from 'zod';

// Input schema validation
export const InputSchema = z.object({
    searchQuery: z.string().optional().default(''),
    location: z.string().optional().default(''),
    radius: z.number().min(0).max(500).optional().default(30),
    employmentTypes: z.array(z.enum(['FULLTIME', 'PARTTIME', 'CONTRACT', 'THIRD_PARTY'])).optional().default([]),
    postedDate: z.enum(['ONE', 'THREE', 'SEVEN', 'THIRTY', 'ANY']).optional().default('ANY'),
    workplaceTypes: z.array(z.enum(['Remote', 'On-Site', 'Hybrid'])).optional().default([]),
    easyApply: z.boolean().optional().default(false),
    maxJobs: z.number().min(0).max(10000).optional().default(100),
    maxConcurrency: z.number().min(1).max(50).optional().default(10),
    scrapeJobDetails: z.boolean().optional().default(true),
    proxyConfiguration: z.object({
        useApifyProxy: z.boolean().optional(),
        apifyProxyGroups: z.array(z.string()).optional(),
        proxyUrls: z.array(z.string()).optional(),
    }).optional(),
    startUrls: z.array(z.object({
        url: z.string().url(),
    })).optional().default([]),
});

export type Input = z.infer<typeof InputSchema>;

// Job listing from search results
export interface JobListingBasic {
    id: string;
    title: string;
    company: string;
    companyId?: string;
    location: string;
    salary?: string;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;
    salaryPeriod?: string;
    jobType?: string;
    employmentType?: string;
    workplaceType?: string;
    postedDate: string;
    postedDateTimestamp?: number;
    url: string;
    easyApply?: boolean;
    summary?: string;
}

// Full job details from detail page
export interface JobListingFull extends JobListingBasic {
    description?: string;
    descriptionHtml?: string;
    requirements?: string[];
    skills?: string[];
    benefits?: string[];
    experienceLevel?: string;
    educationLevel?: string;
    industry?: string;
    companyDescription?: string;
    companyWebsite?: string;
    companySize?: string;
    companyLogo?: string;
    applicationUrl?: string;
    contactEmail?: string;
    isSponsored?: boolean;
    scrapedAt: string;
}

// API response types
export interface DiceSearchResponse {
    data: DiceSearchJob[];
    meta: {
        totalJobs: number;
        page: number;
        pageSize: number;
        currentPage: number;
        totalPages: number;
    };
}

export interface DiceSearchJob {
    id: string;
    title: string;
    companyName: string;
    companyId?: string;
    companyPageUrl?: string;
    companyLogoUrl?: string;
    summary?: string;
    jobLocation: {
        displayName: string;
        city?: string;
        state?: string;
        country?: string;
        postalCode?: string;
    };
    salary?: string;
    salaryEstimate?: {
        minValue?: number;
        maxValue?: number;
        currency?: string;
        unitText?: string;
    };
    employmentType?: string;
    workFromHomeAvailability?: string;
    postedDate: string;
    modifiedDate?: string;
    detailsPageUrl: string;
    easyApply?: boolean;
    isRemote?: boolean;
    guid?: string;
}

// Request labels
export type RequestLabel = 'SEARCH' | 'SEARCH_API' | 'JOB_DETAIL';

// Request user data
export interface RequestUserData {
    label: RequestLabel;
    page?: number;
    searchParams?: SearchParams;
    jobBasic?: JobListingBasic;
}

// Search parameters for API
export interface SearchParams {
    query: string;
    location: string;
    radius: number;
    employmentTypes: string[];
    postedDate: string;
    workplaceTypes: string[];
    easyApply: boolean;
    page: number;
    pageSize: number;
}

// Statistics for the run
export interface RunStatistics {
    jobsFound: number;
    jobsScraped: number;
    jobsWithDetails: number;
    errors: number;
    startTime: Date;
    endTime?: Date;
}
