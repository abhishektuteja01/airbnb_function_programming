/**
 * @file AirBnBDataHandler.js
 * @description Main data module for processing Airbnb listings, supporting .csv or .csv.gz and exporting ALL columns.
 */

import { readFile, writeFile } from "node:fs/promises";
import zlib from "node:zlib"; // For handling .gz files
import { parse } from "csv-parse/sync";

/**
 * We won't strictly define all possible columns as this dataset can vary.
 * Instead, we'll just define a minimal shape for reference. Each row object
 * will contain every column from the CSV.
 *
 * @typedef {Object} Listing
 * @property {number} price - We'll parse this from the CSV
 * @property {number} bedrooms
 * @property {number} review_scores_rating
 * // plus any other columns from the CSV as raw strings, which we'll keep untouched
 */

/**
 * @typedef {Object} ChainableHandler
 * @property {function(number, number): ChainableHandler} filterByPrice
 * @property {function(number, number): ChainableHandler} filterByBedrooms
 * @property {function(number, number): ChainableHandler} filterByReviewScore
 * @property {function(): Object} computeStats
 * @property {function(): Object[]} computeHostRanking
 * @property {function(): Listing|null} computeBestValue
 * @property {function(string, any=): Promise<void>} exportResults
 * @property {function(): ChainableHandler} reset
 */

/**
 * Reads the CSV or CSV.GZ file, returning an array of objects (each containing ALL columns).
 * We also parse out "price", "bedrooms", and "review_scores_rating" as numbers for filtering.
 * But we keep all other columns as-is.
 * @async
 * @param {string} filePath - Path to .csv or .csv.gz file
 * @returns {Promise<Listing[]>} - Array of objects with all columns, plus numeric fields
 */
async function loadCSV(filePath) {
  let raw;
  if (filePath.endsWith(".gz")) {
    // If it's gzipped, unzip first
    const gzBuffer = await readFile(filePath);
    const unzipped = zlib.unzipSync(gzBuffer);
    raw = unzipped.toString("utf-8");
  } else {
    // Otherwise, read as plain text
    raw = await readFile(filePath, "utf-8");
  }

  // Parse the CSV into an array of objects keyed by header
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  // Convert each record so that price, bedrooms, review_scores_rating are numeric
  const listings = records.map((row) => {
    // We'll keep all original columns, but parse a few:
    const item = { ...row };

    // Convert price, bedrooms, and review_scores_rating to numbers
    // (only if they exist; if not, default to 0)
    if (typeof item.price === "string") {
      item.price = parseFloat(item.price.replace("$", "").replace(",", "")) || 0;
    } else {
      item.price = Number(item.price) || 0;
    }

    item.bedrooms = parseFloat(item.bedrooms) || 0;
    item.review_scores_rating = parseFloat(item.review_scores_rating) || 0;

    return item;
  });

  return listings;
}

/**
 * Creates a chainable handler. The data objects in currentData include ALL columns,
 * while we filter on the numeric columns we've parsed (price, bedrooms, review_scores_rating).
 * @param {Listing[]} listingData
 * @returns {ChainableHandler}
 */
function createDataHandler(listingData) {
  let currentData = [...listingData]; // copy for filtering

  return {
    /**
     * Filter by a price range, inclusive of minPrice and maxPrice.
     * @param {number} minPrice
     * @param {number} maxPrice
     * @returns {this}
     */
    filterByPrice(minPrice, maxPrice) {
      currentData = currentData.filter(
        (item) => item.price >= minPrice && item.price <= maxPrice
      );
      return this;
    },

    /**
     * Filter by a bedroom range, inclusive.
     * @param {number} minRooms
     * @param {number} maxRooms
     * @returns {this}
     */
    filterByBedrooms(minRooms, maxRooms) {
      currentData = currentData.filter(
        (item) => item.bedrooms >= minRooms && item.bedrooms <= maxRooms
      );
      return this;
    },

    /**
     * Filter by a review score range.
     * @param {number} minScore
     * @param {number} maxScore
     * @returns {this}
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
     * Compute stats on the currently filtered data:
     * - totalListings
     * - avgPrice
     * - avgPriceByBedrooms
     * @returns {Object}
     */
    computeStats() {
      const totalListings = currentData.length;
      if (totalListings === 0) {
        return {
          totalListings: 0,
          avgPrice: 0,
          avgPriceByBedrooms: {},
        };
      }

      const totalPrice = currentData.reduce((sum, item) => sum + (item.price || 0), 0);
      const avgPrice = totalPrice / totalListings;

      // average price by #bedrooms
      const byRooms = currentData.reduce((acc, item) => {
        const key = item.bedrooms || 0;
        if (!acc[key]) acc[key] = { total: 0, count: 0 };
        acc[key].total += item.price;
        acc[key].count += 1;
        return acc;
      }, {});
      const avgPriceByBedrooms = {};
      for (const [rooms, obj] of Object.entries(byRooms)) {
        avgPriceByBedrooms[rooms] = obj.total / obj.count;
      }

      return {
        totalListings,
        avgPrice,
        avgPriceByBedrooms,
      };
    },

    /**
     * Returns an array of { host_id, host_name, listingsCount }, sorted desc by listingsCount.
     * @returns {Array}
     */
    computeHostRanking() {
      // some listings may not have host_id
      const tally = currentData.reduce((acc, item) => {
        if (!item.host_id) return acc;
        if (!acc[item.host_id]) {
          acc[item.host_id] = {
            host_id: item.host_id,
            host_name: item.host_name || "",
            listingsCount: 0,
          };
        }
        acc[item.host_id].listingsCount += 1;
        return acc;
      }, {});
      const array = Object.values(tally);
      array.sort((a, b) => b.listingsCount - a.listingsCount);
      return array;
    },

    /**
     * Find the single listing with the best rating-to-price ratio
     * among the current (filtered) data.
     * @returns {Listing|null}
     */
    computeBestValue() {
      let best = null;
      let bestRatio = 0;
      for (const item of currentData) {
        if (item.price > 0) {
          const ratio = item.review_scores_rating / item.price;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = item;
          }
        }
      }
      return best;
    },

    /**
     * Exports the currently filtered data to a JSON file, including ALL columns.
     * @async
     * @param {string} filename
     * @param {any} dataToExport - (Optional) if you want to override what's exported
     */
    async exportResults(filename, dataToExport = null) {
      const payload = dataToExport || currentData;
      await writeFile(filename, JSON.stringify(payload, null, 2), "utf-8");
    },

    /**
     * Resets the filtering to the full dataset.
     * @returns {this}
     */
    reset() {
      currentData = [...listingData];
      return this;
    },
  };
}

/**
 * Main function that loads the CSV/CSV.GZ and returns a chainable data handler.
 * @async
 * @param {string} filePath
 * @returns {Promise<ChainableHandler>}
 */
export async function AirBnBDataHandler(filePath) {
  const listingData = await loadCSV(filePath);
  return createDataHandler(listingData);
}

/* --------------------------------------------------------------------------
 COUNTER EXAMPLE (IMPURE):

 Here's how someone might break functional principles by mutating data in place
 rather than returning a new array or reassigning "currentData".
 This would happen if we wrote something like this inside our
 chainable handler:

 function impureFilterInPlace(minPrice, maxPrice) {
   for (const item of listingData) {
     // artificially adjust item.price, i.e. side-effect
     item.price = item.price + 100; 
   }
   // now listingData is forever changed, losing original info
   // next we do a filter
   listingData = listingData.filter(item => item.price >= minPrice && item.price <= maxPrice);
 }

 This code has side effects on listingData that affect all future operations.
 It's shown here only as a "DON'T DO THIS" example.

--------------------------------------------------------------------------- */