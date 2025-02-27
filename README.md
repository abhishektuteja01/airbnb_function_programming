# AirBnB Functional Programming Project

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Usage](#usage)
  - [Command Line Interface](#command-line-interface)
  - [CLI Commands](#cli-commands)
- [Generating Documentation](#generating-documentation)
- [ESLint & Prettier](#eslint--prettier)
- [Creative Addition](#creative-addition)
- [Impure Code Counterexample](#impure-code-counterexample)
- [Hardest and Most Rewarding Parts](#hardest-and-most-rewarding-parts)
- [Using GenAI and What Was Learned](#using-genai-and-what-was-learned)
- [License](#license)

## Overview

This repository contains a functional programming project that processes AirBnB listings data from a CSV file. It demonstrates:
1. Chainable filter methods for price, bedrooms, and review scores.
2. Computation of statistics like average price and the number of filtered listings.
3. Ranking of hosts by their number of listings.
4. Exporting results to a user-chosen JSON file.

It uses no classes, only pure functions (with a single counterExample.js file to illustrate impure code). The CSV parsing is done via the csv-parse library for robust handling of commas inside quoted fields.

## Features
- Filter listings by:
  - Price Range (minPrice, maxPrice)
  - Bedrooms Range (minRooms, maxRooms)
  - Review Score Range (minScore, maxScore)
- Compute Statistics:
  - Total listings matching the filters
  - Average price overall
  - Average price by bedrooms
- Host Ranking:
  - Number of listings per host, sorted in descending order
- Export filtered data or any computed result to a JSON file
- Method Chaining:

```javascript
handler
  .filterByPrice(50, 200)
  .filterByBedrooms(1, 3)
  .computeStats();
```

- Creative Addition:
  - A function to compute the best value listing, where value is defined as (review_scores_rating / price).
- Impure Code Example:
  - A separate counterExample.js demonstrating mutation of a global variable.
- Documentation:
  - JSDoc comments and HTML docs generated via jsdoc.
  - No Classes, ES Modules, Promises, Readline CLI, ESLint + Prettier.

## Project Structure

```
.
├── AirBnBDataHandler.js    # Main functional module
├── cli.js                  # Readline-based CLI
├── counterExample.js       # Impure code example
├── package.json
├── .eslintrc.js
├── .prettierrc
├── jsdoc.json
├── README.md               # This file
└── docs/                   # JSDoc output will be generated here
```

## Prerequisites
- Node.js (v14+ recommended)
- npm or yarn package manager
- A local copy of the unzipped CSV file with the following columns (for example):
  - id
  - name
  - host_id
  - host_name
  - host_listings_count
  - bedrooms
  - price
  - review_scores_rating


## Installation & Setup
1. Clone this repository:

```bash
git clone https://github.com/abhishektuteja01/airbnb_function_programming.git
cd airbnb-functional-project
```

2. Install dependencies:

```bash
npm install
```

or

```bash
yarn
```

3. (Optional) Validate your code:

```bash
npm run lint
```

or

```bash
npm run format
```

to format with Prettier.

## Usage

### Command Line Interface

The main entry point for the CLI is cli.js. It expects you to provide a CSV file path as a parameter.

```bash
node cli.js data/listings.csv
```
or 
```bash
node cli.js data/listings.csv.gz
```

For example:

```bash
node cli.js listings.csv
```

### CLI Commands

Once you start the CLI, you will see a prompt like:

```
~> Enter command (filter, stats, ranking, bestvalue, export, reset, quit):
```

- **filter**:
  Prompts for min price, max price, min bedrooms, max bedrooms, min review score, and max review score.
  Leave any blank if you don't want to set that filter.
- **stats**:
  Displays an object containing:
  - totalListings
  - avgPrice
  - avgPriceByBedrooms
- **ranking**:
  Shows the top 10 hosts by number of listings.
- **bestvalue** (Creative Addition):
  Shows the single listing with the highest (review_scores_rating / price) ratio.
- **export**:
  Prompts for an output filename (e.g. results.json) and writes the current filtered data to that file in JSON format.
- **reset**:
  Resets the data back to the original unfiltered dataset.
- **quit**:
  Exits the CLI.

## Generating Documentation

We use JSDoc to generate HTML docs.
1. Update jsdoc.json if needed.
2. Generate docs:

```bash
npm run docs
```

or

```bash
npx jsdoc -c jsdoc.json
```

3. After generation, open docs/index.html in your browser to view the documentation.

## ESLint & Prettier
- We provide .eslintrc.js and .prettierrc files for consistent linting and formatting.
- To check lint errors:

```bash
npm run lint
```

- To format all code with Prettier:

```bash
npm run format
```

## Creative Addition

We implemented a custom function computeBestValue() in AirBnBDataHandler.js. This finds the single listing (in the currently filtered dataset) that maximizes the ratio:

```
listing.review_scores_rating / listing.price
```

If the price is zero or missing, we skip that listing to avoid division by zero.

## Impure Code Counterexample

COUNTER EXAMPLE (IMPURE):

 Here's how someone might break functional principles by mutating data in place
 rather than returning a new array or reassigning "currentData".
 This would happen if we wrote something like this inside our
 chainable handler:

 ```javascript
 function impureFilterInPlace(minPrice, maxPrice) {
   for (const item of listingData) {
     // artificially adjust item.price, i.e. side-effect
     item.price = item.price + 100; 
   }
   // now listingData is forever changed, losing original info
   // next we do a filter
   listingData = listingData.filter(item => item.price >= minPrice && item.price <= maxPrice);
 }
 ```

 This code has side effects on listingData that affect all future operations.
 It's shown here only as a "DON'T DO THIS" example.


## Hardest and Most Rewarding Parts

**Hardest Part**:
- Ensuring we parsed the CSV file correctly, especially when fields contain commas. We overcame this by using the csv-parse library rather than a naive split(",").

**Most Rewarding Part**:
- Seeing the method chaining in action, where we can do something like:

```javascript
handler.filterByPrice(50, 300).filterByBedrooms(1, 2).computeStats();
```

This allowed a clean, functional approach.

## Using GenAI and What Was Learned

- For this project, we used AI assistance for:
  1. Debugging CSV parsing issues - Used ChatGPT 4o. Prompt: 'I am using line.split(",") in my code. Here is the code. I want to use a better way to handle quoted fields and embedded commas.' Initially, we tried line.split(",") but encountered issues with fields that contained commas inside quotes. We switched to csv-parse, which properly handles quoted fields, embedded commas, and more.
    ```javascript
    const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    });
    ```

  2. Readme and JSDoc - Used ChatGPT 4O. Prompt: " I am creating a functional programming project with listings.csv and below code *code provided to chatgpt*, please add JSDoc comments and provide a readme file for it. I cross checked the files and they worked fine.

What we learnt: 

- Careful code reading and manual debugging is still essential, as AI outputs can be incomplete or incorrect for certain edge cases.
- Providing clear prompts helps generate better results.

## License

MIT License
Copyright (c) 2025

Enjoy using the AirBnB Functional Programming Project!
If you have any questions or suggestions, please feel free to open an issue or submit a pull request.