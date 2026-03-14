const express = require('express');
const fs = require('fs');
const path = require('path');
const util = require('util');
const { spawn } = require('child_process'); // Switched from exec to spawn

const app = express();
const PORT = 3000;

// Allow the server to parse JSON requests and serve your static files
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// Map safe IDs to your actual files
const fileMap = {
    'heroes': 'heroes.txt',
    'abilities': 'abilities.txt',
    'gameplay': 'gameplay.txt',
    'items': 'items.json'
};

// API: Get file content
app.get('/api/files/:id', (req, res) => {
    const filename = fileMap[req.params.id];
    if (!filename) return res.status(404).json({ error: "File not found" });

    // NEW: Added '..' to step up into the main DeadlockPatches folder
    const filePath = path.join(__dirname, '..', filename);

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: "Could not read file" });
        res.json({ content: data });
    });
});

app.listen(PORT, () => {
    console.log(`\n⚙️  Admin tool running!`);
    console.log(`👉 Open http://localhost:${PORT}/admin.html in your browser.\n`);
});

// API: Save file content
app.post('/api/files/:id', (req, res) => {
    const filename = fileMap[req.params.id];
    if (!filename) return res.status(404).json({ error: "File not found" });

    // NEW: Added '..' to step up into the main DeadlockPatches folder
    const filePath = path.join(__dirname, '..', filename);
    let newContent = req.body.content;

    // Safety check: If it's a JSON file, ensure it's actually valid JSON before saving!
    if (filename.endsWith('.json')) {
        try {
            const parsed = JSON.parse(newContent);
            newContent = JSON.stringify(parsed, null, 4); // Beautify it perfectly
        } catch (e) {
            return res.status(400).json({ error: "Invalid JSON format. Check for missing commas or quotes!" });
        }
    }

    fs.writeFile(filePath, newContent, 'utf8', (err) => {
        if (err) return res.status(500).json({ error: "Failed to save file" });
        res.json({ success: true, message: `${filename} saved successfully!` });
    });
});

// API: Trigger Scraper Script Sequence (Streaming)
app.post('/api/scrape/:mode', (req, res) => {
    const mode = req.params.mode;

    // Set HTTP headers to keep the connection open and stream text
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    const scraperPath = path.join(__dirname, '..', 'scraper.js');
    const patchScraperPath = path.join(__dirname, '..', 'PatchScraper.js');

    // Helper function to run a script and stream its output to the browser
    const runScript = (scriptPath, args) => {
        return new Promise((resolve, reject) => {
            const child = spawn('node', [scriptPath, ...args]);

            // Every time the script logs to the console, send it to the frontend!
            child.stdout.on('data', (data) => {
                const text = data.toString();
                console.log(text.trim()); // Still log it in your main terminal
                res.write(text);          // Stream it to the dashboard
            });

            child.stderr.on('data', (data) => {
                const text = data.toString();
                console.error(`ERROR: ${text.trim()}`);
                res.write(`ERROR: ${text}`);
            });

            child.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`Script crashed with exit code ${code}`));
            });
        });
    };

    // Run them sequentially
    const runSequence = async () => {
        try {
            res.write("⏳ Step 1: Initializing scraper.js...\n");
            await runScript(scraperPath, []);

            res.write("⏳ Step 2: Initializing PatchScraper.js...\n");
            const args = mode === 'all' ? ['--force'] : [];
            await runScript(patchScraperPath, args);

            res.write("\n✅ Scrape sequence completed successfully!\n");
            res.end(); // Close the stream
        } catch (error) {
            res.write(`\n❌ Scrape Sequence Failed: ${error.message}\n`);
            res.end(); // Close the stream
        }
    };

    runSequence();
});