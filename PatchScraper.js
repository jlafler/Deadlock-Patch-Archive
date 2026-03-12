const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const TurndownService = require('turndown');

const turndownService = new TurndownService();
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// NEW: Check if the user typed '--force' in the terminal
const forceScrape = process.argv.includes('--force');

async function scrapeAllPatchDetails() {
    try {
        const rawUrlData = fs.readFileSync('patch_urls.json');
        const patchList = JSON.parse(rawUrlData);

        let existingNotesMap = {};
        if (fs.existsSync('all_patch_notes.json')) {
            const rawExistingData = fs.readFileSync('all_patch_notes.json');
            const existingArray = JSON.parse(rawExistingData);
            existingArray.forEach(patch => {
                existingNotesMap[patch.url] = patch;
            });
        }

        if (forceScrape) {
            console.log('⚠️ FORCE SCRAPE ENABLED: Ignoring cached data and fetching all pages...\n');
        }

        console.log(`Loaded ${patchList.length} patches to check...`);
        const fullPatchNotes = [];

        for (let i = 0; i < patchList.length; i++) {
            const patch = patchList[i];
            const existingPatch = existingNotesMap[patch.url];

            // NEW: Add 'forceScrape' to the condition. If it's true, it bypasses the skip check.
            if (forceScrape || !existingPatch || existingPatch.replyCount !== patch.replyCount) {
                console.log(`[${i + 1}/${patchList.length}] ⬇️ FETCHING: ${patch.version}`);

                try {
                    const response = await axios.get(patch.url);
                    const $ = cheerio.load(response.data);

                    // NEW: We use an array to collect the posts instead of a single string
                    let postsArray = [];
                    const firstPost = $('.message').first();
                    const threadCreator = firstPost.attr('data-author');

                    patch.replyDates = [];

                    $('.message').each((index, element) => {
                        if ($(element).attr('data-author') === threadCreator) {
                            const postHtml = $(element).find('.bbWrapper').html();
                            const postDateStr = $(element).find('time').attr('datetime');
                            let dateLabel = '';

                            if (postDateStr) {
                                const dateObj = new Date(postDateStr);
                                dateLabel = dateObj.toLocaleDateString(undefined, {
                                    year: 'numeric', month: 'long', day: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                });

                                if (index > 0) {
                                    patch.replyDates.push(postDateStr);
                                }
                            } else {
                                dateLabel = 'Later Update';
                            }

                            if (postHtml) {
                                // Push each chunk of HTML into our array
                                if (index === 0) {
                                    postsArray.push(postHtml);
                                } else {
                                    postsArray.push(`<h3>Added on ${dateLabel}</h3><br>${postHtml}`);
                                }
                            }
                        }
                    });

                    // NEW: Flip the array upside down so the newest reply is first!
                    postsArray.reverse();

                    // NEW: Join the array back into a single string, putting dividers between them
                    let combinedHtml = postsArray.join('<br><br><hr><br><br>');

                    patch.notes = combinedHtml ? turndownService.turndown(combinedHtml) : "Content not found.";
                    fullPatchNotes.push(patch);

                } catch (err) {
                    console.error(`  -> Failed to scrape ${patch.url}:`, err.message);
                }

                if (i < patchList.length - 1) await sleep(2000);

            } else {
                console.log(`[${i + 1}/${patchList.length}] ⏭️ SKIPPING (Up to date): ${patch.version}`);
                fullPatchNotes.push(existingPatch);
            }
        }

        fs.writeFileSync('all_patch_notes.json', JSON.stringify(fullPatchNotes, null, 2));
        console.log('\n🎉 Success! Database updated.');

    } catch (error) {
        console.error('Error in main scrape loop:', error.message);
    }
}

scrapeAllPatchDetails();