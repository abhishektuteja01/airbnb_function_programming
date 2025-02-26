/**
 * @module AirBnBDataHandler
 * This module provides a factory function that returns methods
 * to load and process AirBnB listings data.
 */

import { readFile, writeFile } from 'node:fs/promises';

/**
 * @typedef {Object} Listing
 * @property {number} price - Price of the listing.
 * @property {number} number_of_rooms - Number of rooms.
 * @property {number} review_score - Review score.
 * @property {string} host_id - Host identifier or host name.
 * // Add or adjust fields as per your CSV columns
 */

/**
 * Parses a CSV string into an array of objects.
 * @param {string} csvData - The CSV file content as a string.
 * @returns {Listing[]} Array of listing objects.
 */
function parseCSV(csvData) {
  // Adjust the parsing logic to match your specific CSV columns
  const [headerLine, ...lines] = csvData.split('\n').map((l) => l.trim());
  const headers = headerLine.split(',');

  return lines
    .filter((line) => line) // Remove empty lines
    .map((line) => {
      const columns = line.split(',');
      // Build object using the headers for keys
      const listing = {};
      headers.forEach((header, index) => {
        // Example: header might be "price", "number_of_rooms", "review_score", "host_id", ...
        // Convert to number if it’s a numeric field, otherwise keep as string
        if (['price', 'number_of_rooms', 'review_score'].includes(header)) {
          listing[header] = Number(columns[index]) || 0;
        } else {
          listing[header] = columns[index] || '';
        }
      });
      return listing;
    });
}

/**
 * A factory function that creates an AirBnBDataHandler object with chainable methods.
 * @param {Listing[]} [initialListings=[]] - Optional initial listings array.
 * @returns {Object} An object containing data handling methods.
 */
function createAirBnBDataHandler(initialListings = []) {
  // The data we will process (make sure it is only mutated in pure ways, or replaced).
  let _listings = [...initialListings];

  /**
   * Filters the listings based on price, number_of_rooms, and/or review_score.
   * @param {Object} filterCriteria
   * @param {number} [filterCriteria.minPrice] - Minimum price.
   * @param {number} [filterCriteria.maxPrice] - Maximum price.
   * @param {number} [filterCriteria.minRooms] - Minimum number of rooms.
   * @param {number} [filterCriteria.maxRooms] - Maximum number of rooms.
   * @param {number} [filterCriteria.minReview] - Minimum review score.
   * @param {number} [filterCriteria.maxReview] - Maximum review score.
   * @returns {Object} The handler itself (for chaining).
   */
  function filterListings({
    minPrice,
    maxPrice,
    minRooms,
    maxRooms,
    minReview,
    maxReview,
  } = {}) {
    _listings = _listings.filter((listing) => {
      // We only filter if the user provided a constraint
      if (minPrice !== undefined && listing.price < minPrice) return false;
      if (maxPrice !== undefined && listing.price > maxPrice) return false;
      if (minRooms !== undefined && listing.number_of_rooms < minRooms)
        return false;
      if (maxRooms !== undefined && listing.number_of_rooms > maxRooms)
        return false;
      if (minReview !== undefined && listing.review_score < minReview)
        return false;
      if (maxReview !== undefined && listing.review_score > maxReview)
        return false;
      return true;
    });
    return handler; // Return the handler object to enable chaining
  }

  /**
   * Computes statistics based on current filtered listings:
   * 1. How many listings match the filter.
   * 2. Average price per number of rooms.
   * @returns {{ count: number, averagePricePerRoom: number }} Stats object.
   */
  function computeStats() {
    const count = _listings.length;
    let averagePricePerRoom = 0;
    if (count > 0) {
      // For example: total price / total rooms
      const totalPrice = _listings.reduce((sum, l) => sum + l.price, 0);
      const totalRooms = _listings.reduce((sum, l) => sum + l.number_of_rooms, 0);
      averagePricePerRoom = totalRooms === 0 ? 0 : totalPrice / totalRooms;
    }

    return {
      count,
      averagePricePerRoom,
    };
  }

  /**
   * Computes how many listings are there per host, and returns a ranking (descending).
   * @returns {Array<{ host_id: string, count: number }>} Array of objects sorted by count desc.
   */
  function computeListingsByHost() {
    const hostMap = _listings.reduce((acc, listing) => {
      const hostKey = listing.host_id || 'unknown';
      acc[hostKey] = (acc[hostKey] || 0) + 1;
      return acc;
    }, {});

    const ranking = Object.entries(hostMap)
      .map(([host_id, count]) => ({ host_id, count }))
      .sort((a, b) => b.count - a.count);

    return ranking;
  }

  /**
   * Exports the current listings array (or a stats object) to a user-specified file.
   * @param {string} outputPath - Where to save the JSON file of results.
   * @param {Object} data - The data you want to export; can be stats or filtered listings.
   * @returns {Promise<void>} A promise that resolves when file is written.
   */
  async function exportResults(outputPath, data) {
    const jsonString = JSON.stringify(data, null, 2);
    await writeFile(outputPath, jsonString, 'utf-8');
  }

  /**
   * A counter-example to show what breaks the concept of pure functions.
   * This function *intentionally* modifies external state (a global variable, etc.).
   * @param {any} globalState - Some external state.
   */
  function impureFunctionCounterExample(globalState) {
    // This is an example of an impure function that modifies something outside its scope
    globalState.modified = true;
    // It depends on and changes external data instead of returning a new object
    // demonstrating how NOT to do it in functional programming.
    // (This is only to fulfill the assignment requirement.)
  }

  // We store all methods in a single object for convenience
  const handler = {
    filterListings,
    computeStats,
    computeListingsByHost,
    exportResults,
    impureFunctionCounterExample,
  };

  return handler;
}

/**
 * Loads the CSV file, parses its content, and returns a new AirBnBDataHandler.
 * @param {string} filePath - Path to the CSV file.
 * @returns {Promise<Object>} A promise that resolves to the created handler with data loaded.
 */
export async function loadAirBnBData(filePath) {
  const csvData = await readFile(filePath, 'utf-8');
  const parsedListings = parseCSV(csvData);
  return createAirBnBDataHandler(parsedListings);
}