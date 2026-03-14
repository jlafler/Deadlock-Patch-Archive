import { loadData, state } from './state.js';
import { setupCalendarScrolling, renderCalendarBand, jumpToPatch } from './calendar.js';
import { applyFilters, toggleAllDetails } from './render.js';
import { handleSearchInput } from './search.js';
import { toISODate, forceAnimationRestart } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("App Initializing (Modules Mode)...");

    // 1. Fetch all data into state.js
    const dataLoaded = await loadData();

    if (!dataLoaded) {
        document.getElementById('patchContainer').innerHTML = '<p>Error loading patch notes.</p>';
        return;
    }

    console.log("Data loaded successfully!");

    // 2. Setup Base UI Listeners
    setupEventListeners();
    setupBackToTop();

    // 3. Initial Render
    renderCalendarBand(state.allPatches);
    applyFilters();
});

function setupEventListeners() {
    // Header Toggle - Using 'stickyHeader' consistently
    const header = document.getElementById('stickyHeader');
    const toggleBtn = document.getElementById('headerToggle');

    if (toggleBtn && header) {
        toggleBtn.addEventListener('click', () => {
            header.classList.toggle('collapsed');
            const isCollapsed = header.classList.contains('collapsed');

            // Adjust scroll padding for jumping to dates
            document.documentElement.style.scrollPaddingTop = isCollapsed ? "80px" : "280px";

            // Wait for the CSS transition to finish (usually 0.3s) before measuring
            setTimeout(() => {
                updateStickyOffset();
            }, 300);
        });
    }

    // Search Bar & Clear Button
    const searchBar = document.getElementById('searchBar');
    const clearBtn = document.getElementById('clearSearchBtn');

    if (searchBar) {
        searchBar.addEventListener('input', (e) => {
            handleSearchInput(e);
            if (clearBtn) {
                clearBtn.style.display = searchBar.value.length > 0 ? 'block' : 'none';
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (searchBar) {
                searchBar.value = '';
                searchBar.dispatchEvent(new Event('input'));
            }
        });
    }

    // Expand/Collapse All Button
    const toggleAllBtn = document.getElementById('toggleAllBtn');
    if (toggleAllBtn) {
        toggleAllBtn.addEventListener('click', toggleAllDetails);
    }

    // Navigation Buttons
    document.getElementById('prevPatch')?.addEventListener('click', () => jumpToPatch('prev'));
    document.getElementById('nextPatch')?.addEventListener('click', () => jumpToPatch('next'));

    // Calendar Mouse/Hover Events
    setupCalendarScrolling();

    // --- UPDATED: Accordion Animation Manager (Open & Close) ---
    document.addEventListener('click', (e) => {
        const summary = e.target.closest('summary');
        if (summary) {
            const details = summary.parentElement;

            // IF CLOSED: It's about to open. Force the reflow and let the browser handle it natively.
            if (!details.open) {
                forceAnimationRestart(details);
            }
            // IF OPEN: It's about to close. We must intercept it to play the animation!
            else {
                e.preventDefault(); // Stop the browser from instantly hiding the content

                // --- NEW: Grab the content box to physically shrink its layout height ---
                const content = details.querySelector('.category-content, .hero-card-content');
                if (content) {
                    // Lock in the exact current pixel height
                    content.style.height = content.offsetHeight + 'px';
                    content.style.overflow = 'hidden';

                    // Force the browser to register the height before we change it
                    void content.offsetHeight;

                    // Shrink height and padding to 0 smoothly!
                    content.style.transition = 'all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)';
                    content.style.height = '0px';
                    content.style.paddingTop = '0px';
                    content.style.paddingBottom = '0px';
                    content.style.marginTop = '0px';
                    content.style.marginBottom = '0px';
                }

                details.classList.add('closing'); // Trigger our reverse CSS animation

                // Wait exactly 250ms before actually closing it
                setTimeout(() => {
                    details.removeAttribute('open');
                    details.classList.remove('closing');

                    // Clean up all the inline styles so it opens normally next time!
                    if (content) content.removeAttribute('style');
                }, 250);
            }
        }
    });
}

function setupBackToTop() {
    const backToTopBtn = document.getElementById('backToTopBtn');
    if (!backToTopBtn) return;

    // Listen for scroll events on the whole window
    window.addEventListener('scroll', () => {
        // If they scroll down more than 400 pixels, show the button
        if (window.scrollY > 400) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    });

    // When clicked, smoothly scroll back to the very top
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

function updateStickyOffset() {
    // Ensure this matches the ID of your actual header container
    const topBar = document.getElementById('stickyHeader');
    if (!topBar) return;

    // Get the physical height of the header right now
    const currentHeight = topBar.offsetHeight;

    // Update the CSS variable for your sticky patch/hero headers
    document.documentElement.style.setProperty('--sticky-offset', `${currentHeight}px`);
}