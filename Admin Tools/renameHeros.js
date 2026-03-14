const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
// Make sure this matches the folder where your hero name PNGs are stored
const folderPath = './HeroNames';

fs.readdir(folderPath, (err, files) => {
    if (err) {
        console.error("❌ Error reading the folder. Is the path correct?", err);
        return;
    }

    let renameCount = 0;

    files.forEach(file => {
        // Regex looks for any numbers at the start, followed by "px-" 
        // Example: "120px-Abrams_name.png"
        const match = file.match(/^(\d+)px-(.+)$/i);

        if (match) {
            const oldPath = path.join(folderPath, file);

            // match[2] is everything AFTER the "px-" (e.g., "Abrams_name.png")
            const newName = match[2];
            const newPath = path.join(folderPath, newName);

            fs.renameSync(oldPath, newPath);
            console.log(`✅ Renamed: ${file}  -->  ${newName}`);
            renameCount++;
        }
    });

    console.log(`\n🎉 All done! Successfully cleaned up ${renameCount} images.`);
});