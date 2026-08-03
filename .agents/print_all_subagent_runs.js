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
        if (entry.type === 'BROWSER_SUBAGENT' || entry.tool_calls?.[0]?.name === 'browser_subagent') {
            console.log(`=== Step Index ${entry.step_index} ===`);
            if (entry.content) {
                console.log("Content:", entry.content.substring(0, 1000));
            }
            if (entry.tool_calls) {
                console.log("Tool Calls:", JSON.stringify(entry.tool_calls.map(tc => ({ name: tc.name, args: { TaskName: tc.args.TaskName } })), null, 2));
            }
        }
    } catch (e) {
    }
});
