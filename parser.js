function parseAndGroupMarkdown(markdown) {
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
    let heroBuffer = null;

    // --- HELPER: Flush the Hero Buffer into the HTML bucket ---
    function flushHeroBuffer() {
        if (!heroBuffer) return;

        let fileNamePart = (heroBuffer.name === "mo & krill") ? "MoAndKrill" :
            heroBuffer.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        let html = `\n\n<div class="hero-portrait-header">
            <img src="HeroPortraits/88px-${fileNamePart}_card.png" class="hero-portrait-img" onerror="this.style.display='none'">
            
            <img src="HeroNames/${fileNamePart}_name.png" class="hero-name-img" alt="${heroBuffer.name}" 
                 onerror="this.outerHTML='<span class=\\'hero-name-text\\'>${heroBuffer.name}</span>'">
        </div>\n\n`;

        // 1. Render General Hero Changes
        if (heroBuffer.general.length > 0) {
            html += `<ul class="hero-general-changes">\n`;
            heroBuffer.general.forEach(line => {
                let cleanLine = line.replace(/^- /, '');
                html += `<li>${cleanLine}</li>\n`;
            });
            html += `</ul>\n`;
        }

        // 2. Render Ability Changes (New Grid Layout)
        for (const [abilityName, tiers] of Object.entries(heroBuffer.abilities)) {
            html += `<div class="ability-block">`;

            // Clean up the ability name for the UI and the image file path
            // This turns "siphon life" into "Siphon Life" and "Siphon_Life"
            const displayAbilityName = abilityName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            const imageFileName = displayAbilityName.replace(/ /g, '_');

            // Ability Title with the Image Icon
            html += `<div class="ability-header">
                        <img src="AbilityIcons/48px-${imageFileName}.png" class="ability-icon" alt="${displayAbilityName}" onerror="this.style.display='none'">
                        <h4 class="ability-title">${displayAbilityName}</h4>
                     </div>`;

            // Full-Row Base/General Ability Changes
            if (tiers.base.length > 0) {
                html += `<ul class="ability-base-changes">`;
                tiers.base.forEach(line => {
                    let cleanLine = line.replace(/^- /, '');
                    html += `<li>${cleanLine}</li>\n`;
                });
                html += `</ul>`;
            }

            // 3-Column Tier Grid (Only renders if at least one tier was changed)
            if (tiers.t1.length > 0 || tiers.t2.length > 0 || tiers.t3.length > 0) {
                html += `<div class="ability-tiers-grid">`;

                // Helper to render a specific tier column
                const renderTierColumn = (tierArray, tierLabel) => {
                    html += `<div class="tier-column">`;
                    html += `<div class="tier-column-header"><span class="tier-badge ${tierLabel}">${tierLabel}</span></div>`;

                    if (tierArray.length > 0) {
                        html += `<ul>`;
                        tierArray.forEach(line => {
                            let cleanLine = line.replace(/^- /, '');
                            // Clean out the redundant tier text (e.g., removes "T3" from the start of the sentence)
                            cleanLine = cleanLine.replace(/\bT[1-3]\b\s*:?\s*/gi, '');
                            html += `<li>${cleanLine}</li>\n`;
                        });
                        html += `</ul>`;
                    } else {
                        // Show a subtle placeholder if a tier wasn't touched in this patch
                        html += `<p class="no-changes-text">-</p>`;
                    }
                    html += `</div>`;
                };

                renderTierColumn(tiers.t1, "T1");
                renderTierColumn(tiers.t2, "T2");
                renderTierColumn(tiers.t3, "T3");

                html += `</div>\n`; // Close Grid
            }

            html += `</div>\n`; // Close Ability Block
            html += `<hr class="hero-divider">\n`;
        }

        buckets["Hero Changes"].push(html);
        heroBuffer = null;
    }
    // ----------------------------------------------------------

    const lines = markdown.split('\n');

    for (let line of lines) {
        const cleanLine = line.toLowerCase();

        // Skip blank lines or horizontal rules
        if (cleanLine.trim() === '' || cleanLine.match(/^[\*\-]{3,}\s*$/)) {
            if (currentBucket !== "Hero Changes") buckets[currentBucket].push(line);
            continue;
        }

        // 1. Is this a Hero line?
        const matchedHero = heroKeywords.find(keyword => {
            const heroColonRegex = new RegExp(`^[^a-z0-9]*${keyword}\\s*:`, 'i');
            return heroColonRegex.test(cleanLine);
        });

        if (matchedHero) {
            currentBucket = "Hero Changes";

            // If we hit a NEW hero, flush the old one
            if (!heroBuffer || heroBuffer.name !== matchedHero) {
                flushHeroBuffer();
                heroBuffer = { name: matchedHero, general: [], abilities: {} };
            }

            // Strip the bullet and hero name prefix
            const prefixRegex = new RegExp(`^[^a-z0-9]*${matchedHero}\\s*:\\s*`, 'i');
            let formattedLine = line.replace(prefixRegex, '- ');

            // 2. Is an Ability mentioned?
            // (Using strict word boundaries if possible, or just .includes)
            const matchedAbility = abilityKeywords.find(ability =>
                formattedLine.toLowerCase().includes(ability)
            );

            if (matchedAbility) {
                // Initialize the ability structure if it doesn't exist
                if (!heroBuffer.abilities[matchedAbility]) {
                    heroBuffer.abilities[matchedAbility] = { base: [], t1: [], t2: [], t3: [] };
                }

                // Make the ability name bold in the text so it pops
                const abilityRegex = new RegExp(`(${matchedAbility})`, 'ig');
                formattedLine = formattedLine.replace(abilityRegex, '<strong>$1</strong>');

                // 3. Which Tier does it belong to?
                const tierMatch = formattedLine.match(/\bT([1-3])\b/i);

                if (tierMatch) {
                    const tierLevel = `t${tierMatch[1]}`; // e.g., "t3"
                    heroBuffer.abilities[matchedAbility][tierLevel].push(formattedLine);
                } else {
                    heroBuffer.abilities[matchedAbility].base.push(formattedLine);
                }
            } else {
                // No ability mentioned = General stat change
                heroBuffer.general.push(formattedLine);
            }
        }
        // If we hit Items or Gameplay, flush the hero buffer and switch buckets
        else if (itemKeywords.some(keyword => new RegExp(`\\b${keyword}\\b`, 'i').test(cleanLine))) {
            flushHeroBuffer();
            currentBucket = "Item Changes";
            buckets[currentBucket].push(line);
        } else if (gameplayKeywords.some(keyword => new RegExp(`\\b${keyword}\\b`, 'i').test(cleanLine))) {
            flushHeroBuffer();
            currentBucket = "Gameplay Changes";
            buckets[currentBucket].push(line);
        } else {
            // Random lines/sub-bullets
            if (currentBucket === "Hero Changes" && heroBuffer) {
                // If we are currently parsing a hero, assume this belongs to their general stats
                heroBuffer.general.push(line);
            } else {
                buckets[currentBucket].push(line);
            }
        }
    }

    // Flush the final hero at the end of the text block
    flushHeroBuffer();

    let html = '';
    for (const [category, contentLines] of Object.entries(buckets)) {
        const joinedContent = contentLines.join('\n').trim();
        if (joinedContent) {
            // Because our Hero HTML is pre-formatted, we only pass non-hero buckets through marked.js
            const finalContent = category === "Hero Changes" ? joinedContent : marked.parse(joinedContent);

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