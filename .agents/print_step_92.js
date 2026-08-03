const fs = require('fs');

const logFilePath = 'C:/Users/Krish/.gemini/antigravity-ide/brain/226a92b6-477a-44b2-808d-92f727530484/.system_generated/logs/transcript_full.jsonl';

const lines = fs.readFileSync(logFilePath, 'utf8').trim().split('\n');
for (let i = 0; i < lines.length; i++) {
    try {
        const entry = JSON.parse(lines[i]);
        if (entry.content?.includes('Step 92: capture_browser_console_logs') || entry.content?.includes('Step 168: capture_browser_console_logs')) {
            console.log(`=== Found Step in Line ${i+1} ===`);
            console.log(entry.content);
        }
    } catch (e) {
    }
}
