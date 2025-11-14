// Import Mapbox + D3 as ESM modules
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

mapboxgl.accessToken =
  'pk.eyJ1Ijoic3RlcGhhbmllcGF0cmljaWFhbnMiLCJhIjoiY21oejZkejg5MGppaDJsb2xzOXM2eWtzNiJ9.HawBs904Ln6jsR1KXKBeeQ';

// ================================================================================================================
// Base map
// ================================================================================================================
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12', 
  center: [-71.09415, 42.36027],
  zoom: 12,
  minZoom: 2,
  maxZoom: 18,
});

map.addControl(new mapboxgl.NavigationControl(), 'top-right');

// ================================================================================================================
// Helper functions
// ================================================================================================================

// Compute arrivals/departures/total per station
function computeStationTraffic(stations, trips) {
  const departures = d3.rollup(
    trips,
    (v) => v.length,
    (d) => d.start_station_id
  );

  const arrivals = d3.rollup(
    trips,
    (v) => v.length,
    (d) => d.end_station_id
  );

  return stations.map((station) => {
    const id = station.short_name;
    const dep = departures.get(id) ?? 0;
    const arr = arrivals.get(id) ?? 0;
    station.departures = dep;
    station.arrivals = arr;
    station.totalTraffic = dep + arr;
    return station;
  });
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function filterTripsByTime(trips, timeFilter) {
  if (timeFilter === -1) return trips;

  return trips.filter((trip) => {
    const startedMinutes = minutesSinceMidnight(trip.started_at);
    const endedMinutes = minutesSinceMidnight(trip.ended_at);
    return (
      Math.abs(startedMinutes - timeFilter) <= 60 ||
      Math.abs(endedMinutes - timeFilter) <= 60
    );
  });
}

function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes);
  return date.toLocaleString('en-US', { timeStyle: 'short' });
}

// ================================================================================================================
// Main map logic
// ================================================================================================================
map.on('load', async () => {
  try {

    // ----------------------------------------------------------
    // 1) Bike lanes
    // ----------------------------------------------------------
    map.addSource('boston_route', {
      type: 'geojson',
      data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
    });

    map.addLayer({
      id: 'bike-lanes',
      type: 'line',
      source: 'boston_route',
      paint: {
        'line-color': '#32D400',
        'line-width': 3,
        'line-opacity': 0.6,
      },
    });

    // ----------------------------------------------------------
    // 2) Load station + trips data
    // ----------------------------------------------------------
    const stationUrl =
      'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
    const stationJson = await d3.json(stationUrl);
    const baseStations = stationJson.data.stations;

    let trips = await d3.csv(
      'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv',
      (trip) => {
        trip.started_at = new Date(trip.started_at);
        trip.ended_at = new Date(trip.ended_at);
        return trip;
      }
    );

    let stations = computeStationTraffic(baseStations, trips);

    const svg = d3.select('#map').select('svg');

    function getCoords(station) {
      const lng = +station.lon;
      const lat = +station.lat;
      const point = new mapboxgl.LngLat(lng, lat);
      const { x, y } = map.project(point);
      return { x, y };
    }

    // ----------------------------------------------------------
    // 3) Scales
    // ----------------------------------------------------------
    const radiusScale = d3
      .scaleSqrt()
      .domain([0, d3.max(stations, (d) => d.totalTraffic) || 1])
      .range([0, 25]);

    const stationFlow = d3.scaleQuantize()
      .domain([0, 1])
      .range([0, 0.5, 1]); 

    // ----------------------------------------------------------
    // 4) Circles
    // ----------------------------------------------------------
    let circles = svg
      .selectAll('circle')
      .data(stations, (d) => d.short_name)
      .join('circle')
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('fill', 'steelblue')
      .attr('opacity', 0.6)
      .attr('r', (d) => radiusScale(d.totalTraffic))
      .style(
        '--departure-ratio',
        (d) =>
          stationFlow(
            d.totalTraffic ? d.departures / d.totalTraffic : 0.5
          )
      );

    function updatePositions() {
      circles
        .attr('cx', (d) => getCoords(d).x)
        .attr('cy', (d) => getCoords(d).y);
    }

    map.on('move', updatePositions);
    map.on('zoom', updatePositions);
    map.on('resize', updatePositions);
    map.on('moveend', updatePositions);
    updatePositions();

    // ----------------------------------------------------------
    // 5) Tooltip 
    // ----------------------------------------------------------
    const tooltip = d3.select('#tooltip');

    function showTooltip(event, d) {
      tooltip
        .attr('hidden', null)
        .style('left', `${event.clientX + 10}px`)
        .style('top', `${event.clientY + 10}px`)
        .text(
          `${d.totalTraffic} trips · ${d.departures} departures · ${d.arrivals} arrivals`
        );
    }

    function hideTooltip() {
      tooltip.attr('hidden', true);
    }

    circles
      .on('mouseenter', showTooltip)
      .on('mousemove', showTooltip)
      .on('mouseleave', hideTooltip);

    // ----------------------------------------------------------
    // 6) Time slider + label
    // ----------------------------------------------------------
    const timeSlider = document.getElementById('time-slider');
    const selectedTime = document.getElementById('selected-time');
    const anyTimeLabel = document.getElementById('any-time');

    function updateScatterPlot(timeFilter) {
      const filteredTrips = filterTripsByTime(trips, timeFilter);
      const filteredStations = computeStationTraffic(
        baseStations,
        filteredTrips
      );

      // Update radius scale range
      if (timeFilter === -1) {
        radiusScale.range([0, 25]);
      } else {
        radiusScale.range([3, 50]);
      }

      radiusScale.domain([
        0,
        d3.max(filteredStations, (d) => d.totalTraffic) || 1,
      ]);

      // Update bound data
      circles = circles.data(filteredStations, (d) => d.short_name);

      circles
        .attr('r', (d) => radiusScale(d.totalTraffic))
        .style(
          '--departure-ratio',
          (d) =>
            stationFlow(
              d.totalTraffic ? d.departures / d.totalTraffic : 0.5
            )
        );

      updatePositions();
    }

    function updateTimeDisplay() {
      const value = Number(timeSlider.value);

      if (value === -1) {
        selectedTime.textContent = '';
        anyTimeLabel.style.display = 'inline';
      } else {
        selectedTime.textContent = formatTime(value);
        anyTimeLabel.style.display = 'none';
      }

      updateScatterPlot(value);
    }

    timeSlider.addEventListener('input', updateTimeDisplay);
    updateTimeDisplay();
  } 
  catch (error) {
    console.error('Error loading data:', error);
  }
});
