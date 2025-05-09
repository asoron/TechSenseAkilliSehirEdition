import React, { useState, useContext, useEffect, useCallback } from 'react';
import { DataProvider, DataContext, useData } from './contexts/DataContext';
import Map from './components/Map';
import SensorLayerControl from './components/SensorLayerControl';
import TimeControl from './components/TimeControl';
import DetailedInfoButton from './components/DetailedInfoButton';
import LoadingOverlay from './components/LoadingOverlay';
import { CssBaseline, ThemeProvider, createTheme, Alert, Snackbar, Button, ButtonGroup, Box, useMediaQuery } from '@mui/material';
import LocationCityIcon from '@mui/icons-material/LocationCity';

// Ana tema oluştur
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  // Responsive tasarım için breakpoints
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
});

// Şehir seçme bileşeni
const CitySelector = () => {
  const { selectedCity, setSelectedCity, citySettings, loading } = useData();
  const isMobile = useMediaQuery('(max-width:768px)');

  const handleCityChange = (city) => {
    if (city !== selectedCity && !loading) {
      console.log(`Şehir değiştiriliyor: ${selectedCity} -> ${city}`);
      setSelectedCity(city);
    }
  };

  return (
    <Box
      className="city-selector"
      sx={{
        position: 'absolute',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: isMobile ? 0.7 : 1,
        borderRadius: 2,
        boxShadow: 3,
        width: isMobile ? 'auto' : 'auto'
      }}
    >
      <ButtonGroup 
        variant="contained" 
        aria-label="Şehir seçimi"
        orientation={isMobile ? 'vertical' : 'horizontal'}
        size={isMobile ? 'small' : 'medium'}
      >
        {Object.keys(citySettings).map((city) => (
          <Button
            key={city}
            onClick={() => handleCityChange(city)}
            variant={selectedCity === city ? 'contained' : 'outlined'}
            color={selectedCity === city ? 'primary' : 'inherit'}
            startIcon={!isMobile && <LocationCityIcon />}
            disabled={loading}
            sx={{
              fontWeight: selectedCity === city ? 'bold' : 'normal',
              minWidth: isMobile ? '100px' : '120px',
              fontSize: isMobile ? '0.8rem' : 'inherit'
            }}
          >
            {citySettings[city].name}
          </Button>
        ))}
      </ButtonGroup>
    </Box>
  );
};

// Ana Uygulama içerik bileşeni - DataProvider içeriğini kullanır
const AppContent = () => {
  const { 
    loading, 
    availableSensors,
    filteredData,
    sensorStatistics, 
    selectedHour, 
    selectedMinute,
    setSelectedHour,
    setSelectedMinute,
    error,
    usingDemoData,
    selectedCity
  } = useData();
  
  const [activeSensors, setActiveSensors] = useState([]);
  const [showDemoAlert, setShowDemoAlert] = useState(false);
  const isMobile = useMediaQuery('(max-width:768px)');

  // Demo veri uyarısını göster
  useEffect(() => {
    if (usingDemoData) {
      setShowDemoAlert(true);
    }
  }, [usingDemoData]);

  // Sensör seçme işlemi
  const handleToggleSensor = (sensorId) => {
    setActiveSensors(prev => {
      if (prev.includes(sensorId)) {
        return prev.filter(id => id !== sensorId);
      } else {
        return [...prev, sensorId];
      }
    });
  };

  // Demo uyarısını kapatma
  const handleCloseAlert = () => {
    setShowDemoAlert(false);
  };

  // Yükleme mesajını şehre göre ayarla
  const loadingMessage = `${selectedCity === 'ankara' ? 'Ankara' : 'Aydın'} sensör verileri yükleniyor...`;

  if (error) {
    return (
      <div style={{ padding: 20, color: 'red' }}>
        <h2>Veri Yükleme Hatası</h2>
        <p>{error}</p>
        {usingDemoData && <p>Yerine demo veriler kullanılıyor.</p>}
      </div>
    );
  }

  return (
    <>
      {loading ? (
        <LoadingOverlay message={loadingMessage} />
      ) : (
        <>
          <Map activeSensors={activeSensors} />
          
          <CitySelector />
          
          <SensorLayerControl 
            availableSensors={availableSensors}
            activeSensors={activeSensors}
            onToggleSensor={handleToggleSensor}
            sensorStatistics={sensorStatistics}
          />
          
          <TimeControl 
            selectedHour={selectedHour}
            selectedMinute={selectedMinute}
            onHourChange={setSelectedHour}
            onMinuteChange={setSelectedMinute}
            isMobile={isMobile}
          />
          
          <DetailedInfoButton 
            filteredData={filteredData}
            availableSensors={availableSensors}
            activeSensors={activeSensors}
            sensorStatistics={sensorStatistics}
            isMobile={isMobile}
          />

          <Snackbar 
            open={showDemoAlert} 
            autoHideDuration={6000} 
            onClose={handleCloseAlert}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            sx={{ 
              width: isMobile ? '95%' : 'auto',
              '& .MuiAlert-root': {
                width: '100%'
              }
            }}
          >
            <Alert 
              onClose={handleCloseAlert} 
              severity="info" 
              sx={{ 
                width: '100%',
                fontSize: isMobile ? '0.8rem' : 'inherit'
              }}
            >
              {isMobile ? 'Demo veriler gösteriliyor' : `Gerçek veri yüklenemedi. Demo veriler ile heatmap oluşturuldu! ${selectedCity === 'ankara' ? 'Ankara' : 'Aydın'} için rastgele oluşturulmuş veri gösteriliyor.`}
            </Alert>
          </Snackbar>
        </>
      )}
    </>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <DataProvider>
        <AppContent />
      </DataProvider>
    </ThemeProvider>
  );
}

export default App; 