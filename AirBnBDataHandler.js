/**
 * @file AirBnBDataHandler.js
 * @description Main data module for processing Airbnb listings, now using csv-parse for robust CSV handling.
 * @module AirBnBDataHandler
 */

import { readFile, writeFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";

/**
 * A single Airbnb Listing object (subset of columns).
 * @typedef {Object} Listing
 * @property {string} id
 * @property {string} name
 * @property {string} host_id
 * @property {string} host_name
 * @property {number} host_listings_count
 * @property {number} bedrooms
 * @property {number} price
 * @property {number} review_scores_rating
 */

/**
 * Reads a CSV file, handles quoted fields properly, and returns an array of listing objects.
 * @async
 * @param {string} csvFilePath - Path to the unzipped Airbnb CSV file
 * @returns {Promise<Listing[]>} - Promise that resolves to an array of Listing objects
 */
async function loadCSV(csvFilePath) {
  // Read entire file contents
  const raw = await readFile(csvFilePath, "utf-8");

  /**
   * Parse the CSV into an array of objects. By using "columns: true",
   * each row becomes an object with keys based on the header row.
   * csv-parse/sync will automatically handle quoted strings, embedded commas, etc.
   */
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  // Now "records" is an array of objects like:
  // [
  //   { id: "1234", name: "Cool listing, near beach", price: "$100.00", ... },
  //   { id: "2345", name: "Another listing", price: "$120.00", ... },
  // ]

  // Convert each record's fields to the correct data types
  const listings = records.map((row) => ({
    id: row.id || "",
    name: row.name || "",
    host_id: row.host_id || "",
    host_name: row.host_name || "",
    host_listings_count: parseInt(row.host_listings_count || "0", 10),
    bedrooms: parseFloat(row.bedrooms || "0"),
    price: parseFloat(
      (row.price || "0")
        .replace("$", "")
        .replace(",", "")
    ),
    review_scores_rating: parseFloat(row.review_scores_rating || "0"),
  }));

  return listings;
}

/**
 * Creates an AirBnBDataHandler object with chainable methods.
 * @param {Listing[]} listingData - The array of Listing objects
 * @returns {object} Chainable handler with filter and compute methods
 */
function createDataHandler(listingData) {
  let currentData = [...listingData]; // copy to avoid mutating original

  return {
    /**
     * Filters listings by a price range.
     * @param {number} minPrice - Minimum price
     * @param {number} maxPrice - Maximum price
     * @returns {this} returns the same handler object for chaining
     */
    filterByPrice(minPrice, maxPrice) {
      currentData = currentData.filter(
        (item) => item.price >= minPrice && item.price <= maxPrice
      );
      return this;
    },

    /**
     * Filters listings by a bedroom range.
     * @param {number} minRooms - Minimum number of bedrooms
     * @param {number} maxRooms - Maximum number of bedrooms
     * @returns {this} returns the same handler object for chaining
     */
    filterByBedrooms(minRooms, maxRooms) {
      currentData = currentData.filter(
        (item) => item.bedrooms >= minRooms && item.bedrooms <= maxRooms
      );
      return this;
    },

    /**
     * Filters listings by a review score range.
     * @param {number} minScore - Minimum review score
     * @param {number} maxScore - Maximum review score
     * @returns {this} returns the same handler object for chaining
     */
    filterByReviewScore(minScore, maxScore) {
      currentData = currentData.filter(
        (item) =>
          item.review_scores_rating >= minScore &&
          item.review_scores_rating <= maxScore
      );
      return this;
    },

    /**
     * Computes basic statistics about the current dataset.
     * @returns {Object} statistics object
     */
    computeStats() {
      const totalListings = currentData.length;
      if (totalListings === 0) {
        return {
          totalListings,
          avgPrice: 0,
          avgPriceByBedrooms: {},
        };
      }

      // Average price overall
      const totalPrice = currentData.reduce((sum, item) => sum + item.price, 0);
      const avgPrice = totalPrice / totalListings;

      // Average price per bedroom
      const perBedroomData = currentData.reduce((acc, item) => {
        const key = item.bedrooms || 0;
        if (!acc[key]) {
          acc[key] = { totalPrice: 0, count: 0 };
        }
        acc[key].totalPrice += item.price;
        acc[key].count += 1;
        return acc;
      }, {});
      const avgPriceByBedrooms = {};
      for (const [rooms, obj] of Object.entries(perBedroomData)) {
        avgPriceByBedrooms[rooms] = obj.totalPrice / obj.count;
      }

      return {
        totalListings,
        avgPrice,
        avgPriceByBedrooms,
      };
    },

    /**
     * Computes how many listings each host has in the current dataset
     * and returns a ranking sorted by number of listings (descending).
     * @returns {Array} - Array of {host_id, host_name, listingsCount}
     */
    computeHostRanking() {
      const rankingMap = currentData.reduce((acc, item) => {
        if (!item.host_id) return acc;
        const hostKey = item.host_id;
        if (!acc[hostKey]) {
          acc[hostKey] = {
            host_id: item.host_id,
            host_name: item.host_name,
            listingsCount: 0,
          };
        }
        acc[hostKey].listingsCount += 1;
        return acc;
      }, {});

      const rankingArray = Object.values(rankingMap);
      rankingArray.sort((a, b) => b.listingsCount - a.listingsCount);
      return rankingArray;
    },

    /**
     * (Optional) Creative addition: find listing with best rating-to-price ratio
     * ratio = review_scores_rating / price.
     * @returns {Listing | null} best value listing or null if none found
     */
    computeBestValue() {
      let best = null;
      let bestRatio = 0;
      currentData.forEach((item) => {
        if (item.price > 0) {
          const ratio = item.review_scores_rating / item.price;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = item;
          }
        }
      });
      return best;
    },

    /**
     * Exports the current dataset or any data to a JSON file.
     * @async
     * @param {string} filename - Output filename
     * @param {any} dataToExport - Optional data to export; defaults to current filtered dataset
     * @returns {Promise<void>}
     */
    async exportResults(filename, dataToExport = null) {
      const payload = dataToExport || currentData;
      await writeFile(filename, JSON.stringify(payload, null, 2), "utf-8");
    },

    /**
     * Resets current data back to the original loaded listing data.
     * @returns {this} handler object for chaining
     */
    reset() {
      currentData = [...listingData];
      return this;
    },
  };
}

/**
 * Main function that loads the CSV and returns the chainable data handler.
 * @async
 * @param {string} csvFilePath - Path to the CSV file
 * @returns {Promise<ReturnType<typeof createDataHandler>>}
 */
export async function AirBnBDataHandler(csvFilePath) {
  const listingData = await loadCSV(csvFilePath);
  return createDataHandler(listingData);
}