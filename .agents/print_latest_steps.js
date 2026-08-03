const fs = require('fs');

const logFilePath = 'C:/Users/Krish/.gemini/antigravity-ide/brain/226a92b6-477a-44b2-808d-92f727530484/.system_generated/logs/transcript_full.jsonl';

const lines = fs.readFileSync(logFilePath, 'utf8').trim().split('\n');
console.log(`Total lines: ${lines.length}`);
const start = Math.max(0, lines.length - 20);
for (let i = start; i < lines.length; i++) {
    try {
        const entry = JSON.parse(lines[i]);
        console.log(`Line ${i+1} -> Step ${entry.step_index}: source=${entry.source}, type=${entry.type}`);
    } catch (e) {
        console.log(`Line ${i+1} -> Error parsing: ${e.message}`);
    }
}
