const fs = require('fs');
const readline = require('readline');

const logFilePath = 'C:/Users/Krish/.gemini/antigravity-ide/brain/226a92b6-477a-44b2-808d-92f727530484/.system_generated/logs/transcript_full.jsonl';

const rl = readline.createInterface({
    input: fs.createReadStream(logFilePath),
    crlfDelay: Infinity
});

rl.on('line', (line) => {
    try {
        const entry = JSON.parse(line);
        if (line.includes('diagnose_delete_issue')) {
            console.log(`=== Found diagnose_delete_issue at step ${entry.step_index} ===`);
            console.log(JSON.stringify(entry, null, 2));
        }
    } catch (e) {
    }
});
