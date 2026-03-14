import { state } from './state.js';

export function parseAndGroupMarkdown(markdown) {
    // --- EARLY EXIT: Steam Link Detection ---
    const steamRegex = /\[([^\]]+)\]\((https:\/\/store\.steampowered\.com\/news\/app\/1422450\/[^\)]+)\)/i;
    const steamMatch = markdown.match(steamRegex);

    if (steamMatch) {
        const title = steamMatch[1];
        const url = steamMatch[2];
        return `
            <div class="steam-link-container">
                <p>The full, detailed patch notes for this update are hosted on Steam:</p>
                <a href="${url}" target="_blank" class="steam-button">
                    <img src="https://store.steampowered.com/favicon.ico" alt="Steam" width="16">
                    Read on Steam: ${title}
                </a>
            </div>`;
    }
    // ----------------------------------------

    let buckets = {
        "Gameplay Changes": [],
        "Hero Changes": [],
        "Item Changes": [],
        "Misc": []
    };

    let currentBucket = "Misc";

    // --- BUFFERS ---
    let heroBuffer = null;
    let lastMatchedItemObj = null;

    let itemStructure = {
        "Weapon": { "T1": [], "T2": [], "T3": [], "T4": [] },
        "Vitality": { "T1": [], "T2": [], "T3": [], "T4": [] },
        "Spirit": { "T1": [], "T2": [], "T3": [], "T4": [] },
        "General": []
    };

    let gameplayStructure = {
        "General": []
    };
    let currentGameplayCategory = "General";

    // --- NEW: Misc Buffers ---
    let miscStructure = {
        "General": []
    };
    let currentMiscCategory = "General";

    // --- NEW: Universal Alias Normalization ---
    // This helper turns "Primary: alias1, alias2" from your txt files into a flattened, searchable map
    function normalizeKeywordArray(arr) {
        let normalized = [];
        if (typeof arr !== 'undefined') {
            arr.forEach(line => {
                if (line.includes(':')) {
                    let parts = line.split(':');
                    let primary = parts[0].trim();
                    let aliases = parts[1].split(',').map(a => a.trim());

                    aliases.push(primary); // Always include the primary word
                    aliases.forEach(alias => {
                        if (alias) normalized.push({ keyword: alias, primary: primary });
                    });
                } else {
                    normalized.push({ keyword: line.trim(), primary: line.trim() });
                }
            });
        }
        return normalized;
    }

    // Apply the normalizer to all text-based keyword lists
    let normalizedGameplayKeywords = normalizeKeywordArray(state.gameplayKeywords || []);
    let normalizedHeroKeywords = normalizeKeywordArray(state.heroKeywords || []);
    let normalizedAbilityKeywords = normalizeKeywordArray(state.abilityKeywords || []);

    // Flatten items so their aliases (from the JSON file) are searchable too!
    let normalizedItems = [];
    if (state.itemObjects) {
        state.itemObjects.forEach(item => {
            normalizedItems.push({ keyword: item.name, item: item });
            if (item.aliases) {
                item.aliases.forEach(alias => {
                    normalizedItems.push({ keyword: alias, item: item });
                });
            }
        });
    }

    // --- HELPER: Flush Hero Buffer ---
    function flushHeroBuffer() {
        if (!heroBuffer) return;

        // 1. Create the formatted name (e.g., "Abrams" or "MoAndKrill")
        let fileNamePart = (heroBuffer.name === "mo & krill") ? "MoAndKrill" :
            heroBuffer.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        // 2. FORCE to lowercase for GitHub Pages compatibility
        const safeFileName = fileNamePart.toLowerCase();

        let html = `\n\n<details class="hero-card">`;
        html += `<summary class="hero-card-header">
        <div class="hero-header-content">
            <img src="Resources/HeroPortraits/88px-${safeFileName}_card.png" class="hero-portrait-img" loading="lazy" onerror="this.style.display='none'">
            <img src="Resources/HeroNames/${safeFileName}_name.png" class="hero-name-img" alt="${heroBuffer.name}" loading="lazy" 
                 onerror="this.outerHTML='<span class=\\'hero-name-text\\'>${heroBuffer.name}</span>'">
        </div>
        <span class="expand-icon">▼</span>
    </summary>\n`;

        html += `<div class="hero-card-content">\n`;

        if (heroBuffer.general.length > 0) {
            html += `<ul class="hero-general-changes">\n`;
            heroBuffer.general.forEach(line => {
                let cleanLine = line.replace(/^- /, '');
                html += `<li>${cleanLine}</li>\n`;
            });
            html += `</ul>\n`;
        }

        for (const [abilityName, tiers] of Object.entries(heroBuffer.abilities)) {
            const displayAbilityName = abilityName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            const imageFileName = displayAbilityName.replace(/ /g, '_').toLowerCase();

            html += `<div class="ability-sub-card">`;
            html += `<div class="ability-header">
                        <img src="Resources/AbilityIcons/48px-${imageFileName}.png" class="ability-icon" alt="${displayAbilityName}" loading="lazy" onerror="this.style.display='none'">
                        <h4 class="ability-title">${displayAbilityName}</h4>
                     </div>`;

            if (tiers.base.length > 0) {
                html += `<ul class="ability-base-changes">`;
                tiers.base.forEach(line => { html += `<li>${line.replace(/^- /, '')}</li>\n`; });
                html += `</ul>`;
            }

            if (tiers.t1.length > 0 || tiers.t2.length > 0 || tiers.t3.length > 0) {
                html += `<div class="ability-tiers-grid">`;
                const renderTierColumn = (tierArray, tierLabel) => {
                    html += `<div class="tier-column">`;
                    html += `<div class="tier-column-header"><span class="tier-badge ${tierLabel}">${tierLabel}</span></div>`;
                    if (tierArray.length > 0) {
                        html += `<ul>`;
                        tierArray.forEach(line => {
                            let cleanLine = line.replace(/^- /, '').replace(/\bT[1-3]\b\s*:?\s*/gi, '');
                            html += `<li>${cleanLine}</li>\n`;
                        });
                        html += `</ul>`;
                    } else {
                        html += `<p class="no-changes-text">-</p>`;
                    }
                    html += `</div>`;
                };
                renderTierColumn(tiers.t1, "T1");
                renderTierColumn(tiers.t2, "T2");
                renderTierColumn(tiers.t3, "T3");
                html += `</div>\n`;
            }
            html += `</div>\n`;
        }

        html += `</div>\n</details>\n`;
        buckets["Hero Changes"].push(html);
        heroBuffer = null;
    }

    // --- HELPER: Flush Item Structure ---
    function flushItemStructure() {
        let itemsHtml = '';

        // 1. Updated economy costs to match the new Deadlock shop!
        const getTierCost = (tier) => {
            if (tier === 'T1') return '800';
            if (tier === 'T2') return '1,600';
            if (tier === 'T3') return '3,200';
            if (tier === 'T4') return '6,400'; // Covers both standard T4 and Legendary
            return '';
        };

        const categories = ["Weapon", "Vitality", "Spirit"];

        categories.forEach(categoryName => {
            const tiers = itemStructure[categoryName];
            let hasContent = ['T1', 'T2', 'T3', 'T4'].some(t => tiers[t].length > 0);

            if (hasContent) {
                // Deadlock Shop Colors & Icons
                let catColor = "var(--accent-color)";
                let catIcon = ""; // NEW: Variable to hold the correct icon filename

                if (categoryName === "Weapon") {
                    catColor = "#d6a24a"; // Amber
                    catIcon = "bullet.png";
                }
                if (categoryName === "Vitality") {
                    catColor = "#73c273"; // Green
                    catIcon = "vitality.png";
                }
                if (categoryName === "Spirit") {
                    catColor = "#b88fe5"; // Purple
                    catIcon = "spirit.png";
                }

                let catHtml = `\n\n<details class="hero-card item-category-card">`;

                // NEW: Added flexbox to the header content so the 80px image and text align perfectly side-by-side
                catHtml += `<summary class="hero-card-header" style="border-left: 4px solid ${catColor};">
                                <div class="hero-header-content" style="display: flex; align-items: center; gap: 16px;">
                                    <img src="Resources/MiscMedia/${catIcon}" alt="${categoryName}" loading="lazy" style="width: 80px; height: 80px;">
                                    <h3 class="category-header-text" style="color:${catColor};">${categoryName} Items</h3>
                                </div>
                                <span class="expand-icon">▼</span>
                            </summary>\n`;

                catHtml += `<div class="hero-card-content">\n`;

                ['T1', 'T2', 'T3', 'T4'].forEach(tier => {
                    if (tiers[tier] && tiers[tier].length > 0) {
                        catHtml += `<div class="ability-sub-card" style="border-left-color: ${catColor};">
                                        <div class="ability-header">
                                            <h4 class="ability-title" style="color: ${catColor};">Tier ${tier.replace('T', '')} 
                                                <span style="color:#98ffde; font-size:0.85em; text-transform:none; margin-left: 8px; font-family: 'Segoe UI', sans-serif;">
                                                    <img src="Resources/MiscMedia/souls.png" alt="Souls" style="height: 14px; vertical-align: middle; margin-right: 4px; position: relative; top: -2px; image-rendering: pixelated;">${getTierCost(tier)}
                                                </span>
                                            </h4>
                                        </div>
                                        <ul class="ability-base-changes">`;
                        tiers[tier].forEach(line => {
                            catHtml += `<li>${line.replace(/^[\*\-\\\s]+/, '')}</li>\n`;
                        });
                        catHtml += `</ul></div>\n`;
                    }
                });
                catHtml += `</div></details>\n`;
                itemsHtml += catHtml;
            }
        });

        // Output any general lines that didn't match a specific item
        if (itemStructure["General"].length > 0) {
            itemsHtml += `<div class="ability-sub-card">
                            <div class="ability-header">
                                <h4 class="ability-title" style="color: #aaa;">General Item Changes</h4>
                            </div>
                            <ul class="ability-base-changes">`;
            itemStructure["General"].forEach(line => {
                // Use an aggressive regex to strip \, -, *, and spaces
                itemsHtml += `<li>${line.replace(/^[\*\-\\\s]+/, '')}</li>\n`;
            });
            itemsHtml += `</ul></div>\n`;
        }

        if (itemsHtml !== '') {
            buckets["Item Changes"].push(itemsHtml);
        }
    }
    // ----------------------------------------------------------

    // --- HELPER: Flush Gameplay Structure ---
    function flushGameplayStructure() {
        let gameplayHtml = '';

        for (const [cat, lines] of Object.entries(gameplayStructure)) {
            if (lines.length > 0) {
                // If it's just random bullets, call it General Adjustments
                let catTitle = cat === "General" ? "General Adjustments" : cat;
                let catColor = "#4db8ff"; // A sleek electric blue!

                gameplayHtml += `<div class="ability-sub-card" style="border-left-color: ${catColor}; margin-bottom: 16px; background-color: rgba(0,0,0,0.2);">
                                    <div class="ability-header" style="border-bottom: 1px solid rgba(77, 184, 255, 0.15); padding-bottom: 8px; margin-bottom: 12px;">
                                        <h4 class="ability-title" style="color: ${catColor}; font-size: 1.1em; text-transform: uppercase; font-family: 'Valve Oracle', sans-serif;">
                                            <span style="margin-right: 8px;">⚙️</span> ${catTitle}
                                        </h4>
                                    </div>
                                    <ul class="ability-base-changes">`;
                lines.forEach(line => {


                    // Strip markdown junk like dashes, asterisks, and hashes
                    let cleanLine = line.replace(/^[\*\-\\\s#]+/, '');

                    // Optional: Make numbers pop in blue automatically
                    cleanLine = cleanLine.replace(/\b(\d+(?:\.\d+)?(?:[\/]\d+(?:\.\d+)?)*(?:%|s)?)(?!\w)/g, '<strong style="color: #4db8ff;">$1</strong>');

                    gameplayHtml += `<li>${cleanLine}</li>\n`;
                });
                gameplayHtml += `</ul></div>\n`;
            }
        }

        if (gameplayHtml) {
            buckets["Gameplay Changes"] = [gameplayHtml];
        }
    }

    // ----------------------------------------------------------

    // --- HELPER: Flush Misc Structure ---
    function flushMiscStructure() {
        let miscHtml = '';
        let hasContent = Object.values(miscStructure).some(arr => arr.length > 0);

        if (hasContent) {
            let catColor = "#95a5a6"; // A sleek, neutral Silver/Steel color

            miscHtml += `\n\n<details class="hero-card misc-category-card">`;

            miscHtml += `<summary class="hero-card-header" style="border-left: 4px solid ${catColor};">
                            <div class="hero-header-content" style="display: flex; align-items: center; gap: 16px;">
                                <img src="Resources/MiscMedia/misc.png" alt="Misc" loading="lazy" style="width: 80px; height: 80px;" onerror="this.style.display='none'">
                                <h3 class="category-header-text" style="color:${catColor};">Miscellaneous Updates</h3>
                            </div>
                            <span class="expand-icon">▼</span>
                        </summary>\n`;

            miscHtml += `<div class="hero-card-content">\n`;

            for (const [cat, lines] of Object.entries(miscStructure)) {
                if (lines.length > 0) {
                    let catTitle = cat === "General" ? "General Fixes" : cat;

                    miscHtml += `<div class="ability-sub-card" style="border-left-color: ${catColor};">
                                    <div class="ability-header">
                                        <h4 class="ability-title" style="color: ${catColor}; text-transform: uppercase;">
                                            <span style="margin-right: 8px;">🔧</span> ${catTitle}
                                        </h4>
                                    </div>
                                    <ul class="ability-base-changes">`;
                    lines.forEach(line => {
                        let cleanLine = line.replace(/^[\*\-\\\s#]+/, ''); // Strip markdown
                        miscHtml += `<li>${cleanLine}</li>\n`;
                    });
                    miscHtml += `</ul></div>\n`;
                }
            }
            miscHtml += `</div></details>\n`;

            // Push it all into the main bucket!
            buckets["Misc"].push(miscHtml);
        }
    }
    // ----------------------------------------------------------


    const lines = markdown.split('\n');

    for (let line of lines) {
        const cleanLine = line.toLowerCase();

        // Skip blank lines
        if (cleanLine.trim() === '' || cleanLine.match(/^[\*\-]{3,}\s*$/)) {
            if (currentBucket !== "Hero Changes" && currentBucket !== "Item Changes") {
                buckets[currentBucket].push(line);
            }
            continue;
        }

        // --- Detectors ---
        // Sort by longest alias first to prevent substring collisions
        const matchedHeroObj = normalizedHeroKeywords
            .sort((a, b) => b.keyword.length - a.keyword.length)
            .find(obj => {
                const escapedK = obj.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                return new RegExp(`^[^a-z0-9]*${escapedK}\\s*:`, 'i').test(cleanLine);
            });

        const matchedItemMatch = normalizedItems
            .sort((a, b) => b.keyword.length - a.keyword.length)
            .find(obj => {
                const escapedNameForSearch = obj.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                return new RegExp(`^[\\*\\-\\\\\\s]*${escapedNameForSearch}\\b`, 'i').test(cleanLine);
            });

        const matchedItemObj = matchedItemMatch ? matchedItemMatch.item : null;
        const matchedItemKeyword = matchedItemMatch ? matchedItemMatch.keyword : null;

        const matchedGameplayObj = normalizedGameplayKeywords
            .sort((a, b) => b.keyword.length - a.keyword.length)
            .find(obj => {
                const escapedK = obj.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                return new RegExp(`^[\\*\\-\\\\\\s]*(###\\s*)?${escapedK}\\b`, 'i').test(cleanLine);
            });

        if (matchedHeroObj) {
            lastMatchedItemObj = null;
            currentBucket = "Hero Changes";

            // Force output to always use the Primary hero name (e.g. "Mo & Krill")
            const primaryHeroName = matchedHeroObj.primary.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

            if (!heroBuffer || heroBuffer.name.toLowerCase() !== primaryHeroName.toLowerCase()) {
                flushHeroBuffer();
                heroBuffer = { name: primaryHeroName, general: [], abilities: {} };
            }

            // Slice off whatever weird alias they typed in the notes
            const escapedAlias = matchedHeroObj.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const prefixRegex = new RegExp(`^[^a-z0-9]*${escapedAlias}\\s*:\\s*`, 'i');
            let formattedLine = line.replace(prefixRegex, '- ');

            // Check if the bullet mentions a known Ability (or Ability Alias)
            const matchedAbilityObj = normalizedAbilityKeywords
                .sort((a, b) => b.keyword.length - a.keyword.length)
                .find(obj => formattedLine.toLowerCase().includes(obj.keyword.toLowerCase()));

            if (matchedAbilityObj) {
                const primaryAbility = matchedAbilityObj.primary;
                if (!heroBuffer.abilities[primaryAbility]) {
                    heroBuffer.abilities[primaryAbility] = { base: [], t1: [], t2: [], t3: [] };
                }

                // Replace the alias with a bolded version of the PRIMARY ability name
                const abilityRegex = new RegExp(`(${matchedAbilityObj.keyword})`, 'ig');
                formattedLine = formattedLine.replace(abilityRegex, `<strong>${primaryAbility}</strong>`);

                const tierMatch = formattedLine.match(/\bT([1-3])\b/i);
                if (tierMatch) {
                    heroBuffer.abilities[primaryAbility][`t${tierMatch[1]}`].push(formattedLine);
                } else {
                    heroBuffer.abilities[primaryAbility].base.push(formattedLine);
                }
            } else {
                heroBuffer.general.push(formattedLine);
            }
        }

        else if (matchedItemObj) {
            flushHeroBuffer();
            currentBucket = "Item Changes";
            lastMatchedItemObj = matchedItemObj;

            // Escape special characters using the exact matched keyword (alias or primary)
            const escapedName = matchedItemKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            // Slice the messy prefix off so we are just left with the pure change text
            const startOfLineRegex = new RegExp(`^[\\*\\-\\\\\\s]*${escapedName}\\s*:?\\s*`, 'i');
            let remainingText = line.replace(startOfLineRegex, '');

            let imageName = matchedItemObj.name.replace(/ /g, '_').toLowerCase;

            // Rebuild the line forcing the Golden Primary Name, no matter what alias was matched!
            let formattedLine = `<img src="Resources/ItemIcons/50px-${imageName}.png" alt="${matchedItemObj.name}" class="item-icon-inline" onerror="this.style.display='none'"> <strong style="color: #ffd633;">${matchedItemObj.name}</strong>: ${remainingText}`;

            itemStructure[matchedItemObj.category][matchedItemObj.tier].push(formattedLine);
        }
        else if (matchedGameplayObj) {
            flushHeroBuffer();
            currentBucket = "Gameplay Changes";
            lastMatchedItemObj = null;

            // Use the PRIMARY category name (e.g., "Hero"), not the alias ("hero's")
            currentGameplayCategory = matchedGameplayObj.primary.replace(/\b\w/g, c => c.toUpperCase());

            if (!gameplayStructure[currentGameplayCategory]) {
                gameplayStructure[currentGameplayCategory] = [];
            }

            // Slice the specific alias off the front of the sentence so it looks clean
            const escapedAlias = matchedGameplayObj.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const startOfLineRegex = new RegExp(`^[\\*\\-\\\\\\s]*(###\\s*)?${escapedAlias}\\s*:?\\s*`, 'i');

            let remainingText = line.replace(startOfLineRegex, '');
            if (remainingText.trim() !== '') {
                gameplayStructure[currentGameplayCategory].push(remainingText);
            }
        }
        // --- NEW: THE MISC CATEGORY DETECTOR ---
        else if (
            /^[\*\-\\\s]*\[\s*([a-zA-Z0-9\s]+)\s*\]/.test(line) || // Catches [ Audio ]
            /^#+\s+([a-zA-Z0-9\s]+)/.test(line) ||               // Catches ### Matchmaking
            /^[\*\-\\\s]*(UI|Misc|Audio|Matchmaking|Localization|General|Performance|Visuals|Networking|Controls|Map)\s*:/i.test(line) // Catches Prefix: text
        ) {
            flushHeroBuffer();
            currentBucket = "Misc";
            lastMatchedItemObj = null;

            // Extract the category name
            let miscCategoryMatch = line.match(/^[\*\-\\\s]*\[\s*([a-zA-Z0-9\s]+)\s*\]/) ||
                line.match(/^#+\s+([a-zA-Z0-9\s]+)/) ||
                line.match(/^[\*\-\\\s]*(UI|Misc|Audio|Matchmaking|Localization|General|Performance|Visuals|Networking|Controls|Map)\s*:/i);

            let catName = miscCategoryMatch[1].trim();
            // Capitalize nicely (e.g., "audio" -> "Audio")
            currentMiscCategory = catName.charAt(0).toUpperCase() + catName.slice(1).toLowerCase();

            if (!miscStructure[currentMiscCategory]) {
                miscStructure[currentMiscCategory] = [];
            }

            // Clean the category prefix out of the text so we just have the raw patch note
            let remainingText = line;
            if (line.match(/^[\*\-\\\s]*\[\s*[a-zA-Z0-9\s]+\s*\]/)) {
                remainingText = line.replace(/^[\*\-\\\s]*\[\s*[a-zA-Z0-9\s]+\s*\]\s*:?\s*/, '');
            } else if (line.match(/^#+\s+[a-zA-Z0-9\s]+/)) {
                remainingText = line.replace(/^#+\s+[a-zA-Z0-9\s]+\s*/, '');
            } else {
                let prefixRegex = new RegExp(`^[\\*\\-\\\\\\s]*${currentMiscCategory}\\s*:?\\s*`, 'i');
                remainingText = line.replace(prefixRegex, '');
            }

            if (remainingText.trim() !== '') {
                miscStructure[currentMiscCategory].push(remainingText);
            }
        }

        else {
            // Un-prefixed lines (General stats or sub-bullets)
            if (currentBucket === "Hero Changes" && heroBuffer) {
                heroBuffer.general.push(line);
            } else if (currentBucket === "Item Changes") {
                if (lastMatchedItemObj) {
                    itemStructure[lastMatchedItemObj.category][lastMatchedItemObj.tier].push(line);
                } else {
                    itemStructure["General"].push(line);
                }
            } else if (currentBucket === "Gameplay Changes") {
                gameplayStructure[currentGameplayCategory].push(line);
            } else if (currentBucket === "Misc") {
                // --- NEW: Route stray bullets into the current Misc Sub-category ---
                miscStructure[currentMiscCategory].push(line);
            } else {
                buckets[currentBucket].push(line);
            }
        }
    }

    // Final flushes
    flushHeroBuffer();
    flushItemStructure();
    flushGameplayStructure();
    flushMiscStructure();

    let html = '';
    for (const [category, contentLines] of Object.entries(buckets)) {
        const joinedContent = contentLines.join('\n').trim();
        if (joinedContent) {

            // Bypass marked.js for our custom formatted cards!
            const finalContent = (category === "Hero Changes" || category === "Item Changes" || category === "Gameplay Changes")
                ? joinedContent
                : marked.parse(joinedContent);

            html += `
            <details class="patch-category">
                <summary>${category}</summary>
                <div class="category-content">
                    ${finalContent}
                </div>
            </details>`;
        }
    }

    if (html === '' && markdown.trim() !== '') {
        return marked.parse(markdown);
    }

    return html;
}