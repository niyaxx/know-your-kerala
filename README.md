<p align="center">
  <strong>**Know Your Kerala** is an interactive rainfall data explorer for Kerala, India, built using NASA Earth observation data.</strong>
</p>

<p align="center">
  <a href="https://frontend-mu-beige-ixdb9zho6t.vercel.app/">Live Demo</a> •
  <a href="https://github.com/niyaxx/know-your-kerala">Source Code</a>
</p>

---

## Overview

**Know Your Kerala** is an interactive rainfall data explorer developed for the 2026 NASA Space Apps Challenge, under the challenge *Be An Earth System Trend Detective!*

The project investigates precipitation patterns across Kerala, India, using satellite-based rainfall observations from NASA’s Global Precipitation Measurement (GPM) mission.

By combining regional precipitation data, interactive visualizations, and non-parametric statistical trend analysis, the project transforms complex Earth observation data into an accessible and engaging scientific experience.

Its purpose is to help students, educators, and the public explore rainfall variability, understand seasonal patterns, and investigate long-term trends in Kerala.

## Challenge Context

The Earth System Trend Detective challenge encourages participants to investigate changes in Earth system variables over time, identify trends, quantify their magnitude, and evaluate their statistical significance.

Know Your Kerala approaches this challenge through a regional investigation of rainfall, connecting large-scale satellite observations with an environmental context familiar to its intended audience.

## Data Source

The project uses precipitation data from NASA’s Global Precipitation Measurement mission.

| Parameter | Description |
|---|---|
| Dataset | GPM IMERG Monthly Precipitation |
| Dataset Version | Version 07 |
| Data Source | NASA |
| Variable | Precipitation |
| Region of Interest | Kerala, India |
| Monthly Data Coverage | January 2000 – September 2025 |
| Trend Analysis Period | Complete calendar years 2000–2024 |
| Measurement Unit | Millimeters (mm) |

### Data Resources

- [NASA GPM IMERG Dataset — Earthdata](https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGM_07/summary)
- [NASA Global Precipitation Measurement Mission](https://gpm.nasa.gov/data/imerg)

## Data Processing Pipeline

The project’s data workflow converts satellite precipitation observations into a regional monthly rainfall time series.

1. **Data acquisition:** NASA GPM IMERG precipitation data is used as the underlying scientific dataset.
2. **Temporal filtering:** The dataset is filtered to the selected date range.
3. **Monthly aggregation:** Precipitation observations are aggregated into monthly values.
4. **Regional extraction:** Precipitation is extracted for the Kerala region using its geographical boundary.
5. **Data export:** The resulting monthly rainfall series is stored in a CSV file.
6. **Frontend processing:** PapaParse reads the CSV data for interactive exploration and visualization.

The regional aggregation represents the mean precipitation across the selected Kerala boundary geometry. The exported monthly series is used for the dashboard’s rainfall statistics and trend calculations.

## Features

- Interactive exploration of rainfall across different time periods
- Rainfall summary statistics
- Monthly rainfall time-series visualization
- Monthly climatology visualization
- Annual rainfall trend analysis
- Sen’s slope estimator
- Mann–Kendall statistical significance test
- Interactive data filtering
- Kerala-inspired editorial design and visual storytelling

## Scientific Methodology

### 1. Monthly Rainfall Analysis

Monthly precipitation values are used to investigate rainfall behavior over time.

The dashboard provides visualizations that help users explore temporal variability and recurring seasonal patterns.

### 2. Annual Rainfall Aggregation

Annual rainfall totals are calculated from complete calendar years.

For the long-term trend analysis, the period 2000–2024 is used to avoid treating the incomplete 2025 record as a full annual total.

### 3. Sen’s Slope Estimator

Sen’s slope is a non-parametric method used to estimate the magnitude and direction of a monotonic trend.

It calculates the median of the slopes between pairs of observations.

A positive slope indicates an estimated increase in rainfall over time, while a negative slope indicates an estimated decrease.

### 4. Mann–Kendall Test

The Mann–Kendall test is used to evaluate whether a monotonic trend is statistically significant.

The analysis uses a significance threshold of:

**α = 0.05**

A p-value below this threshold indicates statistically significant evidence of a monotonic trend under the test assumptions.

A p-value above this threshold indicates that the null hypothesis cannot be rejected at the selected significance level. It does not establish that no trend exists.

## Preliminary Findings

The current annual rainfall trend analysis produces the following estimates:

| Statistical Measure | Result |
|---|---:|
| Sen’s Slope | +14.04 mm/year |
| Mann–Kendall p-value | 0.1176 |
| Significance Threshold | 0.05 |
| Estimated Trend Direction | Upward |
| Statistical Significance | Not significant |

The estimated Sen’s slope suggests an upward tendency in annual rainfall across the analyzed period.

However, the Mann–Kendall p-value is greater than the 0.05 significance threshold. Therefore, the observed upward trend is not statistically significant at the 5% level.

These results are exploratory and describe the analyzed dataset. They should not be interpreted as proof of climate change, causal attribution, or a prediction of future rainfall.

## Technology Stack

| Technology | Purpose |
|---|---|
| React | Component-based user interface |
| Vite | Frontend development and build tooling |
| JavaScript | Data processing and statistical calculations |
| CSS | Styling and responsive design |
| Recharts | Interactive data visualization |
| PapaParse | CSV parsing |
| Lucide Icons | Interface iconography |
| Google Earth Engine | Geospatial data processing |

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

Additional assets, stylesheets, and components may be present in the repository.

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

Build the application:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Limitations

- The analysis is limited to the temporal coverage and characteristics of the selected NASA precipitation dataset.
- The regional rainfall series represents an aggregation over the selected geographical boundary.
- Statistical significance depends on the analyzed time period and the assumptions of the statistical methods.
- A statistically nonsignificant result does not establish the absence of a rainfall trend.
- The project does not independently attribute rainfall changes to climate change.
- The application is intended for exploratory data analysis and public education, not operational weather forecasting.

## Intended Impact

Know Your Kerala aims to bridge the gap between scientific Earth observation datasets and everyday users.

By focusing on Kerala and combining statistical analysis with accessible visual storytelling, the project encourages users to explore local environmental patterns, engage with NASA data, and develop evidence-based questions about rainfall variability.

The project emphasizes regional accessibility, scientific transparency, and public engagement with Earth system data.

## Acknowledgements

Developed for the **2026 NASA Space Apps Challenge**.

The project acknowledges NASA’s Global Precipitation Measurement mission as the source of its precipitation dataset.

The application was developed using open-source software libraries and tools, including React, Vite, Recharts, PapaParse, and Lucide Icons.


