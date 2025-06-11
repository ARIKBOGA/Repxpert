# Repxpert Web Scraper

This is a web scraping project built with **Playwright** and **TypeScript** designed for collecting and processing spare parts data such as brake discs, pads, and other automotive components.

The project is strongly typed, meaning that the function arguments and return types are explicitly declared. This helps catch type-related errors at compile-time instead of runtime, making the code more reliable and easier to maintain.

The primary goal of this project is to:

- Retrieve OE numbers, cross reference numbers, vehicle compatibility details, and more.
- Store the collected data in structured **JSON** files.
- Convert these JSON files into **Excel** files, ready to be imported into a **FileMaker Pro** database.
- Automate the data entry process into the catalog system.
- Maximize data consistency and enable rapid catalog updates for newly added products.

## Tech Stack

- TypeScript
- Playwright / Playwright-extra
- Puppeteer-extra-plugin-stealth
- Node.js
- fs-extra
- fast-glob
- dotenv
- xlsx

## Installation

```bash
git clone https://github.com/ARIKBOGA/Repxpert.git
cd Repxpert
npm install playwright@latest 
npm install puppeteer-extra@4.3.6 
npm install puppeteer-extra-plugin-stealth@2.11.2 
npm install dotenv@6.1.1 
npm install fs-extra@11.3.0 
npm install fast-glob@3.3.3 xlsx@0.18.5

```

## Usage

The project requires some configuration files to run, such as `.env` files for credentials and specific configurations depending on the scraping target.

### Sample .env file

```bash
REPXPERT_URL=https://www.repxpert.com.tr
REPXPERT_EMAIL=YourEmail
REPXPERT_PASSWORD=YourPassword
NAME=Jane_Doe

# REPXPERT ENGLISH
REPXPERT_ENGLISH_URL=https://www.repxpert.co.uk/en-gb/catalog
REPXPERT_HOME_ENGLISH_URL=https://www.repxpert.co.uk/en-gb
REPXPERT_ENGLISH_EMAIL=YourEmail
REPXPERT_ENGLISH_PASSWORD=YourPassword
REPXPERT_ENGLISH_NAME=John_Doe

# FIND IT PARTS WEBSITE CREDENTIALS
FIND_IT_PARTS_URL=https://www.finditparts.com
FIND_IT_PARTS_EMAIL=YourEmail
FIND_IT_PARTS_PASSWORD=YourPassword

JNKB_BRAKES_URL=https://www.jnbk-brakes.com/catalogue/cars

CROSS_NUMBERS_URL=https://www.icerbrakes.com/en/Catalogue

FILTER_BRAND_APPLICATION=BREMBO # or one of other brands is going to be processed
FILTER_BRAND_TECH_DETAIL=BREMBO # or one of other brands is going to be processed

# Product type working on (Disc, Pad, Crankshaft, Drum, Rotor, Rotor_Disc, Rotor_Drum etc.)
PRODUCT_TYPE=Crankshaft

```

### Example command to run:

```bash
npx playwright test src/scrapers/Application_Scraper.spec.ts --headed --worker=${WORKER_COUNT}
```

The scraper will scrape the target website and generate JSON files for each application.

## Features

- Web scraping automation using Playwright.
- Developed helper functions where applicable.
- Multiple data sources supported.
- Data consistency checks.
- Generates clean Excel files for DB import.
- Supports rapid onboarding of new products into catalog.

## Notes

- Make sure you have proper network access and credentials if scraping authenticated resources.
- The scraper includes stealth plugins to minimize bot detection.
- The source xlsx files to be processed on scraping are **not included** in the repository due to copyright issues.

## Disclaimer

This project is intended for **educational** and internal **non-commercial** use only.

The data collected through this scraper is intended for private data processing. The author does not claim any rights on the data collected. Any usage of this tool for scraping third-party data is the sole responsibility of the user.

Make sure you comply with the terms of service and policies of any website you scrape.


## License

MIT License

**Author:** Burak Arıkboğa
