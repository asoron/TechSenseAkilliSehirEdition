import React, { useEffect, useState, useContext, useRef } from 'react';
import { MapContainer, TileLayer, useMap, Popup, Marker } from 'react-leaflet';
import L from 'leaflet';
// Import Leaflet.heat directly after import L
import 'leaflet/dist/leaflet.css';

// Import Leaflet.heat after importing Leaflet so it attaches to L
import 'leaflet.heat';

import { DataContext } from '../contexts/DataContext';
import { generateHeatmapData, getValueColor, sensorDisplayInfo, checkAlertLevel } from '../utils/dataUtils';

// Kırmızı ve sarı ünlem ikonları için URL'ler
const YELLOW_ALERT_ICON = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png';
const RED_ALERT_ICON = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png';
const SHADOW_URL = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png';

// Uyarı ikonları
const yellowAlertIcon = new L.Icon({
  iconUrl: YELLOW_ALERT_ICON,
  shadowUrl: SHADOW_URL,
  iconSize: [30, 45], // Biraz daha büyük
  iconAnchor: [15, 45],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const redAlertIcon = new L.Icon({
  iconUrl: RED_ALERT_ICON,
  shadowUrl: SHADOW_URL,
  iconSize: [35, 50], // Kırmızı ikonu sarıdan daha büyük yap
  iconAnchor: [17, 50],
  popupAnchor: [1, -34],
  shadowSize: [45, 45], // Gölgeyi de büyüt
  className: 'red-alert-icon' // Özel CSS sınıfı ekledik
});

// Add these styles to ensure the map container is visible
const mapContainerStyle = {
  width: '100%',
  height: '100vh',
  position: 'absolute',
  top: 0,
  left: 0
};

// Constants for Ankara's boundaries
const ANKARA_CENTER = [39.9208, 32.8541]; // Kızılay merkez
const ANKARA_BOUNDS = [
  [39.70, 32.50], // Southwest corner
  [40.10, 33.15]  // Northeast corner
];

// Define color gradients for different sensor types with more vibrant colors
const HEATMAP_GRADIENTS = {
  // Air quality sensors - each with a distinct color palette
  'PM2.5_ug_m3': { 0.3: '#ffff00', 0.5: '#ff9900', 0.7: '#ff3300', 0.9: '#cc0000', 1: '#990000' }, // Yellow to Red
  'PM10_ug_m3': { 0.3: '#ccffcc', 0.5: '#00cc66', 0.7: '#009933', 0.9: '#006622', 1: '#004400' },  // Light Green to Dark Green
  'CO_ppm': { 0.3: '#ccccff', 0.5: '#9999ff', 0.7: '#6666ff', 0.9: '#3333cc', 1: '#0000aa' },      // Light Blue to Dark Blue
  'NO2_ppb': { 0.3: '#ffccff', 0.5: '#ff99ff', 0.7: '#ff66ff', 0.9: '#cc33cc', 1: '#990099' },     // Light Purple to Dark Purple
  'SO2_ppb': { 0.3: '#ffffcc', 0.5: '#ffcc99', 0.7: '#ff9966', 0.9: '#ff6633', 1: '#cc3300' },     // Light Orange to Dark Orange
  'O3_ppb': { 0.3: '#ccffff', 0.5: '#99ffff', 0.7: '#33cccc', 0.9: '#339999', 1: '#006666' },      // Light Cyan to Dark Cyan
  'VOC_ppb': { 0.3: '#ffcccc', 0.5: '#ff9999', 0.7: '#ff6666', 0.9: '#ff3333', 1: '#cc0000' },     // Light Red to Dark Red
  
  // Environmental parameters - distinctive colors
  'Temperature_C': { 0.3: '#0000ff', 0.5: '#00ffff', 0.6: '#ffffff', 0.7: '#ffff00', 0.8: '#ff0000', 1: '#990000' }, // Blue to White to Red
  'Relative_Humidity_Percent': { 0.3: '#ccffff', 0.5: '#66ccff', 0.7: '#0099ff', 0.9: '#0066cc', 1: '#003399' },     // Light Blue Shades
  'Sound_Level_dB': { 0.3: '#99ff99', 0.5: '#33cc33', 0.7: '#009900', 0.8: '#9900cc', 1: '#660099' },                // Green to Purple
  'Light_Level_lux': { 0.3: '#ffffcc', 0.5: '#ffff66', 0.7: '#ffcc00', 0.9: '#ff6600', 1: '#cc3300' },               // Light Yellow to Orange
  
  // Other measurements - unique colors
  'Vibration_g': { 0.3: '#f0f0ff', 0.5: '#9999ff', 0.7: '#6666ff', 0.9: '#3333cc', 1: '#000099' },                   // Light Blue to Navy
  'Radiation_uSv_h': { 0.3: '#ccffcc', 0.5: '#99ff99', 0.7: '#66cc66', 0.9: '#339933', 1: '#006600' }                // Light Green to Forest Green
};

// Size and intensity configuration for heatmaps
const HEATMAP_CONFIG = {
  // Air quality sensors
  'PM2.5_ug_m3': { radius: 45, blur: 20, baseOpacity: 0.45 },
  'PM10_ug_m3': { radius: 40, blur: 20, baseOpacity: 0.45 },
  'CO_ppm': { radius: 42, blur: 20, baseOpacity: 0.45 },
  'NO2_ppb': { radius: 43, blur: 22, baseOpacity: 0.45 },
  'SO2_ppb': { radius: 38, blur: 18, baseOpacity: 0.45 },
  'O3_ppb': { radius: 44, blur: 22, baseOpacity: 0.45 },
  'VOC_ppb': { radius: 40, blur: 20, baseOpacity: 0.45 },
  
  // Environmental parameters
  'Temperature_C': { radius: 50, blur: 25, baseOpacity: 0.5 },
  'Relative_Humidity_Percent': { radius: 48, blur: 24, baseOpacity: 0.5 },
  'Sound_Level_dB': { radius: 35, blur: 18, baseOpacity: 0.45 },
  'Light_Level_lux': { radius: 38, blur: 20, baseOpacity: 0.45 },
  
  // Other measurements
  'Vibration_g': { radius: 30, blur: 15, baseOpacity: 0.4 },
  'Radiation_uSv_h': { radius: 35, blur: 20, baseOpacity: 0.4 },
  
  // Default values for sensors not specifically defined
  default: { radius: 40, blur: 20, baseOpacity: 0.45 }
};

// Default radius and blur values for heatmap - increased for better visibility
const DEFAULT_RADIUS = 40;
const DEFAULT_BLUR = 15;
const ANOMALY_RADIUS = 30;
const ANOMALY_BLUR = 20;

// Component to store map instance in window object
const MapController = ({ selectedCity }) => {
  const map = useMap();
  const { citySettings } = useContext(DataContext);
  const [lastCity, setLastCity] = useState(null);
  
  useEffect(() => {
    // Store map instance in window for access by other components
    window.leafletMap = map;
    console.log("Map instance stored in window.leafletMap");
    
    return () => {
      // Cleanup on unmount
      window.leafletMap = null;
    };
  }, [map]);

  // Şehir değişikliğini ayrı bir useEffect'te işle ve animasyonsuz yap
  useEffect(() => {
    if (!map || !selectedCity || !citySettings[selectedCity]) return;
    
    // Aynı şehire tekrar tekrar geçilmesini önle
    if (lastCity === selectedCity) return;
    
    // Haritanın hazır olduğundan emin ol ve hataları yakala
    try {
      console.log(`Harita ${citySettings[selectedCity].name} için güncelleniyor...`);
      
      // Animasyonsuz geçiş yap ve güvenli bir şekilde güncelle
      setTimeout(() => {
        if (map && map._loaded) {
          // Önce harita sınırlarını güncelle
          map.setMaxBounds(citySettings[selectedCity].bounds);
          
          // Sonra görünümü animasyonsuz güncelle
          map.setView(citySettings[selectedCity].center, 11, {
            animate: false,
            duration: 0
          });
          
          console.log(`Harita ${citySettings[selectedCity].name} için güncellendi`);
          setLastCity(selectedCity);
        }
      }, 100);
    } catch (error) {
      console.error("Harita güncellenirken hata:", error);
    }
  }, [map, selectedCity, citySettings, lastCity]);
  
  return null;
};

// Component to handle creation and updating of heatmap layers
const HeatmapLayer = ({ sensorId, data, isAnomalyFn, totalActiveSensors = 1 }) => {
  const map = useMap();
  const heatLayerRef = useRef(null);
  const alertMarkersRef = useRef([]);
  const [popupContent, setPopupContent] = useState(null);
  const [popupPosition, setPopupPosition] = useState(null);
  const { selectedHour } = useContext(DataContext);

  // Log debug information
  useEffect(() => {
    console.log(`HeatmapLayer for ${sensorId}: data points = ${data ? data.length : 0}`);
  }, [sensorId, data]);

  // Get sensor info for display
  const sensorInfo = sensorDisplayInfo[sensorId] || { name: sensorId, unit: '' };

  // Burada alertMarkers değişkenini tanımlayalım
  useEffect(() => {
    // Önceki markerleri temizle
    alertMarkersRef.current.forEach(marker => {
      if (map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    });
    alertMarkersRef.current = [];

    if (data && data.length > 0) {
      console.log(`Creating heatmap layer for ${sensorId} with ${data.length} points`);
      
      // Alert markers için veri hazırla
      const alertPoints = [];
      const alertValues = {};
      
      // Uyarı noktalarını grid hücrelerine gruplandırmak için
      const gridSize = 0.001; // Yaklaşık 100m grid hücre büyüklüğü
      const gridCells = {};
      
      data.forEach(item => {
        // Sensör değerini al
        const value = parseFloat(item[sensorId]);
        if (isNaN(value)) return;
        
        const lat = parseFloat(item.Latitude);
        const lng = parseFloat(item.Longitude);
        if (!isFinite(lat) || !isFinite(lng)) return;
        
        // Uyarı seviyesini kontrol et
        const alertLevel = checkAlertLevel(sensorId, value, selectedHour);
        
        if (alertLevel) {
          // Grid hücresi anahtarı oluştur (koordinatları yuvarla)
          const gridKey = `${Math.floor(lat/gridSize)*gridSize},${Math.floor(lng/gridSize)*gridSize}`;
          
          // Bu grid hücresinde daha önce bir uyarı var mı kontrol et
          if (!gridCells[gridKey]) {
            gridCells[gridKey] = {
              count: 0,
              warningCount: 0,
              dangerCount: 0,
              lat: lat,
              lng: lng,
              points: []
            };
          }
          
          // Bu grid hücresine uyarıyı ekle
          gridCells[gridKey].count++;
          
          if (alertLevel === 'warning') {
            gridCells[gridKey].warningCount++;
          } else if (alertLevel === 'danger') {
            gridCells[gridKey].dangerCount++;
          }
          
          // Uyarı değerini grid hücresindeki noktalara ekle
          gridCells[gridKey].points.push({
            value,
            level: alertLevel,
            ikaId: item.Ika_ID || 'Unknown'
          });
          
          // Hücrenin merkez koordinatını güncelle (ortalama al)
          gridCells[gridKey].lat = (gridCells[gridKey].lat * (gridCells[gridKey].count - 1) + lat) / gridCells[gridKey].count;
          gridCells[gridKey].lng = (gridCells[gridKey].lng * (gridCells[gridKey].count - 1) + lng) / gridCells[gridKey].count;
        }
      });
      
      // Her grid hücresi için tek bir marker oluştur
      Object.keys(gridCells).forEach(key => {
        const cell = gridCells[key];
        
        // Eğer hücrede tehlike uyarısı varsa kırmızı icon kullan, yoksa sarı
        const hasDanger = cell.dangerCount > 0;
        const alertIcon = hasDanger ? redAlertIcon : yellowAlertIcon;
        
        const marker = L.marker([cell.lat, cell.lng], { icon: alertIcon })
          .addTo(map)
          .on('click', () => {
            // Popup içeriğini hazırla - bu hücredeki tüm noktalar için
            const firstPoint = cell.points[0]; // İlk noktayı temel bilgiler için kullan
            
            // Tehlikeli noktaları öne çıkar
            const dangerPoints = cell.points.filter(p => p.level === 'danger');
            const warningPoints = cell.points.filter(p => p.level === 'warning');
            const sortedPoints = [...dangerPoints, ...warningPoints];
            
            setPopupContent({
              value: firstPoint.value,
              isAlert: true,
              alertLevel: hasDanger ? 'danger' : 'warning',
              sensorInfo,
              ikaId: firstPoint.ikaId,
              count: cell.count,
              multiplePoints: cell.count > 1,
              points: sortedPoints
            });
            setPopupPosition([cell.lat, cell.lng]);
          });
        
        alertMarkersRef.current.push(marker);
      });
      
      console.log(`Added ${alertMarkersRef.current.length} alert markers for ${sensorId} (grouped from ${Object.values(gridCells).reduce((sum, cell) => sum + cell.count, 0)} alerts)`);

      try {
        // Check if L.heatLayer is available
        if (typeof L.heatLayer !== 'function') {
          console.error('L.heatLayer is not available. Make sure leaflet.heat is properly loaded.');
          return;
        }
        
        // Remove existing heatmap layer if it exists
        if (heatLayerRef.current) {
          map.removeLayer(heatLayerRef.current);
          heatLayerRef.current = null;
        }
        
        // Get heatmap data using the utility function that includes intensity
        const heatmapPoints = generateHeatmapData(data, sensorId, isAnomalyFn);
        
        if (heatmapPoints.length === 0) {
          console.log(`No data points for ${sensorId}`);
          return;
        }
        
        console.log(`Using ${heatmapPoints.length} original data points for ${sensorId}`);
                
        // Create custom pane for heatmap if not exists
        if (!map.getPane('heatmapPane')) {
          map.createPane('heatmapPane');
          map.getPane('heatmapPane').style.zIndex = 450; // Above tile layers but below popups
        }
        
        // Sensör bazlı özel yapılandırma
        const config = HEATMAP_CONFIG[sensorId] || HEATMAP_CONFIG.default;
        
        // Aktif sensör sayısına göre opaklığı ayarla
        let opacity = config.baseOpacity;
        if (totalActiveSensors > 3) {
          opacity *= 0.8; // Çok sayıda sensör varsa opaklığı azalt
        } else if (totalActiveSensors > 1) {
          opacity *= 0.9; // Birkaç sensör varsa opaklığı biraz azalt
        }
        
        // Anomali durumuna göre radius ve blur ayarları
        const radius = isAnomalyFn ? (config.radius * 0.75) : config.radius;
        const blur = isAnomalyFn ? (config.blur * 0.8) : config.blur;
        
        // Create a new heatmap layer with the updated data
        const heatLayer = L.heatLayer(heatmapPoints, {
          radius: radius,
          blur: blur,
          pane: 'heatmapPane',
          minOpacity: opacity,
          gradient: HEATMAP_GRADIENTS[sensorId] || { 0.2: 'blue', 0.4: 'cyan', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red' }
        });

        // Add the layer to the map
        heatLayer.addTo(map);
        heatLayerRef.current = heatLayer;
        console.log(`Successfully added heatmap layer for ${sensorId} with radius=${radius}, blur=${blur}, opacity=${opacity}`);
        
        // Add click handler for showing data at locations
        map.on('click', (e) => {
          // Find the closest data point to the click position
          const clickLatLng = e.latlng;
          let closestPoint = null;
          let minDistance = Infinity;

          data.forEach(item => {
            if (item[sensorId] === undefined) return;
            
            // Use original coordinates without parsing
            const itemLatLng = L.latLng(item.Latitude, item.Longitude);
            const distance = clickLatLng.distanceTo(itemLatLng);
            
            if (distance < minDistance) {
              minDistance = distance;
              closestPoint = item;
            }
          });

          if (closestPoint && minDistance < 1000) { // Only show popup if within 1km
            const value = parseFloat(closestPoint[sensorId]);
            const isAnomaly = isAnomalyFn ? isAnomalyFn(sensorId, value) : false;
            const alertLevel = checkAlertLevel(sensorId, value, selectedHour);
            
            setPopupContent({
              value,
              isAnomaly,
              isAlert: !!alertLevel,
              alertLevel,
              sensorInfo,
              ikaId: closestPoint.Ika_ID || 'Unknown'
            });
            setPopupPosition([closestPoint.Latitude, closestPoint.Longitude]);
          }
        });
      } catch (error) {
        console.error(`Error creating heatmap layer for ${sensorId}:`, error);
      }
    } else {
      console.log(`No points to display for ${sensorId}`);
    }

    // Cleanup function to remove the layer when component unmounts or updates
    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
      
      // Uyarı işaretçilerini temizle
      alertMarkersRef.current.forEach(marker => {
        if (map.hasLayer(marker)) {
          map.removeLayer(marker);
        }
      });
      alertMarkersRef.current = [];
      
      // Remove event listeners
      map.off('click');
    };
  }, [map, data, sensorId, isAnomalyFn, sensorInfo, totalActiveSensors, selectedHour]);

  return (
    <>
      {popupContent && popupPosition && (
        <Popup position={popupPosition}>
          <div className="anomaly-info">
            <h4 style={{ 
              margin: '0 0 8px 0', 
              color: popupContent.alertLevel === 'danger' ? '#d32f2f' : 
                     popupContent.alertLevel === 'warning' ? '#f57c00' : 
                     popupContent.isAnomaly ? '#9c27b0' : '#2e7d32' 
            }}>
              {popupContent.sensorInfo.name}
              {popupContent.isAnomaly && !popupContent.isAlert && ' (ANOMALY)'}
              {popupContent.alertLevel === 'warning' && ' (UYARI)'}
              {popupContent.alertLevel === 'danger' && ' (TEHLİKE)'}
            </h4>
            
            {popupContent.multiplePoints ? (
              <>
                <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
                  Bu alanda {popupContent.count} uyarı noktası bulundu:
                </p>
                <div style={{ maxHeight: '150px', overflowY: 'auto', margin: '5px 0' }}>
                  {popupContent.points.map((point, idx) => (
                    <div key={idx} style={{ 
                      padding: '5px', 
                      marginBottom: '5px', 
                      backgroundColor: point.level === 'danger' ? 'rgba(211, 47, 47, 0.1)' : 'rgba(245, 124, 0, 0.1)',
                      borderLeft: `3px solid ${point.level === 'danger' ? '#d32f2f' : '#f57c00'}`
                    }}>
                      <strong style={{ color: point.level === 'danger' ? '#d32f2f' : '#f57c00' }}>
                        {point.level === 'danger' ? 'TEHLİKE' : 'UYARI'}:
                      </strong> {point.value.toFixed(2)} {popupContent.sensorInfo.unit} 
                      <br />
                      <small>Cihaz: {point.ikaId}</small>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p style={{ margin: '0 0 5px 0' }}>
                  <strong>Değer:</strong> {popupContent.value.toFixed(2)} {popupContent.sensorInfo.unit}
                </p>
                <p style={{ margin: '0 0 5px 0' }}>
                  <strong>Cihaz:</strong> {popupContent.ikaId}
                </p>
              </>
            )}
            
            {popupContent.isAnomaly && !popupContent.isAlert && (
              <p style={{ margin: '0', fontSize: '0.9em', color: '#9c27b0' }}>
                Bu değer, bu saat için beklenen aralığın dışında.
              </p>
            )}
            {popupContent.alertLevel === 'warning' && (
              <p style={{ margin: '0', fontSize: '0.9em', color: '#f57c00', fontWeight: 'bold' }}>
                Bu değer, normal aralığın üzerinde. Dikkatli olunmalı.
              </p>
            )}
            {popupContent.alertLevel === 'danger' && (
              <p style={{ margin: '0', fontSize: '0.9em', color: '#d32f2f', fontWeight: 'bold' }}>
                Bu değer, sağlık için tehlikeli seviyelerde! Önlem alınmalı.
              </p>
            )}
          </div>
        </Popup>
      )}
    </>
  );
};

// Main Map component
const Map = ({ activeSensors }) => {
  const { filteredData, isAnomaly, selectedCity, citySettings } = useContext(DataContext);
  
  // Şehir bilgilerini al, varsayılan olarak Ankara'yı kullan
  const currentCity = citySettings[selectedCity] || citySettings.ankara;
  
  useEffect(() => {
    console.log("Map component rendered with data:", filteredData?.length);
    console.log("Active sensors:", activeSensors);
    console.log("Selected city:", selectedCity);
  }, [filteredData, activeSensors, selectedCity]);

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <MapContainer 
        key={`map-container-${currentCity.name}`} // Şehir değiştiğinde tamamen yeni Map oluştur
        center={currentCity.center} 
        zoom={11} 
        maxBounds={currentCity.bounds} 
        minZoom={10}
        maxZoom={17}
        zoomSnap={0.5}
        preferCanvas={true}
        scrollWheelZoom={true}
        style={mapContainerStyle}
      >
        <MapController selectedCity={selectedCity} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {activeSensors && activeSensors.length > 0 && filteredData && filteredData.length > 0 && (
          <>
            {activeSensors.map(sensorId => (
              <HeatmapLayer 
                key={sensorId} 
                sensorId={sensorId} 
                data={filteredData}
                isAnomalyFn={isAnomaly}
                totalActiveSensors={activeSensors.length}
              />
            ))}
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default Map; 