const fs = require('fs');

const logFilePath = 'C:/Users/Krish/.gemini/antigravity-ide/brain/226a92b6-477a-44b2-808d-92f727530484/.system_generated/logs/transcript_full.jsonl';

const lines = fs.readFileSync(logFilePath, 'utf8').trim().split('\n');
for (let i = 0; i < lines.length; i++) {
    try {
        const entry = JSON.parse(lines[i]);
        if (entry.step_index >= 230) {
            console.log(`=== Step ${entry.step_index} ===`);
            console.log(JSON.stringify(entry, null, 2));
        }
    } catch (e) {
    }
}
