import { state } from './state.js';
import { toISODate } from './utils.js';
import { applyFilters } from './render.js';

let scrollAnimationId;
const scrollSpeed = 5;
let lastClickedDate = null;

export function setupCalendarScrolling() {
    const calendarBand = document.getElementById('calendarBand');
    const scrollZoneLeft = document.getElementById('scrollZoneLeft');
    const scrollZoneRight = document.getElementById('scrollZoneRight');

    if (!calendarBand) return;

    // Horizontal Mousewheel Scroll
    calendarBand.addEventListener('wheel', (evt) => {
        evt.preventDefault();
        calendarBand.scrollLeft += evt.deltaY;
    }, { passive: false });

    // Hover Scrolling logic
    function startScrolling(direction) {
        function scrollStep() {
            calendarBand.scrollLeft += direction * scrollSpeed;
            scrollAnimationId = requestAnimationFrame(scrollStep);
        }
        scrollAnimationId = requestAnimationFrame(scrollStep);
    }

    function stopScrolling() {
        cancelAnimationFrame(scrollAnimationId);
    }

    scrollZoneLeft?.addEventListener('mouseenter', () => startScrolling(-1));
    scrollZoneLeft?.addEventListener('mouseleave', stopScrolling);

    scrollZoneRight?.addEventListener('mouseenter', () => startScrolling(1));
    scrollZoneRight?.addEventListener('mouseleave', stopScrolling);
}

export function renderCalendarBand(patches) {
    const band = document.getElementById('calendarBand');
    if (!band || patches.length === 0) return;

    band.innerHTML = '';

    const patchDateStrings = new Set();
    patches.forEach(p => {
        patchDateStrings.add(toISODate(p.date));
        if (p.replyDates && p.replyDates.length > 0) {
            p.replyDates.forEach(replyDate => patchDateStrings.add(toISODate(replyDate)));
        }
    });

    // Create a sorted list of valid patch dates so we can easily select ranges
    const validDatesArray = Array.from(patchDateStrings).sort();

    let minDate = new Date(patches[patches.length - 1].date);
    minDate.setHours(0, 0, 0, 0);
    minDate.setDate(minDate.getDate() - 3);

    let maxDate = new Date();
    maxDate.setHours(0, 0, 0, 0);

    let iterDate = new Date(minDate);
    while (iterDate <= maxDate) {
        iterDate.setHours(0, 0, 0, 0);

        const dateKey = toISODate(iterDate);
        const hasPatch = patchDateStrings.has(dateKey);

        const dayDiv = document.createElement('div');
        dayDiv.dataset.date = dateKey; // <-- NEW: Store the date directly on the element

        let classes = 'calendar-day';
        if (hasPatch) classes += ' has-patch';
        if (state.selectedDates.includes(dateKey)) classes += ' selected';

        dayDiv.className = classes;

        const dayName = iterDate.toLocaleDateString(undefined, { weekday: 'short' });
        const dayNumber = iterDate.getDate();
        const monthName = iterDate.toLocaleDateString(undefined, { month: 'short' });

        dayDiv.innerHTML = `
            <div class="day-name">${dayName}</div>
            <div class="day-number">${dayNumber}</div>
            <div class="day-month">${monthName}</div>
        `;

        dayDiv.addEventListener('click', (e) => {
            if (!hasPatch) return;

            if (e.shiftKey && lastClickedDate) {
                // Range Selection
                const startIndex = validDatesArray.indexOf(lastClickedDate);
                const endIndex = validDatesArray.indexOf(dateKey);

                if (startIndex !== -1 && endIndex !== -1) {
                    const min = Math.min(startIndex, endIndex);
                    const max = Math.max(startIndex, endIndex);
                    const range = validDatesArray.slice(min, max + 1);

                    range.forEach(d => {
                        if (!state.selectedDates.includes(d)) state.selectedDates.push(d);
                    });
                }
            } else if (e.ctrlKey || e.metaKey) {
                // Multi-Selection Toggle
                if (state.selectedDates.includes(dateKey)) {
                    state.selectedDates = state.selectedDates.filter(d => d !== dateKey);
                } else {
                    state.selectedDates.push(dateKey);
                }
            } else {
                // Standard Single Click (Toggles off if clicked twice)
                if (state.selectedDates.length === 1 && state.selectedDates[0] === dateKey) {
                    state.selectedDates = [];
                } else {
                    state.selectedDates = [dateKey];
                }
            }

            lastClickedDate = dateKey;

            // Instantly update UI without rebuilding the HTML
            document.querySelectorAll('.calendar-day').forEach(el => {
                if (state.selectedDates.includes(el.dataset.date)) el.classList.add('selected');
                else el.classList.remove('selected');
            });

            const searchBar = document.getElementById('searchBar');
            const clearBtn = document.getElementById('clearSearchBtn');
            if (searchBar && searchBar.value !== '') {
                searchBar.value = '';
                if (clearBtn) clearBtn.style.display = 'none';
                searchBar.dispatchEvent(new Event('input'));
            }

            applyFilters();
        });

        band.appendChild(dayDiv);
        iterDate.setDate(iterDate.getDate() + 1);
    }

    setTimeout(() => { band.scrollLeft = band.scrollWidth; }, 50);
}

export function jumpToPatch(direction) {
    const patchDates = Array.from(new Set(state.allPatches.flatMap(p => {
        const dates = [toISODate(p.date)];
        if (p.replyDates) p.replyDates.forEach(rd => dates.push(toISODate(rd)));
        return dates;
    }))).sort();

    if (patchDates.length === 0) return;

    // Base the jump off the first date currently selected
    let currentAnchor = state.selectedDates.length > 0 ? state.selectedDates[0] : null;
    let currentIndex = patchDates.indexOf(currentAnchor);
    let nextIndex;

    if (direction === 'next') {
        nextIndex = (currentIndex === -1) ? 0 : currentIndex + 1;
    } else {
        nextIndex = (currentIndex === -1) ? patchDates.length - 1 : currentIndex - 1;
    }

    if (nextIndex >= 0 && nextIndex < patchDates.length) {
        const targetISO = patchDates[nextIndex];
        const days = document.querySelectorAll('.calendar-day');

        // Cleanest way to jump: Find the element, click it, and scroll it into view
        days.forEach(day => {
            if (day.dataset.date === targetISO) {
                day.click();
                day.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        });
    }
}