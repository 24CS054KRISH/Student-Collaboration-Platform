const fs = require('fs');

const logFilePath = 'C:/Users/Krish/.gemini/antigravity-ide/brain/226a92b6-477a-44b2-808d-92f727530484/.system_generated/logs/transcript_full.jsonl';

const content = fs.readFileSync(logFilePath, 'utf8');
// Find the subagent report or details
const subagentMatches = content.match(/Step 92: capture_browser_console_logs[\s\S]*?### Step 94/g);
if (subagentMatches) {
    console.log("Found matches:");
    subagentMatches.forEach((m, idx) => {
        console.log(`--- Match ${idx+1} ---`);
        console.log(m);
    });
} else {
    console.log("No match found for Step 92 to Step 94");
}
