let allPatches = [];
let selectedDateFilter = null;

// The 4 Keyword Arrays
let heroKeywords = [];
let itemKeywords = [];
let gameplayKeywords = [];
let abilityKeywords = []; // <-- This was the missing variable!

// Function to load and parse the text files
async function loadKeywords() {
    try {
        const [heroesRes, itemsRes, gameplayRes, abilitiesRes] = await Promise.all([
            fetch('heroes.txt'),
            fetch('items.txt'),
            fetch('gameplay.txt'),
            fetch('abilities.txt') // <-- Fetch the new file
        ]);

        const heroesText = await heroesRes.text();
        const itemsText = await itemsRes.text();
        const gameplayText = await gameplayRes.text();
        const abilitiesText = await abilitiesRes.text(); // <-- Read the new file

        heroKeywords = heroesText.split('\n').map(k => k.trim().toLowerCase()).filter(k => k);
        itemKeywords = itemsText.split('\n').map(k => k.trim().toLowerCase()).filter(k => k);
        gameplayKeywords = gameplayText.split('\n').map(k => k.trim().toLowerCase()).filter(k => k);
        abilityKeywords = abilitiesText.split('\n').map(k => k.trim().toLowerCase()).filter(k => k); // <-- Populate the array
    } catch (error) {
        console.error("Could not load keyword files. Check your folder structure.");
    }
}

async function loadPatchNotes() {
    try {
        await loadKeywords();

        const response = await fetch('all_patch_notes.json');
        allPatches = await response.json();
        allPatches.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (allPatches.length > 0) {
            let newestDate = new Date(allPatches[0].date);

            // Check replies for a newer date
            if (allPatches[0].replyDates && allPatches[0].replyDates.length > 0) {
                const lastReply = new Date(allPatches[0].replyDates[allPatches[0].replyDates.length - 1]);
                if (lastReply > newestDate) newestDate = lastReply;
            }

            // FIX: Always use toISODate for the global filter
            selectedDateFilter = toISODate(newestDate);
        }

        renderCalendarBand(allPatches);
        applyFilters();
    } catch (error) {
        console.error(error);
        document.getElementById('patchContainer').innerHTML = '<p>Error loading patch notes.</p>';
    }
}

// NEW: Horizontal Mousewheel Scroll for Calendar
const calendarBand = document.getElementById('calendarBand');

calendarBand.addEventListener('wheel', (evt) => {
    // Prevent the default vertical page scroll
    evt.preventDefault();

    // Scroll the calendar horizontally instead
    // deltaY is the amount the wheel moved vertically
    calendarBand.scrollLeft += evt.deltaY;
}, { passive: false });

const scrollZoneLeft = document.getElementById('scrollZoneLeft');
const scrollZoneRight = document.getElementById('scrollZoneRight');
const band = document.getElementById('calendarBand');

let scrollAnimationId;
const scrollSpeed = 5; // Adjust this number to make it scroll faster or slower

function startScrolling(direction) {
    function scrollStep() {
        band.scrollLeft += direction * scrollSpeed;
        // Keep looping as long as the mouse is hovering
        scrollAnimationId = requestAnimationFrame(scrollStep);
    }
    // Start the loop
    scrollAnimationId = requestAnimationFrame(scrollStep);
}

function stopScrolling() {
    // Kill the loop when the mouse leaves
    cancelAnimationFrame(scrollAnimationId);
}

// Attach the events to the Left Zone
scrollZoneLeft.addEventListener('mouseenter', () => startScrolling(-1)); // -1 means scroll left
scrollZoneLeft.addEventListener('mouseleave', stopScrolling);

// Attach the events to the Right Zone
scrollZoneRight.addEventListener('mouseenter', () => startScrolling(1)); // 1 means scroll right
scrollZoneRight.addEventListener('mouseleave', stopScrolling);


function renderCalendarBand(patches) {


    const band = document.getElementById('calendarBand');
    band.innerHTML = '';
    if (patches.length === 0) return;

    // Use ISO strings for the set to match our filter logic
    const patchDateStrings = new Set();
    patches.forEach(p => {
        patchDateStrings.add(toISODate(p.date));
        if (p.replyDates && p.replyDates.length > 0) {
            p.replyDates.forEach(replyDate => {
                patchDateStrings.add(toISODate(replyDate));
            });
        }
    });

    let minDate = new Date(patches[patches.length - 1].date);
    minDate.setHours(0, 0, 0, 0);
    minDate.setDate(minDate.getDate() - 3);

    let maxDate = new Date();
    maxDate.setHours(0, 0, 0, 0);

    let iterDate = new Date(minDate);
    while (iterDate <= maxDate) {
        iterDate.setHours(0, 0, 0, 0);

        // STANDARD ISO KEY: YYYY-MM-DD
        const dateKey = toISODate(iterDate);
        const hasPatch = patchDateStrings.has(dateKey);

        const dayDiv = document.createElement('div');
        let classes = 'calendar-day';
        if (hasPatch) classes += ' has-patch';

        // Now this comparison actually works!
        if (dateKey === selectedDateFilter) classes += ' selected';
        dayDiv.className = classes;

        const dayName = iterDate.toLocaleDateString(undefined, { weekday: 'short' });
        const dayNumber = iterDate.getDate();
        const monthName = iterDate.toLocaleDateString(undefined, { month: 'short' });

        dayDiv.innerHTML = `
            <div class="day-name">${dayName}</div>
            <div class="day-number">${dayNumber}</div>
            <div class="day-month">${monthName}</div>
        `;

        dayDiv.addEventListener('click', () => {
            if (!hasPatch) return;
            if (selectedDateFilter === dateKey) {
                selectedDateFilter = null;
                document.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('selected'));
            } else {
                selectedDateFilter = dateKey;
                document.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('selected'));
                dayDiv.classList.add('selected');
            }
            applyFilters();
        });

        band.appendChild(dayDiv);
        iterDate.setDate(iterDate.getDate() + 1);
    }

    setTimeout(() => { band.scrollLeft = band.scrollWidth; }, 50);
}

function applyFilters() {
    console.log("CALENDAR SAYS: ", selectedDateFilter);
    const searchTerm = document.getElementById('searchBar')?.value.toLowerCase() || "";
    const targetISO = toISODate(selectedDateFilter);

    console.log("ISO CONVERSION: ", toISODate(selectedDateFilter));

    let filtered = allPatches.filter(patch => {
        const matchesSearch = patch.notes.toLowerCase().includes(searchTerm) ||
            patch.version.toLowerCase().includes(searchTerm);

        if (targetISO) {
            const patchISO = toISODate(patch.date);
            const replyISOs = patch.replyDates ? patch.replyDates.map(rd => toISODate(rd)) : [];

            // Does this patch thread contain the date at all?
            const dateMatch = (patchISO === targetISO) || replyISOs.includes(targetISO);
            return matchesSearch && dateMatch;
        }

        return matchesSearch;
    });

    renderPatches(filtered);
}

function formatFullPatchCard(rawNotes) {
    // Split the posts exactly where the Markdown horizontal rules are (*** or --- or * * *)
    // This safely separates the reversed hotfix replies from the original post!
    const sections = rawNotes.split(/^[\*\-\_ ]{3,}\s*$/m);
    let finalHtml = '';

    sections.forEach((section) => {
        if (section.trim() === '') return; // Skip empty chunks

        let replyHeader = '';
        let contentToParse = section;

        const headerMatch = section.match(/(### Added on [^\n]+)/);
        if (headerMatch) {
            // It's a hotfix reply
            replyHeader = `<h3 class="reply-date-header">${headerMatch[1].replace('### ', '')}</h3>`;
            contentToParse = section.replace(headerMatch[1], '');
        } else {
            // If it doesn't have an "Added on" timestamp, it's the original thread post!
            replyHeader = `<h3 class="reply-date-header" style="color: var(--accent-color);">Original Patch Notes</h3>`;
        }

        finalHtml += replyHeader;
        finalHtml += parseAndGroupMarkdown(contentToParse);
    });

    return finalHtml;
}

document.getElementById('searchBar').addEventListener('input', applyFilters);

// Helper to turn any date string into "YYYY-MM-DD"
const toISODate = (input) => {
    if (!input) return null;

    // 1. Clean the string
    let s = input.toString()
        .replace(/### Added on /i, '')
        .replace(/\b(at)\b/i, '')
        .trim();

    // 2. Try to catch YYYY-MM-DD directly (prevents timezone shifting)
    const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    // 3. For other formats (like "March 6, 2026"), parse and extract locally
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${y}-${m}-${day}`;
};

function renderPatches(patchesToRender) {
    const container = document.getElementById('patchContainer');
    container.innerHTML = '';

    const targetDateISO = toISODate(selectedDateFilter);

    patchesToRender.forEach(patch => {
        const mainThreadISO = toISODate(patch.date);

        // 1. Split the notes
        const sections = patch.notes.split(/(?=### Added on)|(?:\n\s*[\*\-_ ]{3,}\s*\n)/g);

        // 2. SAFETY CHECK: If the first section ALREADY has a header, 
        // it means there is NO "Original Post" text before the hotfixes.
        // If it DOESN'T have a header, it's our original post.
        let visibleContentHtml = '';

        sections.forEach((section) => {
            const trimmed = section.trim();
            // Skip empty chunks or just the separator lines
            if (!trimmed || /^[\*-_ ]{3,}$/.test(trimmed)) return;

            const headerMatch = trimmed.match(/### Added on ([^\n\r]+)/);

            // THE KEY FIX: 
            // If it's a hotfix, use the header date.
            // If it's NOT a hotfix (The Steam Link block), it MUST be the original patch date (March 6).
            const sectionISO = headerMatch ? toISODate(headerMatch[1]) : mainThreadISO;

            console.log(`DEBUG: Section Found [${sectionISO}] | Looking for [${targetDateISO}]`);

            if (!targetDateISO || sectionISO === targetDateISO) {
                let sectionHtml = '';
                let contentToParse = trimmed;

                if (headerMatch) {
                    const displayDate = headerMatch[1].replace(/ at .*/i, '').trim();
                    sectionHtml += `<h3 class="reply-date-header">${displayDate}</h3>`;
                    contentToParse = trimmed.replace(headerMatch[0], '');
                } else {
                    // This is your March 6th block!
                    sectionHtml += `<h3 class="reply-date-header" style="color: var(--accent-color);">Original Patch Notes</h3>`;
                }

                sectionHtml += parseAndGroupMarkdown(contentToParse);
                visibleContentHtml += sectionHtml;
            }
        });

        // 4. Only create the card if there's content to show for this specific day
        if (visibleContentHtml !== '') {
            const card = document.createElement('div');
            card.className = 'patch-card';
            card.innerHTML = `
                <div class="patch-header">
                    <h2 class="patch-title">${patch.version}</h2>
                    <span class="patch-date">Update for ${targetDateISO || "Full Thread"}</span>
                </div>
                <div class="patch-content">
                    ${visibleContentHtml}
                </div>
            `;
            container.appendChild(card);
        }
    });

    updateSidebarStats();
}
function jumpToPatch(direction) {
    // 1. Get unique ISO dates
    const patchDates = Array.from(new Set(allPatches.flatMap(p => {
        const dates = [toISODate(p.date)];
        if (p.replyDates) {
            p.replyDates.forEach(rd => dates.push(toISODate(rd)));
        }
        return dates;
    }))).sort(); // Sorting ISO strings alphabetically also sorts them chronologically

    if (patchDates.length === 0) return;

    // 2. Current selected date (already ISO)
    let currentIndex = patchDates.indexOf(selectedDateFilter);

    let nextIndex;
    if (direction === 'next') {
        nextIndex = (currentIndex === -1) ? 0 : currentIndex + 1;
    } else {
        nextIndex = (currentIndex === -1) ? patchDates.length - 1 : currentIndex - 1;
    }

    // 3. Trigger the click
    if (nextIndex >= 0 && nextIndex < patchDates.length) {
        const targetISO = patchDates[nextIndex];

        // Find the day element and click it
        const days = document.querySelectorAll('.calendar-day');
        days.forEach(day => {
            // We use a data attribute or re-parse to find the right day
            // But the easiest way is to just find the day that matches our targetISO
            // Let's use a quick helper to match the UI elements
            const d = new Date(targetISO + 'T00:00:00'); // Force local time
            const dayNum = d.getDate().toString();
            const monthName = d.toLocaleDateString(undefined, { month: 'short' });

            if (day.querySelector('.day-number').innerText === dayNum &&
                day.querySelector('.day-month').innerText === monthName) {
                day.click();
                day.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        });
    }
}

function updateSidebarStats() {
    // Look at the rendered HTML instead of the raw JSON to get accurate "Today" counts
    const visibleContent = document.getElementById('patchContainer').textContent.toLowerCase();
    let uniqueHeroes = new Set();
    let itemCount = 0;
    let gameplayCount = 0;

    heroKeywords.forEach(hero => {
        if (new RegExp(`\\b${hero}\\b\\s*:`, 'i').test(visibleContent)) {
            uniqueHeroes.add(hero);
        }
    });

    itemKeywords.forEach(item => {
        if (visibleContent.includes(item)) itemCount++;
    });

    gameplayKeywords.forEach(gp => {
        if (visibleContent.includes(gp)) gameplayCount++;
    });

    // Update the UI
    document.getElementById('statHeroes').innerText = uniqueHeroes.size;
    document.getElementById('statItems').innerText = itemCount;
    document.getElementById('statGameplay').innerText = gameplayCount;

    // Generate Mini Portraits
    const heroListPreview = document.getElementById('heroListPreview');
    heroListPreview.innerHTML = '';
    uniqueHeroes.forEach(hero => {
        let fileName = hero === "mo & krill" ? "MoAndKrill" : hero.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        const img = document.createElement('img');
        img.src = `HeroPortraits/88px-${fileName}_card.png`;
        img.className = 'mini-portrait';
        img.title = hero; // Tooltip on hover
        img.onerror = function () { this.style.display = 'none'; };
        heroListPreview.appendChild(img);
    });
}



// Attach listeners to the buttons
document.getElementById('prevPatch').addEventListener('click', () => jumpToPatch('prev'));
document.getElementById('nextPatch').addEventListener('click', () => jumpToPatch('next'));


document.addEventListener('DOMContentLoaded', () => {
    console.log("Button Pressed")
    const header = document.getElementById('stickyHeader');
    const toggleBtn = document.getElementById('headerToggle');

    toggleBtn.addEventListener('click', () => {
        header.classList.toggle('collapsed');

        const isCollapsed = header.classList.contains('collapsed');
        // 60px for the title + 20px buffer vs the full 280px
        document.documentElement.style.scrollPaddingTop = isCollapsed ? "80px" : "280px";
    });
});
