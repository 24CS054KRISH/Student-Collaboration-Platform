const fs = require('fs');

const logFilePath = 'C:/Users/Krish/.gemini/antigravity-ide/brain/226a92b6-477a-44b2-808d-92f727530484/.system_generated/logs/transcript_full.jsonl';

const lines = fs.readFileSync(logFilePath, 'utf8').trim().split('\n');
console.log(`Total lines: ${lines.length}`);
for (let i = 0; i < lines.length; i++) {
    try {
        const entry = JSON.parse(lines[i]);
        if (entry.step_index >= 200 && entry.step_index <= 240) {
            console.log(`Line ${i+1} -> Step ${entry.step_index}: source=${entry.source}, type=${entry.type}, status=${entry.status}`);
        }
    } catch (e) {
    }
}
