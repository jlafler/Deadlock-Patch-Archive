import { state } from './state.js';
import { toISODate, forceAnimationRestart } from './utils.js';
import { parseAndGroupMarkdown } from './parser.js';
import { updateSidebarStats } from './sidebar.js';

export function applyFilters() {
    let filtered = state.allPatches;

    // If dates are selected, filter the patches. If empty array, show all of them!
    if (state.selectedDates.length > 0) {
        filtered = state.allPatches.filter(patch => {
            const patchISO = toISODate(patch.date);
            const replyISOs = patch.replyDates ? patch.replyDates.map(rd => toISODate(rd)) : [];

            // Returns true if ANY of the selected dates match the patch or its replies
            return state.selectedDates.includes(patchISO) || replyISOs.some(r => state.selectedDates.includes(r));
        });
    }

    renderPatches(filtered);
}

export function renderPatches(patchesToRender) {
    const container = document.getElementById('patchContainer');
    if (!container) return;

    container.innerHTML = '';

    patchesToRender.forEach(patch => {
        const mainThreadISO = toISODate(patch.date);
        const sections = patch.notes.split(/(?=### Added on)|(?:\n\s*[\*\-_ ]{3,}\s*\n)/g);
        let visibleContentHtml = '';

        sections.forEach((section) => {
            const trimmed = section.trim();
            if (!trimmed || /^[\*-_ ]{3,}$/.test(trimmed)) return;

            const headerMatch = trimmed.match(/### Added on ([^\n\r]+)/);
            const sectionISO = headerMatch ? toISODate(headerMatch[1]) : mainThreadISO;

            // Only render this specific section if its date is in our selected array
            if (state.selectedDates.length === 0 || state.selectedDates.includes(sectionISO)) {
                let sectionHtml = '';
                let contentToParse = trimmed;

                if (headerMatch) {
                    const displayDate = headerMatch[1].replace(/ at .*/i, '').trim();
                    sectionHtml += `<h3 class="reply-date-header">${displayDate}</h3>`;
                    contentToParse = trimmed.replace(headerMatch[0], '');
                } else {
                    sectionHtml += `<h3 class="reply-date-header" style="color: var(--accent-color);">Original Patch Notes</h3>`;
                }

                sectionHtml += parseAndGroupMarkdown(contentToParse);
                visibleContentHtml += sectionHtml;
            }
        });

        if (visibleContentHtml !== '') {
            // Dynamically change the sub-header string depending on how many days are selected
            let displayDateString = "Full Thread";
            if (state.selectedDates.length === 1) displayDateString = `Update for ${state.selectedDates[0]}`;
            else if (state.selectedDates.length > 1) displayDateString = `Selected Updates (${state.selectedDates.length} Days)`;

            const card = document.createElement('div');
            card.className = 'patch-card';
            card.innerHTML = `
                <div class="patch-header">
                    <h2 class="patch-title">
                        <a href="${patch.url}" target="_blank" class="patch-title-link">
                            ${patch.version}
                        </a>
                    </h2>
                    <span class="patch-date">${displayDateString}</span>
                </div>
                <div class="patch-content">
                    ${visibleContentHtml}
                </div>
            `;
            container.appendChild(card);
        }
    });

    const toggleAllBtn = document.getElementById('toggleAllBtn');
    if (toggleAllBtn) toggleAllBtn.innerText = 'Expand All';

    updateSidebarStats();
}
export function toggleAllDetails() {
    const toggleAllBtn = document.getElementById('toggleAllBtn');
    const allDetails = document.querySelectorAll('#patchContainer details');
    const anyClosed = Array.from(allDetails).some(detail => !detail.hasAttribute('open'));

    if (anyClosed) {
        // --- EXPAND ALL ---
        allDetails.forEach(detail => {
            if (!detail.hasAttribute('open')) {
                forceAnimationRestart(detail);
                detail.setAttribute('open', '');
            }
        });
        if (toggleAllBtn) toggleAllBtn.innerText = 'Collapse All';
    } else {
        allDetails.forEach(detail => {
            if (detail.hasAttribute('open')) {

                // --- NEW: Apply the physical height shrink to the Expand All logic ---
                const content = detail.querySelector('.category-content, .hero-card-content');
                if (content) {
                    content.style.height = content.offsetHeight + 'px';
                    content.style.overflow = 'hidden';
                    void content.offsetHeight;

                    content.style.transition = 'all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)';
                    content.style.height = '0px';
                    content.style.paddingTop = '0px';
                    content.style.paddingBottom = '0px';
                    content.style.marginTop = '0px';
                    content.style.marginBottom = '0px';
                }

                detail.classList.add('closing'); // Play reverse animation

                setTimeout(() => {
                    detail.removeAttribute('open');
                    detail.classList.remove('closing');
                    if (content) content.removeAttribute('style');
                }, 250);
            }
        });
    }
}