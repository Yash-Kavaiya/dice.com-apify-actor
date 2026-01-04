# Dice.com Job Scraper

A production-level [Apify](https://apify.com) actor for scraping job listings from [Dice.com](https://www.dice.com), the leading tech job board.

## Features

- **Comprehensive Job Data**: Extracts job titles, companies, locations, salaries, descriptions, requirements, skills, and more
- **Advanced Filtering**: Filter by keywords, location, employment type, posted date, workplace type (remote/hybrid/on-site), and easy apply
- **High Performance**: Concurrent scraping with configurable parallelism
- **API-Based Scraping**: Uses Dice's search API for reliable and fast data extraction
- **Full Details Mode**: Optional deep scraping of individual job pages for complete job information
- **Proxy Support**: Built-in proxy configuration to avoid rate limiting
- **Production Ready**: Comprehensive error handling, logging, and retry mechanisms

## Input Configuration

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `searchQuery` | string | Job title, keywords, or company name | `""` |
| `location` | string | City, state, or zip code | `""` |
| `radius` | integer | Search radius in miles (0-500) | `30` |
| `employmentTypes` | array | Filter by type: `FULLTIME`, `PARTTIME`, `CONTRACT`, `THIRD_PARTY` | `[]` |
| `postedDate` | string | Posted within: `ONE`, `THREE`, `SEVEN`, `THIRTY`, `ANY` | `ANY` |
| `workplaceTypes` | array | Workplace type: `Remote`, `On-Site`, `Hybrid` | `[]` |
| `easyApply` | boolean | Only show Easy Apply jobs | `false` |
| `maxJobs` | integer | Maximum jobs to scrape (0 = unlimited) | `100` |
| `maxConcurrency` | integer | Parallel requests (1-50) | `10` |
| `scrapeJobDetails` | boolean | Visit each job page for full details | `true` |
| `proxyConfiguration` | object | Proxy settings | `undefined` |
| `startUrls` | array | Custom start URLs (overrides search) | `[]` |

## Example Input

```json
{
    "searchQuery": "Software Engineer",
    "location": "San Francisco, CA",
    "radius": 50,
    "employmentTypes": ["FULLTIME"],
    "postedDate": "SEVEN",
    "workplaceTypes": ["Remote", "Hybrid"],
    "easyApply": false,
    "maxJobs": 500,
    "maxConcurrency": 10,
    "scrapeJobDetails": true,
    "proxyConfiguration": {
        "useApifyProxy": true
    }
}
```

## Output Data

Each job listing includes the following fields:

```json
{
    "id": "abc123-def456",
    "title": "Senior Software Engineer",
    "company": "Tech Company Inc.",
    "companyId": "12345",
    "location": "San Francisco, CA",
    "salary": "$150,000 - $200,000/year",
    "salaryMin": 150000,
    "salaryMax": 200000,
    "salaryCurrency": "USD",
    "salaryPeriod": "year",
    "jobType": "Full-time",
    "employmentType": "FULLTIME",
    "workplaceType": "Remote",
    "postedDate": "2 days ago",
    "postedDateTimestamp": 1704067200000,
    "url": "https://www.dice.com/job-detail/abc123",
    "easyApply": true,
    "summary": "We are looking for a Senior Software Engineer...",
    "description": "Full job description text...",
    "descriptionHtml": "<div>HTML formatted description...</div>",
    "skills": ["Python", "JavaScript", "AWS", "Docker"],
    "experienceLevel": "5+ years experience",
    "educationLevel": "Bachelor's degree",
    "benefits": ["Health Insurance", "401k", "Remote Work"],
    "companyDescription": "About the company...",
    "companyLogo": "https://...",
    "applicationUrl": "https://...",
    "scrapedAt": "2024-01-15T12:00:00.000Z"
}
```

## Usage

### Run on Apify Platform

1. Go to [Apify Console](https://console.apify.com/actors)
2. Create a new actor or use this actor from the store
3. Configure the input parameters
4. Run the actor and download results

### Run Locally

```bash
# Clone the repository
git clone https://github.com/your-username/dice-job-scraper.git
cd dice-job-scraper

# Install dependencies
npm install

# Build the project
npm run build

# Create input file
echo '{"searchQuery": "Python Developer", "maxJobs": 10}' > ./apify_storage/key_value_stores/default/INPUT.json

# Run the actor
npm start
```

### Run with Apify CLI

```bash
# Install Apify CLI
npm install -g apify-cli

# Run locally
apify run -p

# Push to Apify
apify push
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run type checking
npm run typecheck

# Run linting
npm run lint

# Run tests
npm test

# Format code
npm run format
```

## Project Structure

```
dice-job-scraper/
├── .actor/
│   ├── actor.json        # Actor configuration
│   ├── Dockerfile        # Docker configuration
│   └── input_schema.json # Input schema definition
├── src/
│   ├── main.ts          # Entry point
│   ├── routes.ts        # Request handlers
│   ├── types.ts         # TypeScript types
│   ├── utils.ts         # Utility functions
│   └── constants.ts     # Constants and config
├── package.json
├── tsconfig.json
└── README.md
```

## Cost Estimation

Running costs depend on your configuration:

| Configuration | Estimated Cost (per 1000 jobs) |
|--------------|-------------------------------|
| Basic (no details) | ~$0.10 |
| With job details | ~$0.50 |
| With proxy | ~$1.00 |

## Rate Limits & Best Practices

- Use proxies for large scraping jobs to avoid IP blocking
- Set reasonable `maxConcurrency` (5-15 recommended)
- Consider scraping during off-peak hours
- Enable `scrapeJobDetails: false` for faster initial scans

## Troubleshooting

### Common Issues

**Empty Results**: Ensure your search query matches Dice.com format and the location is valid.

**Blocked Requests**: Enable proxy configuration and reduce concurrency.

**Timeout Errors**: Increase timeout values in the configuration or reduce concurrency.

### Logs

Check actor logs for detailed information about:
- Number of jobs found
- Errors encountered
- Pages processed

## License

ISC License - see [LICENSE](LICENSE) for details.

## Support

- [Report Issues](https://github.com/your-username/dice-job-scraper/issues)
- [Apify Documentation](https://docs.apify.com)
- [Crawlee Documentation](https://crawlee.dev)
