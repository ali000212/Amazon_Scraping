(async () => {
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  const getScrapingState = () =>
    new Promise((resolve) => {
      chrome.storage.local.get(["scraping", "delay", "data", "page"], resolve);
    });

  const setScrapingState = (updates) =>
    new Promise((resolve) => {
      chrome.storage.local.set(updates, resolve);
    });

  const stopScraping = async () => {
    console.log("⛔ Stopping and downloading JSON...");
    const { data } = await getScrapingState();

    if (!data || Object.keys(data).length === 0) {
      console.warn("⚠️ No data found to download.");
      alert("No data scraped yet!");
      await setScrapingState({ scraping: false, data: {}, page: 1 });
      return;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "amazon_laptops_by_page.json";
    document.body.appendChild(a);
    a.click();
    a.remove();

    await setScrapingState({ scraping: false, data: {}, page: 1 });
  };

  const scrapeOnePage = async (delayTime) => {
    const results = [];

    for (let i = 1; i <= 15; i++) {
      const state = await getScrapingState();
      if (!state.scraping) {
        console.log("🛑 Scraping stopped mid-page");
        return results;
      }

      const item = document.querySelector(
        `[cel_widget_id="MAIN-SEARCH_RESULTS-${i}"]`
      );
      if (!item) continue;

      const image = item.querySelector('[data-component-type="s-product-image"] a div img')?.src || "";
      const name = item.querySelector('[data-cy="title-recipe"] a h2 span')?.innerText || "";
      const priceSymbol = item.querySelector(".a-price-symbol")?.innerText || "";
      const priceWhole = item.querySelector(".a-price-whole")?.innerText || "";
      const priceDecimal = item.querySelector(".a-price-decimal")?.innerText || "";
      const originalPrice = item.querySelector(".a-price.a-text-price .a-offscreen")?.innerText || "";
      const rating = item.querySelector('[class="a-declarative"] a i span')?.innerText || "";
      const delivery = item.querySelector('[data-cy="delivery-recipe"] .a-color-base.a-text-bold')?.innerText || "";

      results.push({
        image,
        name,
        price: `${priceSymbol}${priceWhole}${priceDecimal}`,
        originalPrice,
        rating,
        delivery,
      });
      console.log(results,'results')

      await delay(delayTime);
    }

    return results;
  };

  const buildNextUrl = (currentUrl, nextPage) => {
    const url = new URL(currentUrl);
    const params = url.searchParams;

    // Add or update page parameter starting from page 2
    if (nextPage >= 2) {
      params.set("page", nextPage.toString());
    } else {
      params.delete("page");
    }

    url.search = params.toString();

    let updatedUrl = url.toString().replace(/sr_pg_\d+/, `sr_pg_${nextPage}`);
    if (!updatedUrl.includes(`sr_pg_${nextPage}`)) {
      updatedUrl += `&ref=sr_pg_${nextPage}`;
    }

    return updatedUrl;
  };

  const main = async () => {
    const state = await getScrapingState();
    if (!state.scraping) return;

    const page = state.page || 1;
    const delayTime = state.delay || 1000;
    const collected = state.data || {};

    const currentResults = await scrapeOnePage(delayTime);
    const updatedData = { ...collected, [page]: currentResults };

    await setScrapingState({
      data: updatedData,
      page: page + 1,
    });

    const latest = await getScrapingState();
    if (!latest.scraping || page >= 1000 || currentResults.length === 0) {
      await stopScraping();
      return;
    }

    const nextURL = buildNextUrl(window.location.href, page + 1);
    window.location.href = nextURL;
  };

  await main();

  chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName === "local" && changes.scraping?.newValue === false) {
      await stopScraping();
    }
  });
})();
