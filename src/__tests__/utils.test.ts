import { describe, it, expect } from 'vitest';
import {
    cleanText,
    formatPostedDate,
    formatSalary,
    parseSalaryFromText,
    extractSkills,
    isValidUrl,
    extractJobIdFromUrl,
} from '../utils.js';

describe('cleanText', () => {
    it('should remove HTML entities', () => {
        expect(cleanText('Hello&nbsp;World')).toBe('Hello World');
        expect(cleanText('Tom &amp; Jerry')).toBe('Tom & Jerry');
    });

    it('should remove HTML tags', () => {
        expect(cleanText('<p>Hello</p>')).toBe('Hello');
        expect(cleanText('<div><span>Test</span></div>')).toBe('Test');
    });

    it('should normalize whitespace', () => {
        expect(cleanText('  Hello   World  ')).toBe('Hello World');
        expect(cleanText('Line1\n\n\nLine2')).toBe('Line1 Line2');
    });

    it('should handle empty strings', () => {
        expect(cleanText('')).toBe('');
        expect(cleanText('   ')).toBe('');
    });
});

describe('formatPostedDate', () => {
    it('should return "Today" for today', () => {
        const today = new Date().toISOString();
        expect(formatPostedDate(today)).toBe('Today');
    });

    it('should return "Unknown" for empty string', () => {
        expect(formatPostedDate('')).toBe('Unknown');
    });
});

describe('formatSalary', () => {
    it('should format salary range', () => {
        const result = formatSalary({
            minValue: 80000,
            maxValue: 120000,
            currency: 'USD',
            unitText: 'YEAR',
        });
        expect(result).toBe('$80,000 - $120,000/year');
    });

    it('should format single value', () => {
        const result = formatSalary({
            minValue: 50,
            currency: 'USD',
            unitText: 'HOUR',
        });
        expect(result).toBe('$50/hour');
    });

    it('should return undefined for empty estimate', () => {
        expect(formatSalary(undefined)).toBeUndefined();
        expect(formatSalary({})).toBeUndefined();
    });
});

describe('parseSalaryFromText', () => {
    it('should parse salary range', () => {
        const result = parseSalaryFromText('$80,000 - $120,000/year');
        expect(result).toEqual({
            min: 80000,
            max: 120000,
            currency: 'USD',
            period: 'year',
        });
    });

    it('should parse hourly rate', () => {
        const result = parseSalaryFromText('$50/hour');
        expect(result).toEqual({
            min: 50,
            max: 50,
            currency: 'USD',
            period: 'hour',
        });
    });

    it('should parse K notation', () => {
        const result = parseSalaryFromText('$80K - $120K');
        expect(result?.min).toBe(80000);
        expect(result?.max).toBe(120000);
    });

    it('should return null for invalid input', () => {
        expect(parseSalaryFromText('')).toBeNull();
        expect(parseSalaryFromText('Competitive')).toBeNull();
    });
});

describe('extractSkills', () => {
    it('should extract programming languages', () => {
        const text = 'We need Python, JavaScript, and Java developers';
        const skills = extractSkills(text);
        expect(skills).toContain('Python');
        expect(skills).toContain('JavaScript');
        expect(skills).toContain('Java');
    });

    it('should extract frameworks', () => {
        const text = 'Experience with React, Angular, and Node.js required';
        const skills = extractSkills(text);
        expect(skills).toContain('React');
        expect(skills).toContain('Angular');
        expect(skills).toContain('Node.js');
    });

    it('should extract cloud platforms', () => {
        const text = 'AWS, Azure, or GCP experience preferred';
        const skills = extractSkills(text);
        expect(skills).toContain('AWS');
        expect(skills).toContain('Azure');
        expect(skills).toContain('GCP');
    });
});

describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
        expect(isValidUrl('https://www.dice.com')).toBe(true);
        expect(isValidUrl('http://example.com/path')).toBe(true);
    });

    it('should reject invalid URLs', () => {
        expect(isValidUrl('not-a-url')).toBe(false);
        expect(isValidUrl('')).toBe(false);
    });
});

describe('extractJobIdFromUrl', () => {
    it('should extract job ID from Dice URL', () => {
        const url = 'https://www.dice.com/job-detail/abc123-def456-789';
        expect(extractJobIdFromUrl(url)).toBe('abc123-def456-789');
    });

    it('should return null for invalid URL', () => {
        expect(extractJobIdFromUrl('https://www.dice.com/jobs')).toBeNull();
        expect(extractJobIdFromUrl('')).toBeNull();
    });
});
