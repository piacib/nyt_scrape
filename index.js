import puppeteer from "puppeteer";
import * as fs from "fs";
import _ from "lodash";
import PocketBase from "pocketbase";

const pb = new PocketBase("http://127.0.0.1:8090/");
const i = 5;

const data = {
  title: `test${i}`,
  authors: `JSON${i}`,
  originalText: `test${i}`,
  episodeTitle: `test${i}`,
  airDate: new Date().toDateString(),
};
const addEntry = async () => {
  const authData = await pb.admins.authWithPassword(
    process.env.POCKETBASEEMAIL,
    process.env.POCKETBASEPASSWORD
  );
  const record = await pb.collection("books").create(data);
};
addEntry();

/// *** FETCHES NYT PAGE AND RETURNS ARRAY OF BOOKS PARSED *** ///
// import allData from "./data.json" assert { type: "json" };
export const writeDataToJson = (data, name) => {
  console.log(`writing data to ${name}...`);
  try {
    fs.writeFileSync(name, JSON.stringify(data));
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const parseNYTPage = (expr = "parseAllData") => {
  const parseEpisodeandDate = (pNode) => {
    const lastParenth = pNode.innerText.lastIndexOf(")");
    const lastFirstParenth = pNode.innerText.lastIndexOf("(");
    const date = pNode.innerText.slice(lastFirstParenth + 1, lastParenth);
    const episodeTitle = pNode.innerText.slice(0, lastFirstParenth).trim();
    return { episodeTitle, date };
  };
  const parseBooks = (ulNode) => {
    const liNodes = ulNode.children;
    if (liNodes === undefined) {
      return;
    }
    let books = [];
    Array.from(liNodes).forEach((recEl) => {
      const text = recEl.innerText;
      const titleRegEx = text.match(/\“(.*?)\”/);
      const title = titleRegEx ? titleRegEx[1] : text;
      const splitText = text.split(" by ");
      if (splitText.length == 2) {
        const unparsedAuthor = splitText[1];
        const authors = unparsedAuthor.split(/ and | , /);
        books.push({ title, authors, originalText: text });
        return;
      }
      books.push({ title, authors: [], originalText: text });
    });
    return books;
  };
  const parseEntry = (h2Node) => {
    const data = [];
    const guest = h2Node.innerText;
    const titleEl = h2Node.nextSibling;
    const titleDateObj = parseEpisodeandDate(titleEl);
    const booksUL = titleEl.nextSibling;
    const booksArr = parseBooks(booksUL);
    if (!booksArr) {
      return;
    }
    booksArr.forEach((book) => {
      data.push({
        ...book,
        ...titleDateObj,
        guest,
      });
    });
    return data;
  };
  const getH2s = document.querySelectorAll("#story > section > div > div > h2");
  const parsePage = () => {
    const guestNodeList = getH2s;
    const data = [];

    const guestArr = Array.from(guestNodeList);
    guestArr.forEach((x) => {
      const results = parseEntry(x);
      data.push(...results);
    });
    return data;
  };
  const parseLatestEpisode = () => {
    const guestNodeList = getH2s;
    const isNewEpisode = true;
    let newEpisodes = [];
    let entry = 0;
    while (isNewEpisode) {
      const episode = guestNodeList[entry];
      const episodeData = parseEntry(episode);
      const dataFiltered = allData.filter((entry) =>
        _isEqual(entry, episodeData)
      );
      if (dataFiltered && dataFiltered.length > 1) {
        throw Error("duplicate entry", dataFiltered);
      }
      if (dataFiltered && dataFiltered.length === 1) {
        isNewEpisode = false;
        break;
      }
      newEpisodes.push(episode);
      entry++;
    }
    return newEpisodes;
  };
  switch (expr) {
    case "parseAllData":
      const fullPageData = parsePage();
      return fullPageData;
    case "parseNewestEpisodes":
      console.log("parseNewestEpisodes");
      const latestEpisodeData = parseLatestEpisode();
      return latestEpisodeData;
  }
};
const scrape = async ({ url, parsePageFunc, fileName = false }) => {
  // Start a Puppeteer session with:
  // - a visible browser (`headless: false` - easier to debug because you'll see the browser in action)
  // - no default viewport (`defaultViewport: null` - website page will in full width and height)
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  // Open a new page
  const page = await browser.newPage();

  await page.goto(url, {
    waitUntil: "domcontentloaded",
  });
  const scrapeAllData = await page.evaluate(parsePageFunc);

  const data = scrapeAllData;
  // save data
  if (fileName) {
    writeDataToJson(new Date(), "lastupdated.json");
    writeDataToJson(data, fileName);
  }

  // Close the browser
  await browser.close();
  return data;
};

const url = "https://www.nytimes.com/article/ezra-klein-show-book-recs.html";

scrape({
  url,
  parsePageFunc: parseNYTPage,
  fileName: "data-2021.json",
});
