import { logger } from './Logger';

export function generateAIErrorReport(modelStatus: string): string {
  const logs = logger.getLogs();
  const errors = logs.filter((l) => l.type === 'ERROR');
  const warnings = logs.filter((l) => l.type === 'WARN');
  const time = new Date().toISOString();

  let report = `# 🐞 Web-IFC Viewer Execution & Error Report\n\n`;
  report += `- Generated Time: ${time}\n`;
  report += `- Engine: web-ifc v0.0.77 (WASM Browser Runtime)\n`;
  report += `- Model Status: ${modelStatus}\n`;
  report += `- Total Errors Detected: ${errors.length}\n`;
  report += `- Total Warnings: ${warnings.length}\n\n`;

  report += `## ❌ Detailed Errors for AI Analysis\n\n`;
  if (errors.length === 0) {
    report += `*No critical runtime errors detected in current session.*\n\n`;
  } else {
    errors.forEach((err, idx) => {
      report += `### Error #${idx + 1} [${err.timestamp}]\n`;
      report += `**Message:** ${err.message}\n`;
      if (err.details) {
        report += `**Details:**\n\`\`\`text\n${err.details}\n\`\`\`\n`;
      }
      if (err.stack) {
        report += `**Stack Trace:**\n\`\`\`text\n${err.stack}\n\`\`\`\n`;
      }
      report += `\n`;
    });
  }

  report += `## 📜 Full Chronological System Logs (Last ${logs.length})\n\n`;
  report += `\`\`\`text\n`;
  logs.forEach((l) => {
    report += `[${l.timestamp}] [${l.type.padEnd(7)}] ${l.message}\n`;
  });
  report += `\`\`\`\n\n`;

  report += `---\n*Report compiled by Web-IFC BIM Viewer & IFC Code Playground. Ready to be pasted to AI for automated code repair.*`;

  return report;
}
