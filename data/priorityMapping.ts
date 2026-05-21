export const priorityMapping: Record<string, string> = {
  // Jira -> QA Portal field names
  Highest: 'blocker',
  High: 'critical',
  Medium: 'major',
  //major: 'major', // handle alternate spelling
  Low: 'minor',
  Lowest: 'trivial',
  //minor: 'trivial', // handle alternate spelling
};