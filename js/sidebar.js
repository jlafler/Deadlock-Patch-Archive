import { focusOnEntity } from './search.js';

export function updateSidebarStats() {
    const container = document.getElementById('patchContainer');
    if (!container) return;

    let uniqueHeroes = new Set();
    let uniqueItems = new Set();
    let gameplayCount = 0;

    // 1. Count Unique Heroes
    const heroCards = container.querySelectorAll('.hero-card:not(.item-category-card):not(.misc-category-card)');
    heroCards.forEach(card => {
        const img = card.querySelector('.hero-name-img');
        if (img && img.alt) uniqueHeroes.add(img.alt);
        else {
            const textSpan = card.querySelector('.hero-name-text');
            if (textSpan) uniqueHeroes.add(textSpan.textContent.trim());
        }
    });

    // 2. Count Unique Items
    const itemCards = container.querySelectorAll('.item-category-card');
    itemCards.forEach(card => {
        const strongTags = card.querySelectorAll('.ability-base-changes li strong');
        strongTags.forEach(strong => uniqueItems.add(strong.textContent.trim()));
    });

    // 3. Count Gameplay Categories
    const patchCategories = container.querySelectorAll('.patch-category');
    patchCategories.forEach(cat => {
        const summary = cat.querySelector('summary');
        if (summary && summary.textContent.trim() === 'Gameplay Changes') {
            const gpCards = cat.querySelectorAll('.ability-sub-card');
            gameplayCount += gpCards.length;
        }
    });

    // Update DOM texts
    const statH = document.getElementById('statHeroes');
    if (statH) statH.innerText = uniqueHeroes.size;

    const statI = document.getElementById('statItems');
    if (statI) statI.innerText = uniqueItems.size;

    const statG = document.getElementById('statGameplay');
    if (statG) statG.innerText = gameplayCount;

    // --- NEW: Convert Sets to Arrays to establish a selectable "Range" order ---
    const renderedHeroes = Array.from(uniqueHeroes);
    const renderedItems = Array.from(uniqueItems);

    // Update Hero Preview Images
    const heroListPreview = document.getElementById('heroListPreview');
    if (heroListPreview) {
        heroListPreview.innerHTML = '';
        renderedHeroes.forEach(hero => {
            let fileName = hero.toLowerCase() === "mo & krill" ? "MoAndKrill" :
                hero.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

            const img = document.createElement('img');
            img.loading = 'lazy'; // <-- ADD THIS LINE
            img.src = `Resources/HeroPortraits/88px-${fileName.toLowerCase()}_card.png`;
            img.className = 'mini-portrait';
            img.title = hero;
            img.onerror = function () { this.style.display = 'none'; };
            // Pass the event and the hero array!
            img.onclick = (e) => focusOnEntity(e, hero, renderedHeroes);

            heroListPreview.appendChild(img);
        });
    }

    // Update Item Preview Images
    const itemListPreview = document.getElementById('itemListPreview');
    if (itemListPreview) {
        itemListPreview.innerHTML = '';
        renderedItems.forEach(itemName => {
            let fileName = itemName.replace(/ /g, '_').toLowerCase;

            const img = document.createElement('img');
            img.loading = 'lazy'; // <-- ADD THIS LINE
            img.src = `Resources/ItemIcons/50px-${fileName.toLowerCase()}.png`;
            img.className = 'mini-item-icon';
            img.title = itemName;
            img.onerror = function () { this.style.display = 'none'; };
            // Pass the event and the item array!
            img.onclick = (e) => focusOnEntity(e, itemName, renderedItems);

            itemListPreview.appendChild(img);
        });
    }
}