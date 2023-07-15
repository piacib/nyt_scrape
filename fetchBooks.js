import nytData from "./data.json" assert { type: "json" };
import fetch from "node-fetch";
import * as fs from "fs";
import { setTimeout } from "timers/promises";
export const writeDataToJson = (data, name) => {
  console.log(`writing data to ${name}...`);
  try {
    fs.writeFileSync(name, JSON.stringify(data));
  } catch (error) {
    console.error(error);
    throw error;
  }
};
const queryGenerator = (book) =>
  `${book.title}${book.authors[0] ? " by " + book.authors[0] : ""}`;

const urlGenerator = (book) => {
  const urlString = `https://www.googleapis.com/books/v1/volumes?q=${queryGenerator(
    book
  )}`;

  return new URL(urlString).href;
};
let data = {};
const fetcher = async (book) => {
  const { authors, title } = book;
  const clone = (({ title, ...o }) => o)(book);
  data[title] = {
    ...clone,
    id: null,
    googleBookTitle: null,
  };
  if (!authors.length) {
    return;
  }
  //   generate url
  const url = urlGenerator(book);
  //   query google books
  const response = await fetch(url);
  const json = await response.json();
  if (response.ok) {
    const results = await json.items;
    // check if any results are present
    if (results.length == 0) {
      return;
    }
    const firstResult = await results[0];
    const id = await firstResult.id;
    data[title].id = id;
    data[title].googleBookTitle = firstResult.volumeInfo.title;
  } else {
    const tempError = new Error(
      json.error.errors?.map((e) => e.message).join("\n") ?? "unknown"
    );
    console.log(tempError);
  }
  console.log(data[title]);
};
const queryfetcher = async (book) => {
  const { authors, title } = book;
  const clone = (({ title, ...o }) => o)(book);
  data[title] = {
    ...clone,
    id: null,
    googleBookTitle: null,
  };
  if (!authors.length) {
    return;
  }
  //   generate url
  const url = urlGenerator(book);
  //   query google books
  const response = await fetch(url);
  const json = await response.json();
  if (response.ok) {
    const results = await json.items;
    // check if any results are present
    if (results.length == 0) {
      return;
    }
    const firstResult = await results[0];
    const id = await firstResult.id;
    return id;
  }
  return null;
};


const idUrlGenerator = (id) =>
    `https://www.googleapis.com/books/v1/volumes/${id}`;
const volumeFetcher = (id, book) => {
  if (exitCondition(book)) {
    exitCallBack(book);
    return;
  }
  const url = idUrlGenerator(id);
  const response = await fetch(url);
  const json = await response.json();
  if (response.ok) {
    
      const { categories, imageLinks } = json.volumeInfo;
      return { ...data[book], imageLinks, categories, id };
    
  } else {
    const tempError = new Error(
      json.error.errors?.map((e) => e.message).join("\n") ?? "unknown"
    );
    console.log(url, tempError);
  }
  return { ...data[book], imageLinks:{}, categories:[], id }; 
} 


// let timeout = 0;
// let delay = 0;
// let counter = 0;
// nytData.slice(0, 10).forEach((book) => {
//   timeout += 1000;
//   counter += 1;
//   delay = counter % 10 ? timeout + 3000 : timeout;
//   setTimeout(() => {
//     fetcher(book);
//   }, delay);
// });
// setTimeout(() => console.log("data", data), delay);


// const generateData = async () => {
//   let timeout = 0;
//   let counter = 0;

//   const idUrlGenerator = (id) =>
//     `https://www.googleapis.com/books/v1/volumes/${id}`;

//   const asyncfetcher = async ({
//     book,
//     callback,
//     exitCondition,
//     exitCallBack = () => {},
//     delay = 0,
//   }) => {
//     console.log("fetching", book);
//     if (exitCondition(book)) {
//       exitCallBack(book);
//       return;
//     }
//     const url = idUrlGenerator(data[book].id);
//     setTimeout(async () => {
//       const response = await fetch(url);
//       const json = await response.json();
//       if (response.ok) {
//         await callback(book, json);
//       } else {
//         const tempError = new Error(
//           json.error.errors?.map((e) => e.message).join("\n") ?? "unknown"
//         );
//         console.log(url, tempError);
//       }
//     }, delay);
//   };
//   let delay = 0;
//   Object.keys(data).forEach((book) => {
//     timeout += 1000;
//     counter += 1;
//     delay = counter % 10 ? timeout + 3000 : timeout;
//     const callback = (book, json) => {
//       const { categories, imageLinks } = json.volumeInfo;
//       data[book] = { ...data[book], imageLinks, categories };
//     };
//     const exitCondition = (book) => Boolean(!data[book].id);
//     asyncfetcher({ book, exitCondition, callback, delay });
//   });

// //   // writeDataToJson(data, "googleBooksData.json");
// // };
// // generateData();
