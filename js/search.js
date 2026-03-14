export function handleSearchInput(e) {
    const searchBar = document.getElementById('searchBar');
    if (!searchBar) return;

    const rawQuery = searchBar.value.toLowerCase().trim();
    // Split the search bar by commas so we can check multiple things at once!
    const queries = rawQuery ? rawQuery.split(',').map(q => q.trim()).filter(q => q) : [];

    const container = document.getElementById('patchContainer');
    if (!container) return;

    // Highlight the Sidebar Icons if they match our current search
    document.querySelectorAll('.mini-portrait, .mini-item-icon').forEach(img => {
        const title = img.title.toLowerCase();
        if (queries.length > 0 && queries.some(q => title === q)) {
            img.classList.add('selected-icon');
        } else {
            img.classList.remove('selected-icon');
        }
    });

    // If search is empty, unhide absolutely EVERYTHING
    if (queries.length === 0) {
        container.querySelectorAll('.hidden-by-search').forEach(el => el.classList.remove('hidden-by-search'));
        container.querySelectorAll('.patch-card').forEach(card => card.style.display = 'block');
        return;
    }

    const patchCards = container.querySelectorAll('.patch-card');

    patchCards.forEach(card => {
        let cardHasVisibleContent = false;

        const patchTitle = card.querySelector('.patch-title')?.textContent.toLowerCase() || "";
        const titleMatch = queries.some(q => patchTitle.includes(q));

        const categories = card.querySelectorAll('.patch-category');

        categories.forEach(category => {
            let categoryHasVisibleContent = false;

            // --- 1. SEARCH HERO CARDS ---
            const heroCards = category.querySelectorAll('.hero-card:not(.item-category-card):not(.misc-category-card)');
            heroCards.forEach(heroCard => {
                let heroHasVisibleContent = false;
                const heroName = heroCard.querySelector('.hero-name-img')?.alt.toLowerCase() ||
                    heroCard.querySelector('.hero-name-text')?.textContent.toLowerCase() || "";

                if (queries.some(q => heroName.includes(q))) {
                    heroCard.classList.remove('hidden-by-search');
                    heroCard.querySelectorAll('.hidden-by-search').forEach(el => el.classList.remove('hidden-by-search'));
                    heroCard.setAttribute('open', '');
                    categoryHasVisibleContent = true;
                    return;
                }

                heroCard.querySelectorAll('.hero-general-changes li').forEach(li => {
                    if (queries.some(q => li.textContent.toLowerCase().includes(q))) {
                        li.classList.remove('hidden-by-search');
                        heroHasVisibleContent = true;
                    } else li.classList.add('hidden-by-search');
                });

                heroCard.querySelectorAll('.ability-sub-card').forEach(abilityCard => {
                    let abilityHasVisibleContent = false;
                    const abilityTitle = abilityCard.querySelector('.ability-title')?.textContent.toLowerCase() || "";

                    if (queries.some(q => abilityTitle.includes(q))) {
                        abilityCard.classList.remove('hidden-by-search');
                        abilityCard.querySelectorAll('.hidden-by-search').forEach(el => el.classList.remove('hidden-by-search'));
                        heroHasVisibleContent = true;
                        return;
                    }

                    abilityCard.querySelectorAll('li').forEach(li => {
                        if (queries.some(q => li.textContent.toLowerCase().includes(q))) {
                            li.classList.remove('hidden-by-search');
                            abilityHasVisibleContent = true;
                            heroHasVisibleContent = true;
                        } else li.classList.add('hidden-by-search');
                    });

                    if (abilityHasVisibleContent) abilityCard.classList.remove('hidden-by-search');
                    else abilityCard.classList.add('hidden-by-search');
                });

                if (heroHasVisibleContent) {
                    heroCard.classList.remove('hidden-by-search');
                    heroCard.setAttribute('open', '');
                    categoryHasVisibleContent = true;
                } else heroCard.classList.add('hidden-by-search');
            });

            // --- 2. SEARCH ITEM CARDS ---
            const itemCards = category.querySelectorAll('.item-category-card');
            itemCards.forEach(itemCard => {
                let itemHasVisibleContent = false;
                const itemCategoryName = itemCard.querySelector('.hero-name-text')?.textContent.toLowerCase() || "";

                if (queries.some(q => itemCategoryName.includes(q))) {
                    itemCard.classList.remove('hidden-by-search');
                    itemCard.querySelectorAll('.hidden-by-search').forEach(el => el.classList.remove('hidden-by-search'));
                    itemCard.setAttribute('open', '');
                    categoryHasVisibleContent = true;
                    return;
                }

                itemCard.querySelectorAll('.ability-sub-card').forEach(tierCard => {
                    let tierHasVisibleContent = false;
                    tierCard.querySelectorAll('li').forEach(li => {
                        if (queries.some(q => li.textContent.toLowerCase().includes(q))) {
                            li.classList.remove('hidden-by-search');
                            tierHasVisibleContent = true;
                            itemHasVisibleContent = true;
                        } else li.classList.add('hidden-by-search');
                    });
                    if (tierHasVisibleContent) tierCard.classList.remove('hidden-by-search');
                    else tierCard.classList.add('hidden-by-search');
                });

                if (itemHasVisibleContent) {
                    itemCard.classList.remove('hidden-by-search');
                    itemCard.setAttribute('open', '');
                    categoryHasVisibleContent = true;
                } else itemCard.classList.add('hidden-by-search');
            });

            // --- 3. SEARCH GAMEPLAY / MISC ---
            const gameplayCards = category.querySelectorAll('.misc-category-card, .category-content > .ability-sub-card, .category-content > ul > li, .category-content > p');
            gameplayCards.forEach(el => {
                if (el.classList.contains('ability-sub-card') || el.classList.contains('misc-category-card')) {
                    let gpHasVisible = false;
                    const gpTitle = el.querySelector('.hero-name-text, .ability-title')?.textContent.toLowerCase() || "";

                    if (queries.some(q => gpTitle.includes(q))) {
                        el.classList.remove('hidden-by-search');
                        el.querySelectorAll('.hidden-by-search').forEach(child => child.classList.remove('hidden-by-search'));
                        categoryHasVisibleContent = true;
                        return;
                    }

                    el.querySelectorAll('li').forEach(li => {
                        if (queries.some(q => li.textContent.toLowerCase().includes(q))) {
                            li.classList.remove('hidden-by-search');
                            gpHasVisible = true;
                            categoryHasVisibleContent = true;
                        } else li.classList.add('hidden-by-search');
                    });

                    if (gpHasVisible) el.classList.remove('hidden-by-search');
                    else el.classList.add('hidden-by-search');
                } else {
                    if (queries.some(q => el.textContent.toLowerCase().includes(q))) {
                        el.classList.remove('hidden-by-search');
                        categoryHasVisibleContent = true;
                    } else el.classList.add('hidden-by-search');
                }
            });

            // --- WRAP UP CATEGORY ---
            if (titleMatch) categoryHasVisibleContent = true;

            if (categoryHasVisibleContent) {
                category.classList.remove('hidden-by-search');
                category.setAttribute('open', '');
                cardHasVisibleContent = true;
            } else category.classList.add('hidden-by-search');
        });

        // --- WRAP UP PATCH CARD ---
        if (cardHasVisibleContent || titleMatch) card.style.display = 'block';
        else card.style.display = 'none';
    });

    // --- NEW: Check for Empty State ---
    const noResultsState = document.getElementById('noResultsState');
    const searchQueryDisplay = document.getElementById('searchQueryDisplay');

    // Count how many patches are actually being displayed
    let visiblePatchCount = 0;
    patchCards.forEach(card => {
        if (card.style.display !== 'none') visiblePatchCount++;
    });

    if (queries.length > 0 && visiblePatchCount === 0) {
        // Show the empty state and update the text
        noResultsState.style.display = 'block';
        searchQueryDisplay.textContent = queries.join(', ');
    } else {
        // Hide it if there are results or no search query
        noResultsState.style.display = 'none';
    }
}

// --- HELPER: Focus from Sidebar ---
let lastClickedEntity = null; // Track this for Shift-Click ranges

export function focusOnEntity(e, entityName, entityList) {
    const searchBar = document.getElementById('searchBar');
    if (!searchBar) return;

    let currentVal = searchBar.value;
    let currentSelections = currentVal ? currentVal.split(',').map(s => s.trim()).filter(s => s) : [];

    if (e.shiftKey && lastClickedEntity && entityList.includes(lastClickedEntity)) {
        // Range Selection
        const startIndex = entityList.indexOf(lastClickedEntity);
        const endIndex = entityList.indexOf(entityName);
        const min = Math.min(startIndex, endIndex);
        const max = Math.max(startIndex, endIndex);
        const range = entityList.slice(min, max + 1);

        range.forEach(item => {
            if (!currentSelections.includes(item)) currentSelections.push(item);
        });
    } else if (e.ctrlKey || e.metaKey) {
        // Toggle (Add/Remove) via Ctrl
        if (currentSelections.includes(entityName)) {
            currentSelections = currentSelections.filter(i => i !== entityName);
        } else {
            currentSelections.push(entityName);
        }
    } else {
        // --- UPDATED: Standard Click ---
        if (currentSelections.includes(entityName)) {
            // If it's already selected, just turn THIS one off (leave others alone)
            currentSelections = currentSelections.filter(i => i !== entityName);
        } else {
            // If it's a new selection, clear everything else and select only this one
            currentSelections = [entityName];
        }
    }

    lastClickedEntity = entityName;

    // Inject the new comma-separated string into the search bar and fire it
    searchBar.value = currentSelections.join(', ');
    searchBar.dispatchEvent(new Event('input'));

    // Only scroll up if it's a standard single click. 
    // If they are holding Ctrl/Shift, we don't want to violently rip them away from the sidebar!
    if (!e.ctrlKey && !e.shiftKey && currentSelections.length > 0) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}