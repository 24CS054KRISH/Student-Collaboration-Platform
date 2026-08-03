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
        // Let's print BROWSER_SUBAGENT steps if there are any
        if (entry.type === 'BROWSER_SUBAGENT') {
            console.log(`=== BROWSER_SUBAGENT Step: ${entry.step_index} ===`);
            console.log(entry.content.substring(0, 1500));
        }
    } catch (e) {
    }
});
