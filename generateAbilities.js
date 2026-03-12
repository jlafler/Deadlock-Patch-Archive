const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
// Change this to the exact name of your folder holding the images
const imagesFolder = './AbilityIcons';
const outputFile = './abilities.txt';

// Read all files in the directory
fs.readdir(imagesFolder, (err, files) => {
    if (err) {
        console.error("❌ Error reading the folder. Make sure the folder path is correct!", err);
        return;
    }

    const abilityNames = [];

    files.forEach(file => {
        // Only process files that match the naming scheme
        if (file.startsWith('48px-') && file.endsWith('.png')) {

            // 1. Remove the prefix and suffix
            let cleanName = file.replace('48px-', '').replace('.png', '');

            // 2. If your files use underscores (e.g., Siphon_Life), change them to spaces
            cleanName = cleanName.replace(/_/g, ' ');

            abilityNames.push(cleanName);
        }
    });

    // Write the compiled list to abilities.txt, separated by a new line
    fs.writeFile(outputFile, abilityNames.join('\n'), (err) => {
        if (err) {
            console.error("❌ Error writing the text file.", err);
            return;
        }
        console.log(`✅ Success! Extracted ${abilityNames.length} abilities and saved them to ${outputFile}.`);
    });
});