const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const baseURL = 'https://forums.playdeadlock.com';
const forumPath = '/forums/changelog.10/';
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


// --- NEW: Disguise the bot and add Authentication ---
const requestConfig = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        // This pulls your login cookie from GitHub Secrets safely
        'Cookie': process.env.DEADLOCK_COOKIE || ''
    }
};

async function scrapeAllPages() {
    try {
        let currentPage = 1;
        let totalPages = 1;
        const allPatchThreads = [];

        console.log('Starting multi-page scrape...');

        while (currentPage <= totalPages) {
            const targetURL = currentPage === 1
                ? baseURL + forumPath
                : baseURL + forumPath + `page-${currentPage}`;

            console.log(`Fetching Page ${currentPage} of ${totalPages || '?'}: ${targetURL}`);

            // NEW: Pass the headers into the axios request
            const response = await axios.get(targetURL, requestConfig);
            const $ = cheerio.load(response.data);

            if (currentPage === 1) {
                const lastPageText = $('.pageNav-main .pageNav-page').last().text().trim();
                if (lastPageText) totalPages = parseInt(lastPageText, 10);
            }

            $('.structItem--thread').each((index, element) => {
                const titleElement = $(element).find('.structItem-title a');
                const title = titleElement.text().trim();
                const relativeLink = titleElement.attr('href');
                const fullLink = baseURL + relativeLink;
                const dateStr = $(element).find('.structItem-startDate time').attr('datetime');

                // NEW: Grab the reply count!
                const replyText = $(element).find('.structItem-cell--meta dl').first().find('dd').text().trim();
                // Convert text like "2" or "1,000" into a clean integer
                const replyCount = parseInt(replyText.replace(/,/g, ''), 10) || 0;

                if (title && title.includes('Update')) {
                    allPatchThreads.push({
                        version: title,
                        date: dateStr,
                        url: fullLink,
                        replyCount: replyCount // Save it to the JSON
                    });
                }
            });

            currentPage++;
            if (currentPage <= totalPages) await sleep(2000);
        }

        fs.writeFileSync('patch_urls.json', JSON.stringify(allPatchThreads, null, 2));
        console.log(`Saved ${allPatchThreads.length} links to patch_urls.json`);

    } catch (error) {
        console.error('Error Scraping Forum:', error.message);
    }
}

scrapeAllPages();