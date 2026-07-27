const fs = require("fs");

const aiKey = process.env.AI_KEY;
if (!aiKey) {
    console.error("AI_KEY environment variable is not set.");
    process.exit(1);
}

const json = JSON.parse(fs.readFileSync("./package.json").toString());
json.aiKey = aiKey;

fs.writeFileSync("./package.json", `${JSON.stringify(json, null, 2)}\n`);
