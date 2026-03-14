// js/state.js
import { toISODate } from './utils.js';

export const state = {
    allPatches: [],
    selectedDates: [], // <-- UPGRADED TO AN ARRAY
    heroKeywords: [],
    itemKeywords: [],
    gameplayKeywords: [],
    abilityKeywords: [],
    itemObjects: []
};

export async function loadData() {
    try {
        const [heroesRes, itemsRes, gameplayRes, abilitiesRes] = await Promise.all([
            fetch('heroes.txt'),
            fetch('items.json'),
            fetch('gameplay.txt'),
            fetch('abilities.txt')
        ]);

        const heroesText = await heroesRes.text();
        const gameplayText = await gameplayRes.text();
        const abilitiesText = await abilitiesRes.text();

        state.itemObjects = await itemsRes.json();
        state.heroKeywords = heroesText.split('\n').map(k => k.trim().toLowerCase()).filter(k => k);
        state.gameplayKeywords = gameplayText.split('\n').map(k => k.trim().toLowerCase()).filter(k => k);
        state.abilityKeywords = abilitiesText.split('\n').map(k => k.trim().toLowerCase()).filter(k => k);
        state.itemKeywords = state.itemObjects.map(item => item.name.toLowerCase());

        const response = await fetch('all_patch_notes.json');
        state.allPatches = await response.json();
        state.allPatches.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (state.allPatches.length > 0) {
            let newestDate = new Date(state.allPatches[0].date);
            if (state.allPatches[0].replyDates && state.allPatches[0].replyDates.length > 0) {
                const lastReply = new Date(state.allPatches[0].replyDates[state.allPatches[0].replyDates.length - 1]);
                if (lastReply > newestDate) newestDate = lastReply;
            }
            // Put the initial date into our new array!
            state.selectedDates = [toISODate(newestDate)];
        }

        return true;
    } catch (error) {
        console.error("Error loading files:", error);
        return false;
    }
}