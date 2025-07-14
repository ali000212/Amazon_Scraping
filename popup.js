document.getElementById("start").addEventListener("click", async () => {
  const delay = parseFloat(document.getElementById("delay").value) * 1000;
  await chrome.storage.local.set({
    scraping: true,
    delay,
    data: [],
    page: 1,
  });

  const startURL =
    "https://www.amazon.com/s?k=laptop&i=todays-deals&bbn=21101958011&crid=1744SY4K258WZ&qid=1752448608&sprefix=l%2Ctodays-deals%2C745&xpid=deUcYlr2Gk-0e&ref=sr_pg_1";

  chrome.tabs.update({ url: startURL });
});

document.getElementById("stop").addEventListener("click", async () => {
  await chrome.storage.local.set({ scraping: false });
});
