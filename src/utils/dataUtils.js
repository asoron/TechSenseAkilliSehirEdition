/**
 * Calculate mean of an array of numbers
 */
export const calculateMean = (values) => {
  if (!values || values.length === 0) return 0;
  
  // Filter out any invalid values
  const validValues = values.filter(val => val !== null && val !== undefined && !isNaN(val));
  if (validValues.length === 0) return 0;
  
  const sum = validValues.reduce((acc, val) => acc + val, 0);
  return sum / validValues.length;
};

/**
 * Calculate standard deviation of an array of numbers
 */
export const calculateStd = (values, mean) => {
  if (!values || values.length <= 1) return 1; // Default to 1 to avoid division by zero
  
  // Filter out any invalid values
  const validValues = values.filter(val => val !== null && val !== undefined && !isNaN(val));
  if (validValues.length <= 1) return 1;
  
  const meanValue = mean !== undefined ? mean : calculateMean(validValues);
  const squareDiffs = validValues.map(value => (value - meanValue) ** 2);
  const variance = calculateMean(squareDiffs);
  return Math.sqrt(variance);
};

/**
 * Calculate min, max, mean, and std for sensor values
 */
export const calculateStatistics = (data) => {
  const stats = {};
  
  // Get unique list of sensor IDs from first item
  if (!data || data.length === 0) {
    console.warn('No data provided to calculateStatistics');
    return stats;
  }
  
  // Standardize edilmiş isimler ile orijinal isimler arasındaki eşleştirme
  const standardToOriginal = {
    'PM25': 'PM2.5_ug_m3',
    'PM10': 'PM10_ug_m3',
    'CO': 'CO_ppm',
    'NO2': 'NO2_ppb',
    'SO2': 'SO2_ppb',
    'O3': 'O3_ppb',
    'VOC': 'VOC_ppb',
    'Temperature': 'Temperature_C',
    'Humidity': 'Relative_Humidity_Percent',
    'Sound': 'Sound_Level_dB',
    'Light': 'Light_Level_lux',
    'Vibration': 'Vibration_g',
    'MagneticX': 'Magnetic_Field_X_uT',
    'MagneticY': 'Magnetic_Field_Y_uT',
    'MagneticZ': 'Magnetic_Field_Z_uT',
    'Radiation': 'Radiation_uSv_h'
  };
  
  // Use only known sensor IDs (original and standardized)
  const originalIds = Object.values(standardToOriginal);
  const standardizedIds = Object.keys(standardToOriginal);
  const sensorIds = [...new Set([...originalIds, ...standardizedIds])];
  
  // Aynı sensör için farklı adlar içeren veri noktaları için de istatistik hesaplaması yap
  const processedSensorIds = new Set();
  
  // Process each sensor
  sensorIds.forEach(sensorId => {
    // Eğer bu sensör zaten işlendiyse, atla
    if (processedSensorIds.has(sensorId)) {
      return;
    }
    
    // İlişkili tüm sütun adlarını (orijinal/standart) bul
    let relatedIds = [sensorId];
    const isStandardized = Object.keys(standardToOriginal).includes(sensorId);
    const isOriginal = Object.values(standardToOriginal).includes(sensorId);
    
    if (isStandardized) {
      // Standart ad için orijinal adı ekle
      relatedIds.push(standardToOriginal[sensorId]);
    } else if (isOriginal) {
      // Orijinal ad için standart adı ekle
      const standardKey = Object.keys(standardToOriginal).find(key => standardToOriginal[key] === sensorId);
      if (standardKey) {
        relatedIds.push(standardKey);
      }
    }
    
    // Tüm ilgili sütunlardan değerleri topla
    let allValues = [];
    
    for (const id of relatedIds) {
      const values = data
        .filter(item => item[id] !== undefined && item[id] !== null && !isNaN(parseFloat(item[id])))
        .map(item => parseFloat(item[id]));
      
      allValues.push(...values);
      
      // Bu ID'yi işlenmiş olarak işaretle
      processedSensorIds.add(id);
    }
    
    if (allValues.length === 0) {
      console.log(`No valid values found for sensor ${sensorId} or related columns`);
      return;
    }
    
    console.log(`Calculating statistics for ${sensorId}, ${allValues.length} values found`);
    
    // Calculate overall statistics with all collected values
    const mean = calculateMean(allValues);
    const std = calculateStd(allValues, mean);
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    
    // Calculate statistics by hour (0-23)
    const byHour = {};
    for (let hour = 0; hour < 24; hour++) {
      try {
        // Her ilgili sütundan saate göre değerleri topla
        let hourValues = [];
        
        for (const id of relatedIds) {
          const values = data
            .filter(item => 
              item.hour === hour && 
              item[id] !== undefined && 
              item[id] !== null && 
              !isNaN(parseFloat(item[id]))
            )
            .map(item => parseFloat(item[id]));
          
          hourValues.push(...values);
        }
        
        if (hourValues.length > 0) {
          const hourMean = calculateMean(hourValues);
          const hourStd = calculateStd(hourValues, hourMean);
          const hourMin = Math.min(...hourValues);
          const hourMax = Math.max(...hourValues);
          
          byHour[hour] = {
            mean: hourMean,
            std: hourStd,
            min: hourMin,
            max: hourMax,
            count: hourValues.length
          };
        }
      } catch (error) {
        console.error(`Error calculating statistics for ${sensorId} at hour ${hour}:`, error);
      }
    }
    
    // Her ilgili sütun adı için istatistikleri kaydet
    for (const id of relatedIds) {
      stats[id] = {
        overall: {
          mean,
          std,
          min,
          max,
          count: allValues.length
        },
        byHour
      };
    }
  });
  
  return stats;
};

/**
 * Get color based on value relative to range
 * For anomaly visualization
 */
export const getValueColor = (value, min, max, isAnomalous = false) => {
  if (value === undefined || value === null || isNaN(value)) return 'rgb(128, 128, 128)'; // Gray for invalid values
  
  // Make sure min and max are valid
  if (min === max) {
    min = value * 0.9;
    max = value * 1.1;
  }
  
  const normalizedValue = Math.max(0, Math.min(1, (value - min) / (max - min)));
  
  if (isAnomalous) {
    // Use a more attention-grabbing color for anomalies (red to purple)
    const r = Math.floor(255);
    const g = Math.floor(0);
    const b = Math.floor(normalizedValue * 255);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Normal gradient (green to yellow to red)
    let r, g, b;
    if (normalizedValue < 0.5) {
      // Green to yellow
      r = Math.floor(normalizedValue * 2 * 255);
      g = 255;
      b = 0;
    } else {
      // Yellow to red
      r = 255;
      g = Math.floor((1 - (normalizedValue - 0.5) * 2) * 255);
      b = 0;
    }
    return `rgb(${r}, ${g}, ${b})`;
  }
};

/**
 * Generate heatmap data for Leaflet.heat
 */
export const generateHeatmapData = (data, sensorId, isAnomalyFn) => {
  if (!data || data.length === 0) {
    console.log(`No data provided for ${sensorId} heatmap`);
    return [];
  }
  
  console.log(`Generating heatmap data for ${sensorId} with ${data.length} points`);
  
  // First check if sensor data is available
  const sensorDataExists = data.some(item => 
    item[sensorId] !== undefined && item[sensorId] !== null && !isNaN(parseFloat(item[sensorId]))
  );
  
  if (!sensorDataExists) {
    console.log(`No valid ${sensorId} data found in the dataset`);
    return [];
  }
  
  // Only filter for valid sensor values, but use original coordinates
  const validData = data.filter(item => 
    item[sensorId] !== undefined && 
    item[sensorId] !== null && 
    !isNaN(parseFloat(item[sensorId])) &&
    // Just ensure coordinates exist
    item.Latitude !== undefined &&
    item.Longitude !== undefined
  );
  
  if (validData.length === 0) {
    console.log(`No valid data points for ${sensorId}`);
    return [];
  }
  
  // Calculate min and max for scaling intensity
  const values = validData.map(item => parseFloat(item[sensorId]));
  const min = Math.min(...values);
  const max = Math.max(...values);
  let range = max - min;
  
  // If range is 0, set a small range to avoid division by zero
  if (range === 0) {
    range = max * 0.1 || 1;
  }
  
  console.log(`Heatmap value range for ${sensorId}: ${min} to ${max}`);
  
  // Sensör özgü uyarlamalar yap
  let sensorSpecificAdjustments = {
    // Hava Kalitesi - düşük değerler daha iyi
    'PM2.5_ug_m3': { invert: true, powFactor: 0.8, minIntensity: 0.3 },
    'PM10_ug_m3': { invert: true, powFactor: 0.8, minIntensity: 0.3 },
    'CO_ppm': { invert: true, powFactor: 0.8, minIntensity: 0.3 },
    'NO2_ppb': { invert: true, powFactor: 0.8, minIntensity: 0.3 },
    'SO2_ppb': { invert: true, powFactor: 0.8, minIntensity: 0.3 },
    'O3_ppb': { invert: true, powFactor: 0.8, minIntensity: 0.3 },
    'VOC_ppb': { invert: true, powFactor: 0.8, minIntensity: 0.3 },
    
    // Sıcaklık - orta değerler daha iyi (20-25°C ideal)
    'Temperature_C': { 
      custom: true, 
      optimalValue: 22.5, 
      rangeFactor: 15, // Bu, 22.5±15°C aralığını kapsar
      minIntensity: 0.4 
    },
    
    // Nem - orta değerler daha iyi (%40-60 ideal)
    'Relative_Humidity_Percent': { 
      custom: true, 
      optimalValue: 50, 
      rangeFactor: 30, // Bu, 50±30% aralığını kapsar 
      minIntensity: 0.4 
    },
    
    // Ses - düşük değerler daha iyi
    'Sound_Level_dB': { invert: true, powFactor: 0.65, minIntensity: 0.35 },
    
    // Işık - uygulama bağlamına göre
    'Light_Level_lux': { powFactor: 0.6, minIntensity: 0.35 },
    
    // Titreşim - düşük değerler daha iyi
    'Vibration_g': { invert: true, powFactor: 0.7, minIntensity: 0.4 },
    
    // Radyasyon - düşük değerler daha iyi
    'Radiation_uSv_h': { invert: true, powFactor: 0.7, minIntensity: 0.45 }
  };
  
  // Eğer sensör için belirli bir ayar yoksa, varsayılan ayarlar
  const sensorConfig = sensorSpecificAdjustments[sensorId] || { 
    invert: false, 
    powFactor: 0.7, 
    minIntensity: 0.3 
  };
  
  console.log(`Using sensor-specific config for ${sensorId}:`, sensorConfig);
  
  // Generate heatmap points with enhanced distribution
  const points = validData.map(item => {
    try {
      const value = parseFloat(item[sensorId]);
      const isAnomalous = isAnomalyFn ? isAnomalyFn(sensorId, value) : false;
      
      // Use original coordinates directly without parsing
      const lat = item.Latitude;
      const lng = item.Longitude;
      
      let intensity = 0;
      
      if (sensorConfig.custom) {
        // Özel işlem (örneğin sıcaklık veya nem için)
        const distanceFromOptimal = Math.abs(value - sensorConfig.optimalValue);
        // Optimal değerden uzaklığa dayalı bir yoğunluk hesapla
        // Uzaklık arttıkça yoğunluk artar (kötüleşir)
        intensity = Math.min(1, distanceFromOptimal / sensorConfig.rangeFactor);
      } else {
        // Standart doğrusal yoğunluk hesabı
        let normalizedValue = (value - min) / range;
        
        // Eğer "invert" ayarı aktifse, değeri tersine çevir (düşük değerler daha iyi)
        if (sensorConfig.invert) {
          normalizedValue = 1 - normalizedValue;
        }
        
        // Contrast için güç fonksiyonu uygula
        intensity = Math.pow(normalizedValue, sensorConfig.powFactor);
      }
      
      // Ensure a minimum intensity for visibility
      intensity = Math.max(sensorConfig.minIntensity, intensity);
      
      // For anomalies, make them much more prominent
      if (isAnomalous) {
        intensity = Math.min(1, intensity * 1.8); // Increase anomaly intensity
      }
      
      // Add small random variation for visual interest
      const variation = Math.random() * 0.1 - 0.05; // ±5% random variation
      intensity = Math.max(sensorConfig.minIntensity, Math.min(1, intensity + variation));
      
      return [
        lat,
        lng,
        // Intensity value between 0-1
        intensity
      ];
    } catch (error) {
      console.error('Error generating heatmap point:', error, item);
      return null;
    }
  }).filter(point => point !== null); // Remove any points that failed to generate
  
  console.log(`Generated ${points.length} valid heatmap points for ${sensorId}`);
  return points;
};

/**
 * Format time string from hour (0-23)
 */
export const formatHourString = (hour) => {
  return `${hour.toString().padStart(2, '0')}:00`;
};

/**
 * Format time string from hour and minute
 */
export const formatTimeString = (hour, minute = 0) => {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

/**
 * Convert time values to minutes for slider
 */
export const timeToSliderValue = (hour, minute = 0) => {
  return hour * 60 + minute;
};

/**
 * Convert slider value to time
 */
export const sliderValueToTime = (value) => {
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  return { hour, minute };
};

/**
 * Get a human-readable range description for a sensor
 */
export const getSensorRangeDescription = (sensorId, stats) => {
  if (!stats || !stats[sensorId] || !stats[sensorId].overall) {
    return 'No data available';
  }
  
  const { min, max, mean } = stats[sensorId].overall;
  const sensor = sensorDisplayInfo[sensorId] || { name: sensorId, unit: '' };
  
  return `Range: ${min.toFixed(1)} - ${max.toFixed(1)} ${sensor.unit} (Avg: ${mean.toFixed(1)} ${sensor.unit})`;
};

// Display information for sensors
export const sensorDisplayInfo = {
  'PM2.5_ug_m3': { name: 'PM2.5', unit: 'μg/m³', description: 'Fine particulate matter' },
  'PM10_ug_m3': { name: 'PM10', unit: 'μg/m³', description: 'Inhalable particulate matter' },
  'CO_ppm': { name: 'CO', unit: 'ppm', description: 'Carbon monoxide' },
  'NO2_ppb': { name: 'NO₂', unit: 'ppb', description: 'Nitrogen dioxide' },
  'SO2_ppb': { name: 'SO₂', unit: 'ppb', description: 'Sulfur dioxide' },
  'O3_ppb': { name: 'O₃', unit: 'ppb', description: 'Ozone' },
  'VOC_ppb': { name: 'VOC', unit: 'ppb', description: 'Volatile organic compounds' },
  'Temperature_C': { name: 'Temperature', unit: '°C', description: 'Ambient temperature' },
  'Relative_Humidity_Percent': { name: 'Humidity', unit: '%', description: 'Relative humidity' },
  'Sound_Level_dB': { name: 'Sound', unit: 'dB', description: 'Ambient noise level' },
  'Light_Level_lux': { name: 'Light', unit: 'lux', description: 'Ambient light level' },
  'Vibration_g': { name: 'Vibration', unit: 'g', description: 'Ground vibration' },
  'Radiation_uSv_h': { name: 'Radiation', unit: 'μSv/h', description: 'Background radiation' }
};

// Sensörler için sağlık eşik değerleri
export const healthThresholds = {
  // Hava kalitesi sensörleri - sağlık için önemli, kritik değerlerde kırmızı uyarı
  'PM2.5_ug_m3': { warning: 20, danger: 35 }, // WHO standartları - daha sıkı
  'PM10_ug_m3': { warning: 40, danger: 70 }, // WHO standartları - daha sıkı
  'CO_ppm': { warning: 5, danger: 10 }, // WHO standartları - daha sıkı (zehirlenme riski)
  'NO2_ppb': { warning: 70, danger: 150 }, // EPA standartları - daha sıkı
  'SO2_ppb': { warning: 50, danger: 125 }, // EPA standartları - daha sıkı
  'O3_ppb': { warning: 60, danger: 100 }, // EPA standartları - daha sıkı (solunum sorunları)
  'VOC_ppb': { warning: 300, danger: 600 }, // Daha sıkı (hava kalitesi sorunları)
  
  // Çevresel sensörler - konfor için önemli, ama ekstrem değerlerde sağlık riski
  'Temperature_C': { 
    warning: { low: 5, high: 30 }, 
    danger: { low: 0, high: 35 } // Daha sıkı (özellikle yüksek sıcaklık)
  },
  'Relative_Humidity_Percent': { 
    warning: { low: 20, high: 75 }, 
    danger: { low: 15, high: 85 } // Daha sıkı (alerji ve solunum sorunları)
  },
  'Sound_Level_dB': { warning: 65, danger: 80 }, // WHO standartları - daha sıkı (işitme kaybı riski)
  'Light_Level_lux': { warning: 20000, danger: 50000 }, // Göz yorgunluğu riski

  // Diğer sensörler - sağlık için önemli olanlar
  'Vibration_g': { warning: 0.4, danger: 0.8 }, // Fiziksel rahatsızlık ve kas-iskelet sistemi sorunları
  'Radiation_uSv_h': { warning: 0.2, danger: 0.4 } // Doğal arka plan seviyelerinin üstü - radyasyon ciddi sağlık riski
};

/**
 * Sensör değerinin uyarı seviyesini kontrol eder
 * @param {string} sensorId - Sensör kimliği
 * @param {number} value - Ölçülen değer
 * @param {number} hour - Saat (0-23)
 * @returns {string|null} 'warning', 'danger' veya null (normal değer)
 */
export const checkAlertLevel = (sensorId, value, hour = null) => {
  // Geçersiz değerler için kontrol
  if (value === undefined || value === null || isNaN(value)) return null;
  
  // Sensör için eşik değerleri
  const thresholds = healthThresholds[sensorId];
  if (!thresholds) return null;

  // Saate göre özel ayarlamalar (gece ses seviyeleri için daha hassas)
  if (sensorId === 'Sound_Level_dB' && hour !== null) {
    // Gece saatleri için daha düşük ses eşiği (22:00 - 06:00)
    if (hour >= 22 || hour < 6) {
      return value > 50 ? 'danger' : (value > 40 ? 'warning' : null);
    }
  }
  
  // Saate göre özel ayarlamalar (yüksek ışık seviyeleri için gece daha hassas)
  if (sensorId === 'Light_Level_lux' && hour !== null) {
    // Gece saatleri için daha düşük ışık eşiği (21:00 - 05:00)
    if (hour >= 21 || hour < 5) {
      return value > 1000 ? 'danger' : (value > 500 ? 'warning' : null);
    }
  }

  // Sıcaklık veya nem gibi hem alt hem üst sınırı olan sensörler
  if (thresholds.warning && typeof thresholds.warning === 'object' && 'low' in thresholds.warning) {
    if (value <= thresholds.danger.low || value >= thresholds.danger.high) {
      return 'danger';
    }
    if (value <= thresholds.warning.low || value >= thresholds.warning.high) {
      return 'warning';
    }
    return null;
  }

  // Standart tek eşik değeri olan sensörler
  if (value >= thresholds.danger) {
    return 'danger';
  }
  if (value >= thresholds.warning) {
    return 'warning';
  }
  
  return null;
}; 