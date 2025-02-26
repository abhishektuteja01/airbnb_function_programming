#!/usr/bin/env node
/**
 * @file cli.js
 * @description Basic Readline CLI for interacting with AirBnBDataHandler
 */

import readline from "node:readline";
import { AirBnBDataHandler } from "./AirBnBDataHandler.js";

/**
 * Helper to ask a question using readline and return a Promise for the answer.
 * @param {readline.Interface} rl
 * @param {string} query
 * @returns {Promise<string>}
 */
function askQuestion(rl, query) {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Acquire CSV path from command line
const csvFilePath = process.argv[2];
if (!csvFilePath) {
  console.error("Usage: node cli.js path/to/Listings.csv");
  process.exit(1);
}

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// We'll keep a reference to our handler
let handler;

async function mainMenu() {
  const command = await askQuestion(rl, "\n~> Enter command (filter, stats, ranking, bestvalue, export, reset, quit): ");

  switch (command.toLowerCase()) {
    case "filter":
      await handleFilter();
      break;
    case "stats":
      handleStats();
      break;
    case "ranking":
      handleRanking();
      break;
    case "bestvalue":
      handleBestValue();
      break;
    case "export":
      await handleExport();
      break;
    case "reset":
      handler.reset();
      console.log("Data reset to original unfiltered state.");
      break;
    case "quit":
      console.log("Goodbye!");
      rl.close();
      return;
    default:
      console.log("Unknown command. Try again.");
      break;
  }

  // Loop
  mainMenu();
}

/**
 * Prompts user for filtering parameters and applies them.
 */
async function handleFilter() {
  const minPrice = await askQuestion(rl, "Min price (blank=none): ");
  const maxPrice = await askQuestion(rl, "Max price (blank=none): ");

  if (minPrice || maxPrice) {
    const _min = minPrice ? parseFloat(minPrice) : 0;
    const _max = maxPrice ? parseFloat(maxPrice) : Infinity;
    handler.filterByPrice(_min, _max);
    console.log(`Filtered by price between ${_min} and ${_max}.`);
  }

  const minRooms = await askQuestion(rl, "Min bedrooms (blank=none): ");
  const maxRooms = await askQuestion(rl, "Max bedrooms (blank=none): ");
  if (minRooms || maxRooms) {
    const _min = minRooms ? parseFloat(minRooms) : 0;
    const _max = maxRooms ? parseFloat(maxRooms) : Infinity;
    handler.filterByBedrooms(_min, _max);
    console.log(`Filtered by bedrooms between ${_min} and ${_max}.`);
  }

  const minScore = await askQuestion(rl, "Min review score (blank=none): ");
  const maxScore = await askQuestion(rl, "Max review score (blank=none): ");
  if (minScore || maxScore) {
    const _min = minScore ? parseFloat(minScore) : 0;
    const _max = maxScore ? parseFloat(maxScore) : Infinity;
    handler.filterByReviewScore(_min, _max);
    console.log(`Filtered by review score between ${_min} and ${_max}.`);
  }
}

/**
 * Logs out computed stats from the current dataset.
 */
function handleStats() {
  const stats = handler.computeStats();
  console.log("== Statistics ==");
  console.log(stats);
}

/**
 * Logs out the top 10 hosts by listing count.
 */
function handleRanking() {
  const ranking = handler.computeHostRanking();
  console.log("== Host Ranking (Top 10) ==");
  ranking.slice(0, 10).forEach((host, index) => {
    console.log(`${index + 1}. ${host.host_name} (ID: ${host.host_id}), listings: ${host.listingsCount}`);
  });
}

/**
 * CREATIVE ADDITION:
 * Finds and logs the single best listing with the highest rating-to-price ratio.
 */
function handleBestValue() {
  const bestListing = handler.computeBestValue();
  if (!bestListing) {
    console.log("No valid best-value listing found (maybe all have price=0?).");
  } else {
    const ratio = bestListing.review_scores_rating / bestListing.price;
    console.log("== Best Value Listing ==");
    console.log(`ID: ${bestListing.id}`);
    console.log(`Name: ${bestListing.name}`);
    console.log(`Price: $${bestListing.price}`);
    console.log(`Review Score: ${bestListing.review_scores_rating}`);
    console.log(`Ratio (score/price): ${ratio.toFixed(2)}`);
  }
}

/**
 * Exports the current dataset to a JSON file.
 */
async function handleExport() {
  const fileName = await askQuestion(rl, "Output filename (e.g. results.json): ");
  if (!fileName) {
    console.log("No filename provided.");
    return;
  }
  await handler.exportResults(fileName);
  console.log(`Data exported to ${fileName}`);
}

/**
 * Initialization: loads the CSV, then starts the main menu.
 */
async function init() {
  try {
    handler = await AirBnBDataHandler(csvFilePath);
    console.log(`Loaded data from ${csvFilePath}`);
    mainMenu();
  } catch (err) {
    console.error(`Error loading CSV: ${err}`);
    process.exit(1);
  }
}

init();