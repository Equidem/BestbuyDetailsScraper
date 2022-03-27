/**
 * This template is a production ready boilerplate for developing with `PuppeteerCrawler`.
 * Use this to bootstrap your projects using the most up-to-date code.
 * If you're looking for examples or want to learn more, see README.
 */

const Apify = require('apify');
const { handleStart, handleList, handleDetail } = require('./src/routes');

const { utils: { log } } = Apify;
//var input = require('./apify_storage/key_value_stores/default/INPUT.json');

async function loadStopper(crawlingContext) {
    await new Promise(resolve => setTimeout(resolve, 30000));
    await crawlingContext.page._client.send("Page.stopLoading");
    await crawlingContext.page.evaluate(_ => window.stop());
}

async function pageFunction(context) {
    console.log("Running page function");
    const { page } = context;
    await Apify.utils.puppeteer.injectJQuery(page);
    const { url } = context.request;

    console.log("Running page function before stopping");

    await page.evaluate(_ => window.stop());

    console.log("Running page function after stopping");

    const { selector_name, name } = await page.evaluate(() => {
        let selector_name = '.sku-title';
        let name = $(selector_name).text();

        if (name) {
            name = name.trim();
        } else {
            name = '';
            selector_name = '';
        }

        return { selector_name, name };
    });

    console.log("Running page function after name");

    const shortDescription = '';
    const selector_shortDescription = '';

    const { selector_price, price } = await page.evaluate(() => {
        let selector_price = 'div:has(> div.priceView-hero-price)';
        let price = $(selector_price).text();

        if (price) {
            price = price.trim();
        } else {
            price = '';
            selector_price = '';
        }

        return { selector_price, price };
    });

    console.log("Running page function after price");

    const { selector_category, category } = await page.evaluate(() => {
        let selector_category = 'div:has(> div:has(> div:has(> div.shop-breadcrumb)))';
        let category = $('div.shop-breadcrumb a').toArray().map((a) => $(a).text());

        if (category.length == 0) {
            category = '';
            selector_category = '';
        }

        return { selector_category, category };
    });

    console.log("Running page after category");

    const { selector_longDescription, longDescription } = await page.evaluate(() => {
        let selector_longDescription = 'div:has(> .shop-overview-accordion)';
        let longDescription = $(selector_longDescription).text();

        if (longDescription) {
            longDescription = longDescription.trim();
        } else {
            longDescription = '';
            selector_longDescription = '';
        }

        return { selector_longDescription, longDescription };
    });

    console.log("Running page after longDescription");

    const { selector_images, images } = await page.evaluate(() => {
        let selector_images = 'div:has(> .shop-media-gallery)';
        let images = $(selector_images + ' img').toArray().map((img) => img.src);

        if (images.length == 0) {
            images = '';
            selector_images = '';
        }

        return { selector_images, images };
    });

    console.log("Running page function3");

    const { selector_specification, specification } = await page.evaluate(() => {
        let selector_specification = '.specifications-accordion-wrapper';
        let specification = $(selector_specification + ' li').toArray()
            .map((div) => {
                const parameters = {};
                parameters.key = $(div).find('.row-title').text();
                parameters.value = $(div).find('.row-value').text();
                return parameters;
            }).filter((item) => item.key);

        if (specification.length == 0) {
            specification = '';
            selector_specification = '';
        }

        return { selector_specification, specification };
    });

    console.log({
        selector_category,
        selector_images,
        selector_longDescription,
        selector_name,
        selector_price,
        selector_shortDescription,
        selector_specification,
        url,
        name,
        shortDescription,
        price,
        category,
        images,
        specification,
        longDescription,
    });

    const html = await page.evaluate(() => document.querySelector('*').outerHTML);

    // Print some information to actor log
    console.log(`Scraping information about ${name} from ${context.request.url}`);

    // Return an object with the data extracted from the page.
    // It will be stored to the resulting dataset.
    return {
        selector_category,
        selector_images,
        selector_longDescription,
        selector_name,
        selector_price,
        selector_shortDescription,
        selector_specification,
        url,
        name,
        shortDescription,
        price,
        category,
        images,
        specification,
        longDescription,
        html,
    };
}

Apify.main(async () => {
    input = await Apify.getInput();
    //console.log(input);
    const startUrls = input['startUrls'];

    const requestList = await Apify.openRequestList('start-urls', startUrls);
    const requestQueue = await Apify.openRequestQueue();
    const proxyConfiguration = await Apify.createProxyConfiguration();


    const crawler = new Apify.PuppeteerCrawler({
        requestList,
        requestQueue,
        proxyConfiguration,
        launchContext: {
            // Chrome with stealth should work for most websites.
            // If it doesn't, feel free to remove this.
            useChrome: false,
            stealth: false,
        },
        handlePageFunction: pageFunction,
        maxConcurrency: 200,
        navigationTimeoutSecs: 120,
        preNavigationHooks: [
            async (crawlingContext) => {
                loadStopper(crawlingContext);
            },
            async ({ request, page, session }, gotoOptions) => {
                gotoOptions.waitUntil = "load";
            },
            async ({ request, page, session }, gotoOptions) => {
                const getMissingCookiesFromSession = (session, cookies, url) => {
                    const sessionCookies = session.getPuppeteerCookies(url);
                    return cookies.filter((c) => {
                        const sessionHasCookie = sessionCookies.some((sc) => sc.name === c.name);
                        return !sessionHasCookie;
                    });
                };

                // Add initial cookies, if any.
                if (input.initialCookies && input.initialCookies.length) {
                    console.log("adding cookies");
                    const cookiesToSet = getMissingCookiesFromSession(session, input.initialCookies, request.url);
                    if (cookiesToSet && cookiesToSet.length) {
                        // setting initial cookies that are not already in the session and page
                        session.setPuppeteerCookies(cookiesToSet, request.url);
                        await page.setCookie(...cookiesToSet);
                    }
                }
            }
        ],
    });

    log.info('Starting the crawl.');
    await crawler.run();
    log.info('Crawl finished.');
});
