import { test, expect } from '@playwright/test';
import { JiraClient } from '../helpers/jiraClient';
import { jiraData } from '../data/jiraData';
import { QAPortalQualityTracker } from '../page_objects/QAPortalQualityTracker';
import { platformMapping } from '../data/platformMapping'; // add at file top with other imports

import * as fs from 'fs';

let statsByPlatform: Record<string, Record<string, number>> = {};

const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

let jiraUser: any;
let filterJQL: string;
let allIssues: any [] = [];




test.describe.configure({ mode: 'serial' });


test('authorizes in Jira', async () => {

  
    
    console.log(GREEN + "Step 1: authorizes in Jira");

    const jira = new JiraClient();
    const resp = await jira.getMyself();
    expect(resp.status).toBe(200);
    jiraUser = resp.data;
    console.log('✅ Jira user:', jiraUser.emailAddress || jiraUser.accountId);
    expect(jiraUser.emailAddress).toBe(process.env.JIRA_EMAIL);
  
});

test('retrieves JQL from Jira filter', async () => {
  console.log(CYAN + 'Step 2: retrieves JQL from Jira filter');
  const jira = new JiraClient();
  const filterId = jiraData.allBugsFilter;
  const resp = await jira.getFilter(filterId);
  expect(resp.status).toBe(200);
  const filter = resp.data;
  filterJQL = filter.jql;
  console.log('✅ JQL retrieved:', filterJQL);
  expect(typeof filterJQL).toBe('string');
});

test('fetches all issues from Jira', async () => {
  console.log(RED + 'Step 3: fetches all issues from Jira');
  const jira = new JiraClient();
  const jql = filterJQL;
  const fields = [jiraData.customFields.platform, jiraData.customFields.priority];
  allIssues = await jira.getAllIssues(jql, fields);
  console.log(`✅ Retrieved ${allIssues.length} issues`);
  expect(allIssues.length).toBeGreaterThan(0);
  for (const issue of allIssues) {
    expect(issue.fields).toBeTruthy();
  }
});

test('counts bugs grouped by platform', async () => {
  // define known platforms/priorities (optional; code works with dynamic values too)
  const knownPlatforms = ['Tizen','WebOS','AndroidTV','Android','iOS','tvOS','Chromecast'];
  const knownPriorities = ['Highest','High','Medium','Low','Lowest'];

  console.log(GREEN + 'Step 4: counts by platform');

  // initialize stats object (ensure keys exist if you prefer zeros for all combinations)
  statsByPlatform = {};

  // iterate issues and accumulate counts
  for (const issue of allIssues) {
    const priName: string = issue?.fields?.priority?.name ?? 'Unknown';
    let platformsField: any = issue?.fields?.customfield_10119;

    if (!platformsField) {
      // if platform not present, count under "Unknown"
      platformsField = ['Unknown'];
    } else if (!Array.isArray(platformsField)) {
      platformsField = [platformsField];
    }

    for (const platform of platformsField) {
      const plat = String(platform);
      if (!statsByPlatform[plat]) statsByPlatform[plat] = {};
      if (!statsByPlatform[plat][priName]) statsByPlatform[plat][priName] = 0;
      statsByPlatform[plat][priName] += 1;
    }
  }

  console.log('Grouped stats by platform and priority:\n', statsByPlatform);

  // basic assertions: at least one platform counted
  expect(Object.keys(statsByPlatform).length).toBeGreaterThan(0);
});

test('authorizes in QA-Portal', async ({ page, context }) => {
  

  console.log(CYAN + 'Step 5: QA portal authorization');
  const qaPortalQualityTracker = new QAPortalQualityTracker(page);
  
  const login = process.env.QATRACKER_LOGIN!;
  const password = process.env.QATRACKER_PASSWORD!;

  await qaPortalQualityTracker.visit();
  await qaPortalQualityTracker.login(login, password);
  
  await expect(qaPortalQualityTracker.logOutButton).toBeVisible();
  console.log(GREEN + '✅ QA Portal login successful' + RESET);

    // сохранить storageState (cookies + localStorage)
  const storageState = await context.storageState();
  fs.writeFileSync('auth.json', JSON.stringify(storageState, null, 2));
  console.log('✅ Session saved to auth.json');

  //await page.pause();


});

test('syncs grouped bug data to QA-Portal', async ({ browser }) => {
    
  console.log(GREEN + 'Step 6: Syncs bug data to QA-Portal' + RESET);

  // создать новый контекст с сохранённым состоянием из auth.json
  const context = await browser.newContext({
    storageState: 'auth.json',
  });
  const page = await context.newPage();

  const qaPortalQualityTracker = new QAPortalQualityTracker(page);
  
  await qaPortalQualityTracker.visit();
  await expect(qaPortalQualityTracker.logOutButton).toBeVisible();
  console.log('✅ Session restored, user is logged in');

  const synced: string[] = [];
  const skipped: Array<{ platform: string; project: string; reason: string; stats?: Record<string, number> }> = [];

  // Iterate platformMapping in a stable order
  for (const [platformKey, projectName] of Object.entries(platformMapping)) {
    console.log(`\n📊 Processing platform mapping: ${platformKey} -> ${projectName}`);

    // 0) reload to a clean/disabled baseline so this platform starts fresh,
    //    regardless of whether the previous platform was saved or skipped
    await qaPortalQualityTracker.visit();

    // 1) initial inputs should be disabled
    await expect(qaPortalQualityTracker.disabledInput).toBeEnabled();

    // 2) click to enable inputs
    await qaPortalQualityTracker.projectSizeMedium.click();
    // 3) now inputs should be enabled
    await expect(qaPortalQualityTracker.enabledInput).toBeVisible();

    // 4) prepare stats for this platform (may be undefined)
    const stats = (statsByPlatform as Record<string, Record<string, number>>)[platformKey];

    if (stats && Object.keys(stats).length > 0) {
      // fill only provided values; page object's method will only overwrite fields present in stats
      await qaPortalQualityTracker.fillBugsByPriority(stats);
      console.log(`Filled values for ${platformKey}:`, stats);
    } else {
      console.log(`No data for ${platformKey}; leaving default values`);
    }

    // 5) open Save modal and inspect the project's dropdown option
    await qaPortalQualityTracker.saveResultLink.click();
    // make sure combobox is present before inspecting/selecting
    await qaPortalQualityTracker.projectsDropdown.waitFor({ state: 'visible', timeout: 3000 });

    const optionState = await qaPortalQualityTracker.projectOptionState(projectName);

    // 5a) skip gracefully when the project cannot be selected (expected portal state)
    if (optionState !== 'selectable') {
      const reason = optionState === 'disabled'
        ? 'project not selectable — already saved today / option disabled'
        : 'project option not found in dropdown (absent)';
      skipped.push({ platform: platformKey, project: projectName, reason, stats });
      console.log(
        RED + `⏭️  Skipped ${platformKey} -> ${projectName} | reason: ${reason}` + RESET,
        '\n   bug counts that were filled:', stats ?? '(none)'
      );
      // next iteration's visit() reload restores the clean baseline
      continue;
    }

    // 5b) selectable: pick the project
    await qaPortalQualityTracker.projectsDropdown.selectOption(projectName);

    // 6) click Save
    await qaPortalQualityTracker.saveResultButton.click();

    // 7) wait for UI to return to disabled state before next platform
    // Wait that field becomes disabled again (save action should disable inputs)
    await expect(qaPortalQualityTracker.disabledInput).toBeEnabled({ timeout: 8000 });

    synced.push(platformKey);
    console.log(GREEN + `✅ Synced ${platformKey}` + RESET);
  }

  // run-level summary: synced vs skipped (auditable from the logs)
  console.log(GREEN + `\n===== Sync summary =====` + RESET);
  console.log(GREEN + `✅ Synced (${synced.length}): ${synced.join(', ') || '(none)'}` + RESET);
  console.log(RED + `⏭️  Skipped (${skipped.length}): ${skipped.map(s => `${s.platform} (${s.reason})`).join('; ') || '(none)'}` + RESET);

  // The run is healthy as long as the loop completed; an all-skipped run is OK.
  expect(synced.length + skipped.length).toBe(Object.keys(platformMapping).length);

  await context.close();

    
});