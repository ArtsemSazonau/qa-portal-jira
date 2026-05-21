# QA Portal Jira Sync

## Overview

A Playwright-based test automation tool that synchronizes QA defect and quality tracking data between **Jira** and a **QA Portal (Quality Tracker)** application. This project automates the process of retrieving bug data from Jira and syncing it with a quality tracking platform using the Page Object Model pattern and API client integration.

## What It Does

- **Jira Integration**: Authenticates with Jira, retrieves filtered bug lists using JQL queries, and fetches issue details via REST API
- **QA Portal Automation**: Logs into the QA Portal web application and updates quality metrics (bug counts by priority/severity)
- **Data Synchronization**: Maps Jira issue priorities to QA Portal quality levels (Blocker, Critical, Major, Minor, Trivial)
- **Multi-Platform Support**: Supports different platform mappings for organizing bug data across various projects

## Technology Stack

- **Playwright**: E2E test framework and browser automation
- **TypeScript**: Type-safe test automation code
- **Axios**: HTTP client for Jira REST API integration
- **dotenv**: Environment variable configuration management

## Project Architecture

```
qa-portal-jira-sync/
├── helpers/                          # Utility classes
│   └── jiraClient.ts                # Jira API client wrapper
├── page_objects/                     # UI automation page objects
│   └── QAPortalQualityTracker.ts    # QA Portal page object (selectors & methods)
├── data/                             # Data models & mappings
│   ├── jiraData.ts                   # Jira configuration (filter IDs, etc.)
│   ├── platformMapping.ts            # Maps Jira projects to platform codes
│   └── priorityMapping.ts            # Maps Jira priorities to QA severity levels
├── tests/                            # Test specs
│   └── sync-jira-qa-portal.spec.ts  # Main sync test (serial execution)
├── playwright.config.ts              # Playwright configuration
├── package.json                      # Dependencies & project metadata
└── .env                              # Environment variables (not committed)
```

### Key Components

- **JiraClient**: Handles all Jira API communication (authentication via Basic Auth with email + API token)
- **QAPortalQualityTracker**: Page Object encapsulating QA Portal UI selectors and interaction methods
- **Data Layer**: Maps between Jira and QA Portal domain models (priority levels, platforms)
- **Test Specs**: Serial test execution (not parallel) for coordinated data sync operations

## Installation

### Prerequisites

- **Node.js** 16+ and **npm**
- **Jira** cloud/server instance with API token access
- **QA Portal** application (web-based quality tracker)

### Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd qa-portal-jira-sync
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   Create a `.env` file in the root directory:
   ```env
   JIRA_BASE_URL=https://your-jira-instance.atlassian.net
   JIRA_EMAIL=your-email@example.com
   JIRA_API_TOKEN=your-jira-api-token
   JIRA_USERNAME=your-jira-username
   
   QA_PORTAL_URL=https://your-qa-portal.com
   QA_PORTAL_USERNAME=your-portal-username
   QA_PORTAL_PASSWORD=your-portal-password
   ```

4. **Configure data mappings**
   - Modify `data/jiraData.ts` to set your Jira filter IDs
   - Update `data/platformMapping.ts` for your project platform codes
   - Configure `data/priorityMapping.ts` if priority levels differ

## Execution

### Run All Tests
```bash
npm test
```
or
```bash
npx playwright test
```

### Run Specific Test File
```bash
npx playwright test tests/sync-jira-qa-portal.spec.ts
```

### Run in Headed Mode (See Browser)
```bash
npx playwright test --headed
```

### Run with Debug Mode
```bash
npx playwright test --debug
```

### View Test Report
```bash
npx playwright show-report
```

## Test Flow

The main test (`sync-jira-qa-portal.spec.ts`) executes the following steps in **serial order**:

1. **Authenticate in Jira** → Verifies Jira credentials and retrieves user info
2. **Retrieve JQL Filter** → Fetches the Jira filter to get bug query
3. **Query Bugs from Jira** → Executes JQL query to get all matching issues
4. **Login to QA Portal** → Navigates to portal and authenticates
5. **Update Quality Metrics** → Maps Jira bugs to portal severity levels and updates counts
6. **Verify Sync** → Validates that all data was synced correctly
7. **Logout** → Cleans up and logs out from QA Portal

## Configuration

### Playwright Config (`playwright.config.ts`)
- **Test Directory**: `./tests`
- **Timeout**: 25 seconds per test
- **Expect Timeout**: 10 seconds
- **Serial Execution**: Tests run sequentially (not in parallel)
- **Parallel Files**: Disabled for this project

### Environment Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `JIRA_BASE_URL` | Jira instance URL | `https://mycompany.atlassian.net` |
| `JIRA_EMAIL` | Email for Jira API auth | `dev@mycompany.com` |
| `JIRA_API_TOKEN` | Jira API token | `atatt7xxxx...` |
| `QA_PORTAL_URL` | QA Portal base URL | `https://qa-tracker.mysite.com` |
| `QA_PORTAL_USERNAME` | Portal login username | `my-username` |
| `QA_PORTAL_PASSWORD` | Portal login password | `secure-password` |

## Troubleshooting

### Common Issues

- **401 Unauthorized on Jira**: Verify `JIRA_API_TOKEN` and `JIRA_EMAIL` are correct
- **Portal Login Fails**: Check selector names in `QAPortalQualityTracker` match current UI
- **Tests Timeout**: Increase timeout values in `playwright.config.ts`
- **Environment Variables Not Loaded**: Ensure `.env` file exists in root directory

### Debugging

Enable Playwright Inspector:
```bash
npx playwright test --debug
```

View detailed logs:
```bash
PWDEBUG=1 npx playwright test
```

## Project Structure Best Practices

- **Page Objects**: All UI selectors and methods are encapsulated in `page_objects/`
- **Helpers**: Reusable API clients and utilities in `helpers/`
- **Data Layer**: Configuration and mappings separate from test logic
- **Serial Execution**: Tests run one after another to maintain state consistency

## Contributing

When adding new tests:
1. Create page objects for new UI areas in `page_objects/`
2. Add Jira API methods to `JiraClient` if needed
3. Keep data mappings updated in the `data/` folder
4. Maintain serial test execution order for data synchronization

## License

ISC
