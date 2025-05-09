# Istanbul Urban Insights: Interactive Sensor Data & Anomaly Heatmap Dashboard

An interactive web application for visualizing urban quality sensor data collected by multiple UAVs across Istanbul, with intelligent highlighting of anomalous data points.

![Istanbul Urban Insights Dashboard](https://via.placeholder.com/1200x600.png?text=Istanbul+Urban+Insights+Dashboard)

## Features

- **Interactive Map Display**: Explore Istanbul with a base map that supports smooth panning and zooming.
- **Sensor Data Heatmap Layers**: Overlay various sensor readings (e.g., PM2.5, Temperature, Sound Level) as heatmap layers.
- **Time-Based Data Exploration**: Select a specific hour from the 24-hour dataset and watch the heatmap update in real-time.
- **Intelligent Anomaly Visualization**: Heatmaps highlight anomalous readings with distinct colors and intensities, making them visually prominent.
- **User-Friendly Interface**: Intuitive controls and clear visual feedback for exploring the data.

## Sensor Data Available

The application visualizes data from various sensors, including:

- **Air Quality**: PM2.5, PM10, CO, NO2, SO2, O3, VOC
- **Environmental Conditions**: Temperature, Humidity, Sound Level, Light Level
- **Other Measurements**: Vibration, Radiation

## Getting Started

### Prerequisites

- Node.js (version 14.0.0 or later)
- npm (version 6.0.0 or later)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/istanbul-urban-insights.git
   cd istanbul-urban-insights
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Usage Guide

### Map Navigation

- **Zoom**: Use the mouse wheel or the "+" and "-" buttons
- **Pan**: Click and drag the map

### Layer Selection

- Use the control panel on the top-left to toggle different sensor data layers
- Each sensor type is grouped by category for easier navigation

### Time Selection

- Use the slider at the bottom-right to select a specific hour (00:00 through 23:00)
- Click the Play button to animate through the 24-hour period
- Click Pause to stop the animation

### Identifying Anomalies

- Anomalous data points are highlighted with more intense colors on the heatmap
- Hover over any area to see the specific reading values
- Readings that are significantly outside the expected range for that time are labeled as anomalies

## Data Source

The application uses a simulated dataset of hourly readings from 50 UAVs over a 24-hour period. The dataset includes various sensor readings such as air quality measurements, temperature, humidity, sound levels, and more.

## Technologies Used

- **Frontend Framework**: React.js
- **Mapping Library**: Leaflet with React-Leaflet
- **Heatmap Visualization**: Leaflet.heat
- **UI Components**: Material-UI
- **Data Processing**: PapaParse for CSV parsing, D3 for data manipulation

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenStreetMap for providing the base map
- Leaflet.js for the interactive mapping capabilities
- Material-UI for the responsive UI components
