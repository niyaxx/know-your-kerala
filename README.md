**Know Your Kerala** is an interactive rainfall data explorer for Kerala, India, built using NASA Earth observation data.

**Live Demo:** https://frontend-mu-beige-ixdb9zho6t.vercel.app/  
**Source Code:** https://github.com/niyaxx/know-your-kerala

## Overview

Know Your Kerala is an interactive data visualization project developed for the 2026 NASA Space Apps Challenge, under the challenge **“Be An Earth System Trend Detective!”**

The project explores rainfall patterns across Kerala using precipitation data from NASA's Global Precipitation Measurement (GPM) mission. It transforms scientific data into an accessible, visual experience that allows users to investigate rainfall variability, seasonal patterns, and long-term trends.

Through interactive visualizations and statistical analysis, the project aims to help students, educators, and the public explore regional Earth system data and develop a deeper understanding of Kerala's rainfall patterns.

## Challenge

The Earth System Trend Detective challenge focuses on identifying changes in Earth system variables, visualizing their behavior over time, estimating the magnitude of trends, and evaluating their statistical significance.

Know Your Kerala addresses this challenge through a regional investigation of precipitation in Kerala.

## Data Source

The project uses monthly precipitation data from NASA's Global Precipitation Measurement (GPM) mission, specifically the IMERG dataset.

- **Dataset:** GPM IMERG Monthly Precipitation, Version 07
- **Temporal coverage:** January 2000 – September 2025
- **Trend analysis period:** Complete calendar years 2000–2024
- **Variable:** Precipitation
- **Region of interest:** Kerala, India

### NASA Resources

- [NASA GPM IMERG Dataset — Earthdata Search](https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGM_07/summary)
- [NASA Global Precipitation Measurement Mission](https://gpm.nasa.gov/data/imerg)

## Features

- Interactive exploration of rainfall data across different time periods
- Rainfall summary statistics
- Monthly rainfall time-series visualization
- Monthly climatology visualization for investigating seasonal patterns
- Annual rainfall trend analysis
- Sen's slope estimator for estimating trend magnitude
- Mann–Kendall test for evaluating statistical significance
- Visual storytelling inspired by Kerala's monsoon landscape

## Scientific Methodology

### Time-Series Analysis

Monthly precipitation records are used to investigate rainfall behavior over time. Annual totals are calculated using complete calendar years for trend analysis.

### Sen's Slope Estimator

Sen's slope is used to estimate the magnitude and direction of a monotonic trend in annual rainfall.

A positive slope indicates an estimated increase in rainfall over time, while a negative slope indicates an estimated decrease.

### Mann–Kendall Test

The Mann–Kendall test is used to evaluate whether a monotonic trend is statistically significant.

The analysis uses a significance threshold of α = 0.05.

A statistically nonsignificant result does not establish that no trend exists. It indicates that the available data do not provide sufficient evidence to reject the null hypothesis at the selected significance level.

### Preliminary Findings

The current analysis estimates an upward Sen's slope of approximately +14.04 mm/year.

The Mann–Kendall test returns a p-value of approximately 0.1176. This is above the 0.05 significance threshold; therefore, the estimated upward trend is not statistically significant at the 5% level.

These results describe the analyzed dataset and should not be interpreted as proof of climate change or as a prediction of future rainfall.

## Technology Stack

| Technology | Purpose |
|---|---|
| React | User interface development |
| Vite | Frontend development and build tooling |
| JavaScript | Data processing and statistical calculations |
| CSS | Visual design and responsive styling |
| Recharts | Data visualization |
| PapaParse | CSV parsing |
| Lucide Icons | Interface icons |

## Getting Started

### Prerequisites

- Node.js
- npm

### Installation

Clone the repository:

```bash
git clone https://github.com/niyaxx/know-your-kerala.git
cd know-your-kerala
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL provided by Vite in your browser.

### Production Build

To create a production build:

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

## Project Structure

```text
know-your-kerala/
├── public/
│   └── Kerala_Monthly_Rainfall.csv
├── src/
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

The structure above is representative. Additional assets, stylesheets, or components may be present in the repository.

## Limitations

- The analysis is limited to the selected NASA precipitation dataset and temporal coverage.
- Statistical significance depends on the analyzed period and data characteristics.
- A nonsignificant trend should not be interpreted as proof of no change.
- The project does not independently attribute rainfall changes to climate change.
- The analysis is exploratory and is not intended for operational weather forecasting.

## Intended Impact

Know Your Kerala aims to make NASA Earth observation data more accessible by connecting scientific analysis with a regional context familiar to its audience.

By combining statistical methods, interactive visualizations, and a Kerala-inspired visual identity, the project encourages curiosity, data literacy, and evidence-based exploration of environmental patterns.

## Acknowledgements

Developed for the **2026 NASA Space Apps Challenge**.

The project uses NASA GPM IMERG precipitation data and open-source software libraries.

NASA data and resources are acknowledged in the Data Source section above.


