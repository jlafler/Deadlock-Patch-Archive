const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
// Change this to the folder you want to fix (e.g., './Resources/HeroPortraits')
const targetFolder = './Resources/MiscMedia';

function renameFilesToLower(dir) {
    if (!fs.existsSync(dir)) {
        console.error(`Error: Folder "${dir}" not found.`);
        return;
    }

    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const oldPath = path.join(dir, file);
        const stat = fs.statSync(oldPath);

        if (stat.isDirectory()) {
            // Recursively handle subfolders if they exist
            renameFilesToLower(oldPath);
        } else {
            const lowerName = file.toLowerCase();
            const newPath = path.join(dir, lowerName);

            if (oldPath !== newPath) {
                fs.renameSync(oldPath, newPath);
                console.log(`Renamed: ${file} -> ${lowerName}`);
            }
        }
    });
}

console.log('Starting rename process...');
renameFilesToLower(targetFolder);
console.log('Done!');