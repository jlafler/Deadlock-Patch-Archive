export function toISODate(input) {
    if (!input) return null;

    let s = input.toString()
        .replace(/### Added on /i, '')
        .replace(/\b(at)\b/i, '')
        .trim();

    const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    const d = new Date(s);
    if (isNaN(d.getTime())) return null;

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${y}-${m}-${day}`;
}

// --- HELPER: Force Animation Restart ---
export function forceAnimationRestart(detailsElement) {
    // Find every animated block inside the card that is about to open
    const animatedElements = detailsElement.querySelectorAll('.category-content, .hero-card-content, .ability-sub-card');

    animatedElements.forEach(el => {
        // 1. Instantly turn off the CSS animation
        el.style.animation = 'none';

        // 2. Ask the browser to calculate the height. 
        // (This invisible step forces the browser to dump its cache and redraw!)
        void el.offsetHeight;

        // 3. Erase the inline style so the CSS stylesheet takes over and plays the animation again
        el.style.animation = '';
    });
}