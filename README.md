# Bikewatching

Bikewatching is a small, fully client-side web app that visualizes Boston’s Bluebikes station activity on top of the city’s existing bike network. It combines **Mapbox GL JS** for the basemap and **D3.js** for an SVG overlay that shows how busy each station is and whether it sees more **departures** or **arrivals** over time.

---

## Features

- 🗺️ **Interactive Map**
  - Mapbox base map centered on Boston.
  - Existing bike network (2022) drawn as a green line layer.

- 🚲 **Station Activity Visualization**
  - Each Bluebikes station is drawn as a circle.
  - Circle **size** encodes total trip volume (arrivals + departures).
  - Circle **color** encodes balance:
    - More departures
    - Balanced
    - More arrivals

- ⏰ **Time-of-Day Filtering**
  - Time slider that filters trips to a 2-hour window around the selected time.
  - Default state shows **all times** (“any time” label).
  - The map rescales circle sizes dynamically based on filtered data.

- 🛈 **Interactive Tooltips & Legend**
  - Hover over a station to see:
    - Station name
    - Departures
    - Arrivals
    - Total traffic
  - Legend explaining the color encoding of arrivals vs departures.

---

## Tech Stack

- **HTML / CSS / JavaScript** (no build step required)
- **Mapbox GL JS** (v2.x) – basemap & vector rendering
- **D3.js** (v7.x) – SVG overlay, scales, and data joins

External libraries are loaded directly from CDNs as ES modules:
- `mapbox-gl` from jsDelivr
- `d3` from jsDelivr

---

## Data Sources

The app currently pulls data directly from remote URLs (no local backend):

- **Bike network (line layer)**  
  Existing bike network 2022 GeoJSON from the City of Boston Open Data portal:  
  `https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson`

- **Bluebikes stations**  
  JSON metadata for all Bluebikes stations:  
  `https://dsc106.com/labs/lab07/data/bluebikes-stations.json`

- **Bluebikes trip traffic (March 2024)**  
  Preprocessed CSV of aggregated station traffic:  
  `https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv`

There is also a local copy of the bike network in:

- `datasets/Existing_Bike_Network_2022.geojson`  

This can be used if you’d like to point the map to a local dataset instead of the remote one.

---

## Project Structure

```text
bikewatching-main/
├─ assets/
│  └─ favicon.svg             # Site favicon
├─ datasets/
│  └─ Existing_Bike_Network_2022.geojson  # Local copy of Boston bike network
├─ global.css                 # Global styles for layout, map UI, tooltips, legend, etc.
├─ index.html                 # Main HTML entrypoint
└─ map.js                     # Mapbox + D3 logic and interactivity
