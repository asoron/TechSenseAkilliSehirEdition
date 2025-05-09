import React, { useMemo, useState, useEffect } from 'react';
import { 
  FormGroup, 
  FormControlLabel, 
  Checkbox, 
  Typography, 
  Divider,
  Tooltip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  useMediaQuery
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import LayersIcon from '@mui/icons-material/Layers';

// Sensörleri kategorilere ayırmak için yardımcı fonksiyon
const getSensorCategory = (sensorId) => {
  // Hava kalitesi sensörleri
  if (['PM2.5_ug_m3', 'PM10_ug_m3', 'CO_ppm', 'NO2_ppb', 'SO2_ppb', 'O3_ppb', 'VOC_ppb'].includes(sensorId) ||
      sensorId.toLowerCase().includes('pm') || 
      sensorId.toLowerCase().includes('co') || 
      sensorId.toLowerCase().includes('no2') || 
      sensorId.toLowerCase().includes('so2') || 
      sensorId.toLowerCase().includes('o3') || 
      sensorId.toLowerCase().includes('voc')) {
    return 'air';
  }
  
  // Çevresel koşullar sensörleri
  if (['Temperature_C', 'Relative_Humidity_Percent', 'Sound_Level_dB', 'Light_Level_lux'].includes(sensorId) ||
      sensorId.toLowerCase().includes('temper') || 
      sensorId.toLowerCase().includes('sicakl') || 
      sensorId.toLowerCase().includes('nem') || 
      sensorId.toLowerCase().includes('humidity') || 
      sensorId.toLowerCase().includes('ses') || 
      sensorId.toLowerCase().includes('sound') || 
      sensorId.toLowerCase().includes('isik') || 
      sensorId.toLowerCase().includes('light')) {
    return 'environment';
  }
  
  // Diğer sensörler
  if (['Vibration_g', 'Radiation_uSv_h', 'MagneticField_X_uT', 'MagneticField_Y_uT', 'MagneticField_Z_uT'].includes(sensorId) ||
      sensorId.toLowerCase().includes('titres') || 
      sensorId.toLowerCase().includes('vibr') || 
      sensorId.toLowerCase().includes('radya') || 
      sensorId.toLowerCase().includes('radia') || 
      sensorId.toLowerCase().includes('manyet') || 
      sensorId.toLowerCase().includes('magnet')) {
    return 'other';
  }
  
  // Varsayılan: diğer kategorisi
  return 'other';
};

// Türkçe ve İngilizce eşleştirmelerini tutan yardımcı fonksiyon
const getCanonicalSensorId = (sensorId) => {
  // Sıcaklık ile ilgili
  if (sensorId.toLowerCase().includes('sicakl') || 
      sensorId.toLowerCase().includes('temper')) {
    return 'Temperature_C';
  }
  
  // Nem ile ilgili
  if (sensorId.toLowerCase().includes('nem') || 
      sensorId.toLowerCase().includes('humidity')) {
    return 'Relative_Humidity_Percent';
  }
  
  // Ses seviyesi
  if (sensorId.toLowerCase().includes('ses') || 
      sensorId.toLowerCase().includes('sound')) {
    return 'Sound_Level_dB';
  }
  
  // Işık seviyesi
  if (sensorId.toLowerCase().includes('isik') || 
      sensorId.toLowerCase().includes('light')) {
    return 'Light_Level_lux';
  }
  
  // Titreşim
  if (sensorId.toLowerCase().includes('titres') || 
      sensorId.toLowerCase().includes('vibr')) {
    return 'Vibration_g';
  }
  
  // Radyasyon
  if (sensorId.toLowerCase().includes('radya') || 
      sensorId.toLowerCase().includes('radia')) {
    return 'Radiation_uSv_h';
  }
  
  // Eşleşme bulunamazsa orijinal ID'yi döndür
  return sensorId;
};

const displayNameMap = {
  'Temperature_C': 'Sıcaklık (°C)',
  'Relative_Humidity_Percent': 'Nem (%)',
  'Sound_Level_dB': 'Ses Seviyesi (dB)',
  'Light_Level_lux': 'Işık Seviyesi (lux)',
  'Vibration_g': 'Titreşim (g)',
  'Radiation_uSv_h': 'Radyasyon (µSv/h)',
  'PM2.5_ug_m3': 'PM2.5 (µg/m³)',
  'PM10_ug_m3': 'PM10 (µg/m³)',
  'CO_ppm': 'CO (ppm)',
  'NO2_ppb': 'NO2 (ppb)',
  'SO2_ppb': 'SO2 (ppb)',
  'O3_ppb': 'O3 (ppb)',
  'VOC_ppb': 'VOC (ppb)'
};

const SensorLayerControl = ({ 
  availableSensors, 
  activeSensors, 
  onToggleSensor,
  sensorStatistics
}) => {
  // Mobil görünüm kontrolü için state
  const [isOpen, setIsOpen] = useState(true);
  const isMobile = useMediaQuery('(max-width:768px)');
  
  // Mobil cihazda otomatik olarak kapalı başla
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [isMobile]);
  
  // Panel görünürlüğünü aç/kapat
  const togglePanel = () => {
    setIsOpen(!isOpen);
  };
  
  // Tekrarlanan sensörleri temizle ve grupla
  const uniqueSensors = useMemo(() => {
    const sensorMap = new Map();
    
    availableSensors.forEach(sensor => {
      const canonicalId = getCanonicalSensorId(sensor.id);
      
      // Eğer bu canonical ID daha önce eklenmemişse ekle
      if (!sensorMap.has(canonicalId)) {
        const displayName = displayNameMap[canonicalId] || sensor.name;
        
        sensorMap.set(canonicalId, {
          id: sensor.id, // Orijinal ID'yi koru
          canonicalId: canonicalId, // Eşleştirilmiş ID
          name: displayName, // Görünen isim
          unit: sensor.unit
        });
      }
    });
    
    return Array.from(sensorMap.values());
  }, [availableSensors]);

  // Sensörleri kategorilere ayır
  const categorizedSensors = useMemo(() => {
    const result = {
      air: [],
      environment: [],
      other: []
    };
    
    uniqueSensors.forEach(sensor => {
      const category = getSensorCategory(sensor.canonicalId);
      result[category].push(sensor);
    });
    
    return result;
  }, [uniqueSensors]);
  
  console.log("Eşsiz sensör sayısı:", uniqueSensors.length);
  console.log("Kategorilere göre sensörler:", {
    hava: categorizedSensors.air.length,
    çevre: categorizedSensors.environment.length,
    diğer: categorizedSensors.other.length
  });
  
  return (
    <>
      {/* Sensör paneli açma/kapama butonu - sadece mobil görünümde */}
      {isMobile && (
        <IconButton 
          className={`control-panel-toggle ${isOpen ? 'open' : ''}`}
          onClick={togglePanel}
          sx={{
            position: 'absolute',
            top: '60px',
            right: isOpen ? '310px' : '10px',
            zIndex: 1001,
            backgroundColor: 'white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transition: 'right 0.3s ease',
          }}
        >
          {isOpen ? <CloseIcon /> : <LayersIcon />}
        </IconButton>
      )}
      
      <div 
        className={`control-panel ${isMobile && !isOpen ? 'mobile-collapsed' : ''}`} 
        style={{
          position: 'absolute',
          top: isMobile ? '60px' : '80px',
          right: '20px',
          width: isMobile ? '280px' : '300px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '15px',
          borderRadius: isMobile ? '8px 0 0 8px' : '8px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
          zIndex: 900,
          transition: 'transform 0.3s ease'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" className="layer-heading" sx={{ mb: 0 }}>
            Sensör Veri Katmanları
          </Typography>
          
          {/* Sadece desktop görünümde kapama butonu */}
          {!isMobile && (
            <IconButton size="small" onClick={togglePanel}>
              {isOpen ? <CloseIcon fontSize="small" /> : <MenuIcon fontSize="small" />}
            </IconButton>
          )}
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Hava Kalitesi</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup>
              {categorizedSensors.air.map(sensor => (
                <div key={sensor.id} className="layer-toggle">
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={activeSensors.includes(sensor.id)}
                        onChange={() => onToggleSensor(sensor.id)}
                        color="primary"
                      />
                    }
                    label={sensor.name}
                  />
                  <Tooltip 
                    title={
                      sensorStatistics[sensor.id] 
                        ? `Aralık: ${sensorStatistics[sensor.id].overall.min.toFixed(1)} - ${sensorStatistics[sensor.id].overall.max.toFixed(1)} ${sensor.unit}` 
                        : `${sensor.name} için veri bulunamadı`
                    }
                  >
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </div>
              ))}
            </FormGroup>
          </AccordionDetails>
        </Accordion>
        
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Çevresel Koşullar</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup>
              {categorizedSensors.environment.map(sensor => (
                <div key={sensor.id} className="layer-toggle">
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={activeSensors.includes(sensor.id)}
                        onChange={() => onToggleSensor(sensor.id)}
                        color="primary"
                      />
                    }
                    label={sensor.name}
                  />
                  <Tooltip 
                    title={
                      sensorStatistics[sensor.id] 
                        ? `Aralık: ${sensorStatistics[sensor.id].overall.min.toFixed(1)} - ${sensorStatistics[sensor.id].overall.max.toFixed(1)} ${sensor.unit}` 
                        : `${sensor.name} için veri bulunamadı`
                    }
                  >
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </div>
              ))}
            </FormGroup>
          </AccordionDetails>
        </Accordion>
        
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Diğer Ölçümler</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup>
              {categorizedSensors.other.map(sensor => (
                <div key={sensor.id} className="layer-toggle">
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={activeSensors.includes(sensor.id)}
                        onChange={() => onToggleSensor(sensor.id)}
                        color="primary"
                      />
                    }
                    label={sensor.name}
                  />
                  <Tooltip 
                    title={
                      sensorStatistics[sensor.id] 
                        ? `Aralık: ${sensorStatistics[sensor.id].overall.min.toFixed(1)} - ${sensorStatistics[sensor.id].overall.max.toFixed(1)} ${sensor.unit}` 
                        : `${sensor.name} için veri bulunamadı`
                    }
                  >
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </div>
              ))}
            </FormGroup>
          </AccordionDetails>
        </Accordion>
        
        <Typography variant="caption" sx={{ mt: 2, display: 'block', color: 'text.secondary' }}>
          Görüntülemek istediğiniz sensör katmanlarını seçin. Anormal değerler içeren bölgeler daha yoğun renklerle vurgulanmaktadır.
        </Typography>
      </div>
    </>
  );
};

export default SensorLayerControl; 