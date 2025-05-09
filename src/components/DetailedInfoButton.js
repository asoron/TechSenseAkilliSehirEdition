import React, { useState, useEffect, useContext } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Divider, Paper, Tabs, Tab, Grid } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import MapIcon from '@mui/icons-material/Map';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis, ReferenceLine } from 'recharts';
import { DataContext } from '../contexts/DataContext';

// Panel özelleştirme için TabPanel bileşeni
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
      style={{ padding: '16px 0' }}
    >
      {value === index && (
        <Box>
          {children}
        </Box>
      )}
    </div>
  );
}

const DetailedInfoSelector = ({ map, onSelection, onCancelSelection }) => {
  useEffect(() => {
    if (!map) return;

    // Ensure the Leaflet.Draw library is loaded
    if (!L.drawVersion) {
      console.error("Leaflet.Draw kütüphanesi düzgün yüklenmedi");
      return;
    }

    // Create a new FeatureGroup for the drawing layer
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // Create drawing options
    const drawOptions = {
      draw: {
        polygon: false,
        polyline: false,
        circle: false,
        marker: false,
        circlemarker: false,
        rectangle: {
          shapeOptions: {
            color: '#3388ff',
            weight: 3,
            opacity: 0.8,
            fillOpacity: 0.2
          }
        }
      },
      edit: false
    };

    // Initialize the rectangle draw control
    let drawControl;
    try {
      // Try to create the Draw control
      drawControl = new L.Control.Draw(drawOptions);
      map.addControl(drawControl);
    } catch (error) {
      console.error("Çizim kontrolü oluşturulurken hata:", error);
      
      // Alternative approach - manually create a custom control for rectangle selection
      const customDrawControl = L.Control.extend({
        options: {
          position: 'topleft'
        },
        
        onAdd: function(map) {
          const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
          const button = L.DomUtil.create('a', 'leaflet-custom-draw', container);
          button.href = '#';
          button.title = 'Dikdörtgen çiz';
          button.innerHTML = '⬛';
          button.style.fontSize = '18px';
          button.style.width = '30px';
          button.style.height = '30px';
          button.style.lineHeight = '30px';
          button.style.textAlign = 'center';
          button.style.backgroundColor = 'white';
          button.style.color = '#3388ff';
          
          L.DomEvent
            .on(button, 'click', L.DomEvent.stopPropagation)
            .on(button, 'click', L.DomEvent.preventDefault)
            .on(button, 'click', () => {
              // Start drawing a rectangle
              map.dragging.disable();
              
              let startPoint = null;
              let rectangle = null;
              
              const onMouseDown = (e) => {
                startPoint = e.latlng;
                rectangle = L.rectangle([startPoint, startPoint], {
                  color: '#3388ff',
                  weight: 3,
                  opacity: 0.8,
                  fillOpacity: 0.2
                }).addTo(drawnItems);
              };
              
              const onMouseMove = (e) => {
                if (startPoint && rectangle) {
                  rectangle.setBounds([startPoint, e.latlng]);
                }
              };
              
              const onMouseUp = (e) => {
                if (startPoint && rectangle) {
                  map.off('mousedown', onMouseDown);
                  map.off('mousemove', onMouseMove);
                  map.off('mouseup', onMouseUp);
                  
                  map.dragging.enable();
                  
                  // Create selection bounds
                  const bounds = rectangle.getBounds();
                  onSelection(bounds);
                }
              };
              
              map.on('mousedown', onMouseDown);
              map.on('mousemove', onMouseMove);
              map.on('mouseup', onMouseUp);
            });
          
          return container;
        }
      });
      
      map.addControl(new customDrawControl());
    }

    // Event handler for when drawing is completed
    map.on('draw:created', (e) => {
      const layer = e.layer;
      drawnItems.addLayer(layer);
      
      // Get the bounds of the drawn rectangle
      const bounds = layer.getBounds();
      
      // Call the callback with the selection bounds
      onSelection(bounds);
    });

    // Add ESC key event listener to cancel selection
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancelSelection();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup function
    return () => {
      if (drawnItems) {
        map.removeLayer(drawnItems);
      }
      
      if (drawControl) {
        try {
          map.removeControl(drawControl);
        } catch (error) {
          console.error("Çizim kontrolü kaldırılırken hata:", error);
        }
      }
      
      document.removeEventListener('keydown', handleKeyDown);
      map.off('draw:created');
    };
  }, [map, onSelection, onCancelSelection]);

  return null;
};

const DetailedInfoButton = ({ filteredData, availableSensors, activeSensors, sensorStatistics }) => {
  const { sensorData } = useContext(DataContext);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedArea, setSelectedArea] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [selectedHour, setSelectedHour] = useState(() => {
    if (filteredData && filteredData.length > 0 && filteredData[0].hour !== undefined) {
      return filteredData[0].hour;
    }
    return 0;
  });
  const [areaData, setAreaData] = useState({
    points: [],
    stats: {},
    hourlyData: {},
    deviceData: {},
    devices: [],
    allHoursData: {}
  });

  useEffect(() => {
    if (filteredData && filteredData.length > 0 && filteredData[0].hour !== undefined) {
      setSelectedHour(filteredData[0].hour);
    }
  }, [filteredData]);

  // ESC tuşu ile seçim modunu kapatma
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectionMode) {
        setSelectionMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectionMode]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleStartSelection = () => {
    setSelectionMode(true);
  };

  const handleCancelSelection = () => {
    setSelectionMode(false);
    
    // Tuşa basıldığında hala sekizgenler varsa haritadan kaldır
    if (window.leafletMap) {
      // Tüm çizim katmanlarını temizle
      window.leafletMap.eachLayer(layer => {
        if (layer instanceof L.FeatureGroup || 
            (layer._drawnItems && layer._path)) {
          window.leafletMap.removeLayer(layer);
        }
      });
      
      // Çizim kontrollerini kaldır
      const drawControls = document.querySelectorAll('.leaflet-draw');
      drawControls.forEach(control => {
        control.remove();
      });
    }
    
    console.log("Seçim modu iptal edildi");
  };

  const handleAreaSelection = (bounds) => {
    setSelectedArea(bounds);
    setSelectionMode(false);
    processAreaData(bounds);
    setDialogOpen(true);
  };

  const processAreaData = (bounds) => {
    // Filter data points that fall within the selected area
    const pointsInArea = sensorData.filter(point => {
      const lat = point.Latitude || point.latitude;
      const lng = point.Longitude || point.longitude;
      return bounds.contains([lat, lng]);
    });

    console.log(`Seçilen alanda toplam ${pointsInArea.length} veri noktası bulundu. Tüm saatler kullanılıyor.`);

    // Process data for each active sensor
    const sensorStats = {};
    const hourlyData = {};
    const deviceData = {};
    const allHoursData = {};
    
    // Identify unique devices in the area
    const devices = [...new Set(pointsInArea.map(point => point.Ika_ID || 'Unknown'))];

    // Initialize data structures for each sensor
    activeSensors.forEach(sensorId => {
      // Initialize stats object for this sensor
      sensorStats[sensorId] = {
        min: Infinity,
        max: -Infinity,
        sum: 0,
        count: 0,
        // Ayrıca seçili saat için özel istatistikler
        currentHour: {
          min: Infinity,
          max: -Infinity,
          sum: 0,
          count: 0
        }
      };

      // Initialize hourly data array for all hours
      hourlyData[sensorId] = Array(24).fill().map((_, i) => ({ hour: i, value: 0, count: 0 }));
      
      // Tüm saatler için karşılaştırmalı analiz verileri
      allHoursData[sensorId] = {
        values: [],
        hourlyStats: Array(24).fill().map((_, i) => ({
          hour: i,
          min: Infinity,
          max: -Infinity,
          sum: 0,
          count: 0,
          avg: 0
        }))
      };
      
      // Initialize data for each device
      deviceData[sensorId] = {};
      devices.forEach(deviceId => {
        deviceData[sensorId][deviceId] = {
          points: [],
          hourlyData: Array(24).fill().map((_, i) => ({ hour: i, value: 0, count: 0 }))
        };
      });
    });

    // Process each point in the area
    pointsInArea.forEach(point => {
      const deviceId = point.Ika_ID || 'Unknown';
      const pointHour = parseInt(point.hour);
      
      activeSensors.forEach(sensorId => {
        const value = parseFloat(point[sensorId]);
        if (!isNaN(value)) {
          // Update overall stats
          sensorStats[sensorId].min = Math.min(sensorStats[sensorId].min, value);
          sensorStats[sensorId].max = Math.max(sensorStats[sensorId].max, value);
          sensorStats[sensorId].sum += value;
          sensorStats[sensorId].count++;

          // Update current hour specific stats
          if (pointHour === selectedHour) {
            sensorStats[sensorId].currentHour.min = Math.min(sensorStats[sensorId].currentHour.min, value);
            sensorStats[sensorId].currentHour.max = Math.max(sensorStats[sensorId].currentHour.max, value);
            sensorStats[sensorId].currentHour.sum += value;
            sensorStats[sensorId].currentHour.count++;
          }

          // Update overall hourly data
          const hour = pointHour;
          if (!isNaN(hour) && hour >= 0 && hour < 24) {
            hourlyData[sensorId][hour].hour = hour;
            hourlyData[sensorId][hour].value += value;
            hourlyData[sensorId][hour].count++;

            // Tüm saatler analizi için veri ekleme
            allHoursData[sensorId].values.push({
              hour: hour,
              value: value,
              deviceId: deviceId
            });

            // Saatlik istatistikler güncelleme
            allHoursData[sensorId].hourlyStats[hour].min = Math.min(allHoursData[sensorId].hourlyStats[hour].min, value);
            allHoursData[sensorId].hourlyStats[hour].max = Math.max(allHoursData[sensorId].hourlyStats[hour].max, value);
            allHoursData[sensorId].hourlyStats[hour].sum += value;
            allHoursData[sensorId].hourlyStats[hour].count++;
          }
          
          // Update device specific data
          if (deviceData[sensorId][deviceId]) {
            // Add to points array with hour and value
            deviceData[sensorId][deviceId].points.push({
              hour: hour,
              value: value,
              latitude: point.Latitude || point.latitude,
              longitude: point.Longitude || point.longitude,
              timestamp: point.Timestamp || new Date()
            });
            
            // Update device hourly data
            if (!isNaN(hour) && hour >= 0 && hour < 24) {
              deviceData[sensorId][deviceId].hourlyData[hour].hour = hour;
              deviceData[sensorId][deviceId].hourlyData[hour].value += value;
              deviceData[sensorId][deviceId].hourlyData[hour].count++;
            }
          }
        }
      });
    });

    // Calculate averages for overall hourly data
    activeSensors.forEach(sensorId => {
      for (let i = 0; i < 24; i++) {
        if (hourlyData[sensorId][i].count > 0) {
          hourlyData[sensorId][i].value = hourlyData[sensorId][i].value / hourlyData[sensorId][i].count;
        }

        // Saatlik ortalama değerleri hesapla
        if (allHoursData[sensorId].hourlyStats[i].count > 0) {
          allHoursData[sensorId].hourlyStats[i].avg = 
            allHoursData[sensorId].hourlyStats[i].sum / allHoursData[sensorId].hourlyStats[i].count;
        }
      }
      
      // Seçili saat için ortalama hesapla
      if (sensorStats[sensorId].currentHour.count > 0) {
        sensorStats[sensorId].currentHour.avg = 
          sensorStats[sensorId].currentHour.sum / sensorStats[sensorId].currentHour.count;
      } else {
        // Seçili saat için veri yoksa genel ortalamaları kullan
        sensorStats[sensorId].currentHour.min = sensorStats[sensorId].min;
        sensorStats[sensorId].currentHour.max = sensorStats[sensorId].max;
        sensorStats[sensorId].currentHour.avg = 
          sensorStats[sensorId].count > 0 ? sensorStats[sensorId].sum / sensorStats[sensorId].count : 0;
      }
      
      // Calculate averages for device hourly data
      devices.forEach(deviceId => {
        if (deviceData[sensorId][deviceId]) {
          for (let i = 0; i < 24; i++) {
            if (deviceData[sensorId][deviceId].hourlyData[i].count > 0) {
              deviceData[sensorId][deviceId].hourlyData[i].value = 
                deviceData[sensorId][deviceId].hourlyData[i].value / 
                deviceData[sensorId][deviceId].hourlyData[i].count;
            }
          }
        }
      });
    });

    // Calculate final stats
    Object.keys(sensorStats).forEach(sensorId => {
      if (sensorStats[sensorId].count > 0) {
        sensorStats[sensorId].avg = sensorStats[sensorId].sum / sensorStats[sensorId].count;
      } else {
        // No data for this sensor in the selected area
        sensorStats[sensorId].min = 0;
        sensorStats[sensorId].max = 0;
        sensorStats[sensorId].avg = 0;
      }
    });

    // Tüm verilerin yüklendiğinden emin olmak için konsola yazdır
    console.log("Alan verisi işlendi:", {
      pointCount: pointsInArea.length,
      deviceCount: devices.length,
      sensorStats,
      hourlyData,
      allHoursData
    });

    setAreaData({
      points: pointsInArea,
      stats: sensorStats,
      hourlyData: hourlyData,
      deviceData: deviceData,
      devices: devices,
      allHoursData: allHoursData
    });
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setTabValue(0);
  };

  const getSensorName = (sensorId) => {
    const sensor = availableSensors.find(s => s.id === sensorId);
    return sensor ? sensor.name : sensorId;
  };

  const getSensorUnit = (sensorId) => {
    const sensor = availableSensors.find(s => s.id === sensorId);
    return sensor ? sensor.unit : '';
  };

  // Generate colors for the chart lines
  const getLineColor = (index) => {
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', '#00C49F', '#FFBB28', 
                   '#FF8042', '#e6194B', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#46f0f0'];
    return colors[index % colors.length];
  };

  // Prepare all hours data for the device comparison chart
  const prepareDeviceComparisonData = (sensorId) => {
    const allHoursData = [];
    
    areaData.devices.forEach((deviceId, deviceIndex) => {
      if (areaData.deviceData[sensorId] && areaData.deviceData[sensorId][deviceId]) {
        const deviceData = areaData.deviceData[sensorId][deviceId].hourlyData;
        
        // Add data for each hour that has values
        deviceData.forEach(hourData => {
          if (hourData.count > 0) {
            allHoursData.push({
              hour: hourData.hour,
              value: hourData.value,
              device: deviceId
            });
          }
        });
      }
    });
    
    return allHoursData;
  };

  // Prepare all devices data for the hour comparison chart
  const prepareHourComparisonData = (sensorId) => {
    // Initialize with empty data for all hours
    const data = Array(24).fill().map((_, i) => ({
      hour: i,
    }));
    
    // Add device data to each hour
    areaData.devices.forEach((deviceId, deviceIndex) => {
      if (areaData.deviceData[sensorId] && areaData.deviceData[sensorId][deviceId]) {
        const deviceData = areaData.deviceData[sensorId][deviceId].hourlyData;
        
        deviceData.forEach((hourData, hourIndex) => {
          if (hourData.count > 0) {
            data[hourIndex][deviceId] = hourData.value;
          }
        });
      }
    });
    
    return data;
  };

  // Yeni: Saatlik istatistikler için veri hazırlama
  const prepareHourlyStatsData = (sensorId) => {
    if (!areaData.allHoursData || !areaData.allHoursData[sensorId]) {
      return Array.from({ length: 24 }, (_, i) => ({ hour: i, min: 0, max: 0, avg: 0, count: 0 }));
    }
    
    // Tüm 24 saat için veri hazırla, verisiz saatler için 0 değeri ata
    return Array.from({ length: 24 }, (_, i) => {
      const hourStat = areaData.allHoursData[sensorId].hourlyStats[i];
      
      if (!hourStat || hourStat.count === 0) {
        return { hour: i, min: 0, max: 0, avg: 0, count: 0 };
      }
      
      return {
        hour: i,
        min: hourStat.min !== Infinity ? hourStat.min : 0,
        max: hourStat.max !== -Infinity ? hourStat.max : 0,
        avg: hourStat.avg || 0,
        count: hourStat.count
      };
    });
  };

  // Yeni: Seçilen bölgede tüm saatlerdeki ortalama, minimum ve maksimum değerleri gösteren veri
  const prepareAllHoursRangeData = (sensorId) => {
    if (!areaData.allHoursData || !areaData.allHoursData[sensorId]) {
      return Array.from({ length: 24 }, (_, i) => ({ hour: i, min: null, max: null, avg: null }));
    }
    
    // Tüm 24 saat için veri hazırla
    return Array.from({ length: 24 }, (_, i) => {
      const hourStat = areaData.allHoursData[sensorId].hourlyStats[i];
      
      if (!hourStat || hourStat.count === 0) {
        return {
          hour: i,
          min: null,
          max: null,
          avg: null
        };
      }
      
      // Infinity değerlerini kontrol et
      let min = hourStat.min;
      let max = hourStat.max;
      let avg = hourStat.avg;
      
      if (min === Infinity || min === undefined || isNaN(min)) min = 0;
      if (max === -Infinity || max === undefined || isNaN(max)) max = 0;
      if (avg === undefined || isNaN(avg) || avg === Infinity || avg === -Infinity) avg = 0;
      
      return {
        hour: i,
        min: min,
        max: max,
        avg: avg
      };
    });
  };

  return (
    <>
      <Box
        sx={{
          position: 'absolute',
          top: 20,  // 200'den 20'ye değiştirildi - en üst sağ köşeye taşındı
          right: 20,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 2  // Butonlar arası boşluğu artırdık
        }}
      >
        <Button
          variant="contained"
          startIcon={selectionMode ? <MapIcon /> : <InfoIcon />}
          onClick={handleStartSelection}
          color={selectionMode ? "secondary" : "primary"}
          sx={{
            borderRadius: 2,
            boxShadow: 3,
            fontWeight: 'bold',
            padding: '10px 15px'
          }}
        >
          {selectionMode ? "Seçim Modu Aktif" : "Detaylı Bilgi"}
        </Button>
        
        {selectionMode && (
          <Button
            variant="contained"
            color="error"
            onClick={handleCancelSelection}
            sx={{
              borderRadius: 2,
              boxShadow: 3,
              fontWeight: 'bold',
              padding: '10px 15px'
            }}
          >
            İptal Et
          </Button>
        )}
      </Box>

      {/* Selection Component */}
      {selectionMode && (
        <DetailedInfoSelector 
          map={window.leafletMap} 
          onSelection={handleAreaSelection}
          onCancelSelection={handleCancelSelection}
        />
      )}

      {/* Detailed Information Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
          Seçilen Alan Detaylı Analizi - Saat: {selectedHour}:00
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {areaData.points.length} veri noktası ve {areaData.devices.length} cihaz bulundu
            </Typography>
            
            {areaData.devices.length > 0 && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Cihazlar: {areaData.devices.join(', ')}
              </Typography>
            )}

            <Typography variant="body2" color="primary.dark" sx={{ mt: 1, fontSize: '0.85rem' }}>
              * Sekmeler arasında geçiş yaparak seçili saat veya tüm saatlerin analizini görüntüleyebilirsiniz
            </Typography>
          </Box>
          
          {activeSensors.length === 0 ? (
            <Typography color="text.secondary">
              Lütfen veri görüntülemek için en az bir sensör seçin.
            </Typography>
          ) : (
            <Box sx={{ width: '100%' }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
                  <Tab icon={<AccessTimeIcon />} label="Seçili Saat Analizi" id="tab-0" />
                  <Tab icon={<DeviceHubIcon />} label="Tüm Saatler Analizi" id="tab-1" />
                </Tabs>
              </Box>
              
              {/* Hourly Analysis Tab */}
              <TabPanel value={tabValue} index={0}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Seçilen Saat için Sensör İstatistikleri:
                </Typography>
                
                {activeSensors.map((sensorId, index) => (
                  <Paper key={sensorId} elevation={2} sx={{ p: 2, mb: 2, backgroundColor: '#fafafa' }}>
                    <Typography variant="h6" color="primary">
                      {getSensorName(sensorId)} - Saat: {selectedHour}:00
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, my: 1 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Minimum:</Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {areaData.stats[sensorId]?.currentHour?.min !== Infinity 
                            ? areaData.stats[sensorId]?.currentHour?.min.toFixed(2) 
                            : 'Veri yok'} {getSensorUnit(sensorId)}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography variant="body2" color="text.secondary">Maksimum:</Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {areaData.stats[sensorId]?.currentHour?.max !== -Infinity 
                            ? areaData.stats[sensorId]?.currentHour?.max.toFixed(2) 
                            : 'Veri yok'} {getSensorUnit(sensorId)}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography variant="body2" color="text.secondary">Ortalama:</Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {areaData.stats[sensorId]?.currentHour?.avg 
                            ? areaData.stats[sensorId]?.currentHour?.avg.toFixed(2) 
                            : 'Veri yok'} {getSensorUnit(sensorId)}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography variant="body2" color="text.secondary">Ölçüm Sayısı:</Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {areaData.stats[sensorId]?.currentHour?.count || 0}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />

                    <Typography variant="subtitle2" gutterBottom>
                      Bu Saatteki Cihaz Verileri:
                    </Typography>
                    
                    {areaData.devices.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
                        {areaData.devices.map((deviceId) => {
                          const deviceHourData = areaData.deviceData[sensorId]?.[deviceId]?.hourlyData[selectedHour];
                          const hasData = deviceHourData && deviceHourData.count > 0;
                          
                          return (
                            <Paper 
                              key={deviceId}
                              elevation={1}
                              sx={{ 
                                p: 1.5, 
                                borderLeft: '4px solid', 
                                borderColor: hasData ? 'primary.main' : 'grey.300',
                                backgroundColor: hasData ? 'rgba(25, 118, 210, 0.05)' : 'grey.50',
                                minWidth: '220px',
                                flexGrow: 1
                              }}
                            >
                              <Typography variant="subtitle2">
                                Cihaz: {deviceId}
                              </Typography>
                              
                              {hasData ? (
                                <Typography variant="body2" mt={1}>
                                  Değer: <b>{deviceHourData.value.toFixed(2)} {getSensorUnit(sensorId)}</b>
                                  <br />
                                  Ölçüm sayısı: <b>{deviceHourData.count}</b>
                                </Typography>
                              ) : (
                                <Typography variant="body2" mt={1} color="text.secondary">
                                  Bu saat için veri yok
                                </Typography>
                              )}
                            </Paper>
                          );
                        })}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Bu bölgede cihaz bulunamadı.
                      </Typography>
                    )}
                    
                    <Box sx={{ mt: 3, mb: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Günlük Değişim İçindeki Konum:
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Bu saatteki değerler, günlük ölçümlerin tümü içinde nerede?
                      </Typography>
                    </Box>
                    
                    <Box sx={{ height: 250, mt: 2 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={areaData.hourlyData?.[sensorId] || []}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="hour" 
                            label={{ value: 'Saat', position: 'insideBottomRight', offset: -5 }}
                            domain={[0, 23]}
                            ticks={[0, 6, 12, 18, 23]}
                          />
                          <YAxis 
                            label={{ value: 'Değer', angle: -90, position: 'insideLeft' }} 
                          />
                          <Tooltip 
                            formatter={(value) => [value.toFixed(2) + ' ' + getSensorUnit(sensorId), getSensorName(sensorId)]}
                            labelFormatter={(label) => `Saat: ${label}:00`}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            name={getSensorName(sensorId)} 
                            stroke={getLineColor(index)} 
                            strokeWidth={2}
                          />
                          {/* Seçili saati vurgulayan dikey referans çizgisi */}
                          <ReferenceLine 
                            x={selectedHour} 
                            stroke="red"
                            strokeWidth={2}
                            strokeDasharray="3 3"
                            label={{ 
                              value: 'Seçili Saat', 
                              position: 'top', 
                              fill: 'red',
                              fontSize: 12 
                            }} 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  </Paper>
                ))}
              </TabPanel>
              
              {/* All Data and Devices Tab */}
              <TabPanel value={tabValue} index={1}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Tüm Saatler için Kapsamlı Veri Analizi:
                  {console.log("Tüm saatler analizi render edildi", { areaData, selectedHour })}
                </Typography>
                
                {activeSensors.map((sensorId, index) => (
                  <Paper key={sensorId} elevation={2} sx={{ p: 2, mb: 3, backgroundColor: '#fafafa' }}>
                    <Typography variant="h6" color="primary" gutterBottom>
                      {getSensorName(sensorId)} - 24 Saatlik Analiz
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, my: 1 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Genel Minimum:</Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {areaData.stats[sensorId]?.min !== Infinity 
                            ? areaData.stats[sensorId]?.min.toFixed(2) 
                            : 'Veri yok'} {getSensorUnit(sensorId)}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography variant="body2" color="text.secondary">Genel Maksimum:</Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {areaData.stats[sensorId]?.max !== -Infinity 
                            ? areaData.stats[sensorId]?.max.toFixed(2) 
                            : 'Veri yok'} {getSensorUnit(sensorId)}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography variant="body2" color="text.secondary">Genel Ortalama:</Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {areaData.stats[sensorId]?.avg 
                            ? areaData.stats[sensorId]?.avg.toFixed(2) 
                            : 'Veri yok'} {getSensorUnit(sensorId)}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography variant="body2" color="text.secondary">Toplam Ölçüm:</Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {areaData.stats[sensorId]?.count || 0}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="subtitle2" gutterBottom>
                      24 Saatlik Değer Aralığı Analizi:
                    </Typography>
                    
                    <Box sx={{ height: 300, mt: 2 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={prepareAllHoursRangeData(sensorId)}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="hour" 
                            label={{ value: 'Saat', position: 'insideBottomRight', offset: -5 }} 
                            domain={[0, 23]}
                            ticks={[0, 6, 12, 18, 23]}
                          />
                          <YAxis 
                            label={{ value: 'Değer', angle: -90, position: 'insideLeft' }} 
                          />
                          <Tooltip 
                            formatter={(value, name) => {
                              if (value === null) return ['Veri yok', name];
                              return [value.toFixed(2) + ' ' + getSensorUnit(sensorId), name];
                            }}
                            labelFormatter={(label) => `Saat: ${label}:00`}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="avg" 
                            name="Ortalama" 
                            stroke={getLineColor(0)} 
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            connectNulls={true}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="min" 
                            name="Minimum" 
                            stroke={getLineColor(1)} 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ r: 3 }}
                            connectNulls={true}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="max" 
                            name="Maksimum" 
                            stroke={getLineColor(2)} 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ r: 3 }}
                            connectNulls={true}
                          />
                          {/* Seçili saati vurgulayan dikey referans çizgisi */}
                          <ReferenceLine 
                            x={selectedHour} 
                            stroke="rgba(255, 0, 0, 0.5)"
                            strokeWidth={1}
                            strokeDasharray="3 3"
                            label={{ 
                              value: 'Seçili', 
                              position: 'top', 
                              fill: 'red',
                              fontSize: 10 
                            }} 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                    
                    <Divider sx={{ my: 3 }} />
                    
                    {/* Saatlik verileri gösteren tablo */}
                    <Typography variant="subtitle2" gutterBottom>
                      Saatlik Detaylı Veri (Tüm 24 Saat):
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, my: 2 }}>
                      {Array.from({ length: 24 }, (_, hourIndex) => {
                        const hourStat = areaData.allHoursData && 
                                        areaData.allHoursData[sensorId] && 
                                        areaData.allHoursData[sensorId].hourlyStats[hourIndex];
                        
                        const hasData = hourStat && hourStat.count > 0;
                        
                        return (
                          <Paper
                            key={`hour-${hourIndex}`}
                            elevation={hourIndex === selectedHour ? 3 : 1}
                            sx={{
                              p: 1.5,
                              width: '145px',
                              borderLeft: '4px solid',
                              borderColor: hourIndex === selectedHour ? 'red' : (hasData ? 'primary.main' : 'grey.300'),
                              backgroundColor: hourIndex === selectedHour ? 'rgba(255, 0, 0, 0.05)' : (hasData ? 'white' : 'rgba(0, 0, 0, 0.03)')
                            }}
                          >
                            <Typography variant="subtitle2" fontWeight="bold">
                              Saat {hourIndex}:00
                            </Typography>
                            {hasData ? (
                              <Typography variant="body2" sx={{ mt: 1 }}>
                                <b>Ort:</b> {hourStat.avg !== undefined && !isNaN(hourStat.avg) && hourStat.avg !== Infinity ? 
                                  hourStat.avg.toFixed(2) : '0.00'} {getSensorUnit(sensorId)}<br />
                                <b>Min:</b> {hourStat.min !== undefined && !isNaN(hourStat.min) && hourStat.min !== Infinity ? 
                                  hourStat.min.toFixed(2) : '0.00'} {getSensorUnit(sensorId)}<br />
                                <b>Max:</b> {hourStat.max !== undefined && !isNaN(hourStat.max) && hourStat.max !== -Infinity ? 
                                  hourStat.max.toFixed(2) : '0.00'} {getSensorUnit(sensorId)}<br />
                                <b>Ölçüm:</b> {hourStat.count || 0}
                              </Typography>
                            ) : (
                              <Typography variant="body2" mt={1} color="text.secondary">
                                Bu saat için veri yok
                              </Typography>
                            )}
                          </Paper>
                        );
                      })}
                    </Box>
                    
                    <Divider sx={{ my: 3 }} />
                    
                    {areaData.devices.length > 1 ? (
                      <>
                        <Typography variant="subtitle2" gutterBottom>
                          Cihazlar Arası Karşılaştırmalı Analiz:
                        </Typography>
                        
                        <Box sx={{ height: 350, mt: 2 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart
                              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="hour" 
                                type="number"
                                domain={[0, 23]}
                                label={{ value: 'Saat', position: 'insideBottomRight', offset: -5 }} 
                              />
                              <YAxis 
                                type="number"
                                dataKey="value"
                                name="Değer"
                                label={{ value: 'Değer', angle: -90, position: 'insideLeft' }} 
                              />
                              <ZAxis range={[60, 60]} />
                              <Tooltip 
                                formatter={(value) => [value.toFixed(2) + ' ' + getSensorUnit(sensorId), 'Değer']}
                                labelFormatter={(label) => `Saat: ${label}:00`}
                                cursor={{ strokeDasharray: '3 3' }}
                              />
                              <Legend />
                              
                              {areaData.devices.map((deviceId, deviceIndex) => {
                                if (areaData.deviceData[sensorId] && 
                                    areaData.deviceData[sensorId][deviceId] && 
                                    areaData.deviceData[sensorId][deviceId].points.length > 0) {
                                  return (
                                    <Scatter 
                                      key={deviceId}
                                      name={`Cihaz: ${deviceId}`} 
                                      data={areaData.deviceData[sensorId][deviceId].points}
                                      fill={getLineColor(deviceIndex)}
                                    />
                                  );
                                }
                                return null;
                              })}
                            </ScatterChart>
                          </ResponsiveContainer>
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                          * Her nokta bir ölçüm değerini gösterir. Noktaların yoğunluğu, o saatte daha fazla ölçüm yapıldığını gösterir.
                        </Typography>
                        
                        <Typography variant="subtitle2" gutterBottom>
                          Cihaz Bazlı Ortalama Değerler (24 Saat):
                        </Typography>
                        
                        <Box sx={{ height: 350, mt: 2 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={prepareHourComparisonData(sensorId)}
                              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="hour" 
                                label={{ value: 'Saat', position: 'insideBottomRight', offset: -5 }} 
                                domain={[0, 23]}
                                ticks={[0, 6, 12, 18, 23]}
                              />
                              <YAxis 
                                label={{ value: 'Değer', angle: -90, position: 'insideLeft' }} 
                              />
                              <Tooltip 
                                formatter={(value, name) => [value.toFixed(2) + ' ' + getSensorUnit(sensorId), `Cihaz: ${name}`]}
                                labelFormatter={(label) => `Saat: ${label}:00`}
                              />
                              <Legend />
                              
                              {areaData.devices.map((deviceId, deviceIndex) => (
                                <Line 
                                  key={deviceId}
                                  type="monotone" 
                                  dataKey={deviceId} 
                                  name={`Cihaz: ${deviceId}`} 
                                  stroke={getLineColor(deviceIndex)} 
                                  strokeWidth={2}
                                  connectNulls={true}
                                  dot={{ r: 4 }}
                                  activeDot={{ r: 8 }}
                                />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        </Box>
                      </>
                    ) : (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          Ölçüm Sayıları Analizi:
                        </Typography>
                        
                        <Box sx={{ height: 300, mt: 2 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={prepareHourlyStatsData(sensorId)}
                              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="hour" 
                                label={{ value: 'Saat', position: 'insideBottomRight', offset: -5 }} 
                                domain={[0, 23]}
                                ticks={[0, 6, 12, 18, 23]}
                              />
                              <YAxis 
                                yAxisId="left"
                                label={{ value: 'Değer', angle: -90, position: 'insideLeft' }} 
                              />
                              <YAxis 
                                yAxisId="right"
                                orientation="right"
                                label={{ value: 'Ölçüm Sayısı', angle: 90, position: 'insideRight' }}
                              />
                              <Tooltip 
                                formatter={(value, name) => {
                                  if (name === 'Ölçüm Sayısı') return [value, name];
                                  return [value.toFixed(2) + ' ' + getSensorUnit(sensorId), name];
                                }}
                                labelFormatter={(label) => `Saat: ${label}:00`}
                              />
                              <Legend />
                              <Line 
                                yAxisId="left"
                                type="monotone" 
                                dataKey="avg" 
                                name="Ortalama Değer" 
                                stroke={getLineColor(0)} 
                                strokeWidth={2}
                                connectNulls={true}
                              />
                              <Line 
                                yAxisId="right"
                                type="monotone" 
                                dataKey="count" 
                                name="Ölçüm Sayısı" 
                                stroke={getLineColor(3)} 
                                strokeWidth={2}
                                connectNulls={true}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </Box>
                      </Box>
                    )}
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      * Bu grafikler bölgedeki tüm sensörlerin 24 saat boyunca ölçtüğü verilerin analizini göstermektedir.
                    </Typography>
                  </Paper>
                ))}
              </TabPanel>
            </Box>
          )}
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 3, fontStyle: 'italic' }}>
            * Veriler, seçilen bölgedeki tüm sensör ve ölçüm noktalarından alınmıştır.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Kapat
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DetailedInfoButton; 