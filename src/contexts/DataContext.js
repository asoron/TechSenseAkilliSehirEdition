import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import Papa from 'papaparse';
import { calculateStatistics, sensorDisplayInfo } from '../utils/dataUtils';

export const DataContext = createContext();

// Şehir ayarları ve harita merkez koordinatları
const CITY_SETTINGS = {
  ankara: {
    name: 'Ankara',
    center: [39.9208, 32.8541], // Kızılay merkez
    bounds: [
      [39.70, 32.50], // Southwest corner
      [40.10, 33.15]  // Northeast corner
    ],
    minLat: 39.70,
    maxLat: 40.10,
    minLng: 32.50,
    maxLng: 33.15,
    datasetPath: '/data/ankara_sensor_data_circular_v4_radius_0_05.csv',
    fallbackDatasetPath: '/data/istanbul_guzergahli_yasam_kalitesi_veriseti.csv'
  },
  aydin: {
    name: 'Aydın',
    center: [37.8560, 27.8416], // Aydın merkez
    bounds: [
      [37.70, 27.70], // Southwest corner
      [38.00, 28.00]  // Northeast corner
    ],
    minLat: 37.70,
    maxLat: 38.00,
    minLng: 27.70,
    maxLng: 28.00,
    datasetPath: '/data/aydin_sensor_data_circular.csv', // Aydın veri seti yolu
    fallbackDatasetPath: '/data/istanbul_guzergahli_yasam_kalitesi_veriseti.csv' // Aynı fallback kullanılabilir
  }
};

// Dünya sınırları (geçerli koordinat aralıkları)
const VALID_MIN_LAT = -90;
const VALID_MAX_LAT = 90;
const VALID_MIN_LNG = -180;
const VALID_MAX_LNG = 180;

// Koordinat geçerli mi kontrol et
const isValidCoordinate = (lat, lng) => {
  return (
    !isNaN(lat) && !isNaN(lng) &&
    lat >= VALID_MIN_LAT && lat <= VALID_MAX_LAT &&
    lng >= VALID_MIN_LNG && lng <= VALID_MAX_LNG
  );
};

// Koordinatın belirlenen şehir sınırları içinde olup olmadığını kontrol et
const isInCityBounds = (lat, lng, cityKey) => {
  const city = CITY_SETTINGS[cityKey];
  return (
    lat >= city.minLat && lat <= city.maxLat && 
    lng >= city.minLng && lng <= city.maxLng
  );
};

// Şehir sınırları dışındaki koordinatları düzeltme
const fixCoordinates = (lat, lng, cityKey) => {
  const city = CITY_SETTINGS[cityKey];
  
  // Önce geçerli koordinat sınırlarında olduğundan emin ol
  if (!isValidCoordinate(lat, lng)) {
    console.log(`Geçersiz koordinat düzeltiliyor: (${lat}, ${lng})`);
    return [city.center[0], city.center[1]];
  }
  
  // Enlem ve boylam arasında karışma olabileceğini kontrol et
  if ((lng > VALID_MAX_LAT || lng < VALID_MIN_LAT) && (lat <= VALID_MAX_LNG && lat >= VALID_MIN_LNG)) {
    console.log(`Enlem-boylam karışması düzeltiliyor: (${lat}, ${lng}) -> (${lng}, ${lat})`);
    const temp = lat;
    lat = lng;
    lng = temp;
  }
  
  // Koordinatları yeniden kontrol et (swap sonrası)
  if (!isValidCoordinate(lat, lng)) {
    console.log(`Swap sonrası hala geçersiz koordinat: (${lat}, ${lng})`);
    return [city.center[0], city.center[1]];
  }
  
  // Eğer koordinatlar şehirden çok uzaksa, 
  // şehir merkez koordinatları etrafında rastgele bir noktaya taşı
  if (!isInCityBounds(lat, lng, cityKey)) {
    console.log(`Şehir dışı koordinat düzeltiliyor: (${lat}, ${lng})`);
    
    // Şehir merkezine yakın rastgele bir nokta
    const newLat = city.center[0] + (Math.random() * 0.2 - 0.1); // ±0.1 derece
    const newLng = city.center[1] + (Math.random() * 0.2 - 0.1); // ±0.1 derece
    
    console.log(`Yeni koordinat: (${newLat}, ${newLng})`);
    return [newLat, newLng];
  }
  
  return [lat, lng];
};

export const DataProvider = ({ children }) => {
  const [sensorData, setSensorData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedHour, setSelectedHour] = useState(0); // Default to first hour
  const [selectedMinute, setSelectedMinute] = useState(0); // Default to first minute
  const [loading, setLoading] = useState(true);
  const [availableSensors, setAvailableSensors] = useState([]);
  const [sensorStatistics, setSensorStatistics] = useState({});
  const [error, setError] = useState(null);
  const [usingDemoData, setUsingDemoData] = useState(false);
  const [selectedCity, setSelectedCity] = useState('ankara'); // Varsayılan şehir: Ankara

  // Şehir değiştiğinde verileri yeniden yükle
  useEffect(() => {
    loadData();
  }, [selectedCity]);

  // Load data on mount
    const loadData = async () => {
      try {
        setLoading(true);
      setError(null);
      setUsingDemoData(false);
      console.log(`${CITY_SETTINGS[selectedCity].name} şehri için veri yükleniyor...`);
        
      // Şehir için doğru veri seti yolunu kullan
      const csvUrl = CITY_SETTINGS[selectedCity].datasetPath;
        console.log("CSV URL:", csvUrl);
        
        try {
          const response = await fetch(csvUrl);
          
          if (!response.ok) {
          // Try to use the fallback dataset if the primary one isn't available
          console.log("Veri seti bulunamadı, alternatif dosyayı deniyoruz...");
          const fallbackCsvUrl = CITY_SETTINGS[selectedCity].fallbackDatasetPath;
          const fallbackResponse = await fetch(fallbackCsvUrl);
          
          if (!fallbackResponse.ok) {
            throw new Error(`CSV alınamadı: ${response.status} ${response.statusText}`);
          }
          
          // Continue with fallback data
          const rawCsvText = await fallbackResponse.text();
          processCsvText(rawCsvText);
        } else {
          // Process the CSV data
          const rawCsvText = await response.text();
          processCsvText(rawCsvText);
        }
      } catch (fetchError) {
        console.error("CSV yükleme hatası:", fetchError);
        setError(`CSV yükleme hatası: ${fetchError.message}`);
        setUsingDemoData(true);
        processDemoData();
      }
    } catch (err) {
      console.error("Genel veri yükleme hatası:", err);
      setError(`Veri yükleme hatası: ${err.message}`);
      setUsingDemoData(true);
      processDemoData();
    }
  };
  
  const processCsvText = (rawCsvText) => {
    console.log("Ham CSV verisi işleniyor...");
    console.log(`CSV metni uzunluğu: ${rawCsvText.length} karakter`);
    
    if (rawCsvText.length < 100) {
            console.error("CSV verisi çok kısa veya boş");
      setUsingDemoData(true);
      processDemoData();
      return;
    }
    
    // CSV'nin başı ve sonu hakkında bilgi ver
    console.log("CSV başlangıç: ", rawCsvText.substring(0, 200));
    console.log("CSV bitiş: ", rawCsvText.substring(rawCsvText.length - 200));
    
    // Satır sayısını kontrol et
    const lineCount = (rawCsvText.match(/\n/g) || []).length;
    console.log(`CSV satır sayısı (ham): ${lineCount}`);
    
    // ÖNEMLI: CSV düzeltme işlemleri kaldırıldı - ham veriyi doğrudan kullan
    console.log("CSV düzeltme işlemleri devre dışı bırakıldı - ham veri kullanılıyor");
    
    // Papa Parse yapılandırması
          const parserOptions = {
      header: true,           // İlk satırı başlık olarak kullan
      transformHeader: header => header.trim(),
      skipEmptyLines: 'greedy', // Boş satırları atla
      delimitersToGuess: [',', ';', '\t', '|', ' '], // Denemeye değer ayırıcılar
      newline: '', // Otomatik satır sonu algılama
      dynamicTyping: true,     // Sayıları otomatik dönüştür
      encoding: "UTF-8",       // UTF-8 kodlaması kullan 
      complete: (results) => {
        console.log("CSV ayrıştırma tamamlandı");
        processCSVResults(results);
      },
            error: (error) => {
              console.error("CSV ayrıştırma hatası:", error);
              setError(`CSV ayrıştırma hatası: ${error.message}`);
        
        // Hata durumunda demo veri oluştur
              setUsingDemoData(true);
              processDemoData();
      },
      transform: (value, field) => {
        // Boşlukları temizle ve formatı düzelt
        if (typeof value === 'string') {
          return value.trim();
        }
        return value;
      }
    };
    
    // CSV'yi ayrıştır
    try {
      // Ham CSV verisini doğrudan ayrıştır, csvFix kullanma
      Papa.parse(rawCsvText, parserOptions);
    } catch (error) {
      console.error("CSV ön işleme hatası:", error);
        setUsingDemoData(true);
        processDemoData();
      }
    };
    
    const processCSVResults = (results) => {
      try {
        console.log("CSV ayrıştırma tamamlandı, satır sayısı:", results.data.length);
        
        if (results.errors && results.errors.length > 0) {
          console.error("CSV ayrıştırma hataları:", results.errors);
        
        // Hataları daha detaylı göster
        results.errors.forEach((error, index) => {
          console.error(`Hata #${index + 1}:`, error.message, "- Satır:", error.row);
        });
        }
        
        if (results.data.length === 0) {
          throw new Error("CSV'de veri satırı bulunamadı");
        }
        
        // Veri sütunlarını inceleme
        const firstRow = results.data[0];
        console.log("İlk satır anahtarları:", Object.keys(firstRow));
      console.log("İlk satır değerleri:", Object.values(firstRow));
      console.log("İlk veri satırı tam içerik:", firstRow);
      
      // Tüm sütun adlarını kontrol et 
      const columnKeys = Object.keys(results.data[0] || {});
      console.log("Bulunan tüm sütun adları:", columnKeys);
      
      // Veri tipi kontrolü
      Object.entries(firstRow).forEach(([key, value]) => {
        console.log(`Sütun: ${key}, Değer: ${value}, Tip: ${typeof value}`);
      });
        
        // Enlem ve boylam sütunlarını tespit et
        let latitudeColumn = null;
        let longitudeColumn = null;
        let timestampColumn = null;
      
      // Türkçe ve İngilizce sütun isimlerini tanımla
      const latitudeNames = ['lat', 'latitude', 'enlem'];
      const longitudeNames = ['lon', 'lng', 'longitude', 'boylam'];
      const timestampNames = ['time', 'date', 'stamp', 'zaman', 'zamandamgasi', 'zamandamgası'];
        
        for (const key of Object.keys(firstRow)) {
          const lowerKey = key.toLowerCase();
        
        // Genişletilmiş eşleştirme kontrolü
        if (latitudeNames.some(name => lowerKey.includes(name))) {
            latitudeColumn = key;
          console.log(`Enlem sütunu tespit edildi: ${key}, değer: ${firstRow[key]}`);
          }
        
        if (longitudeNames.some(name => lowerKey.includes(name))) {
            longitudeColumn = key;
          console.log(`Boylam sütunu tespit edildi: ${key}, değer: ${firstRow[key]}`);
          }
        
        if (timestampNames.some(name => lowerKey.includes(name))) {
            timestampColumn = key;
          console.log(`Zaman sütunu tespit edildi: ${key}, değer: ${firstRow[key]}`);
          }
        }
        
        console.log("Tespit edilen sütunlar:", {
          enlem: latitudeColumn,
          boylam: longitudeColumn,
          zaman: timestampColumn
        });
      
      // Özel durum - Türkçe Enlem ve Boylam sütunları için doğrudan kontrol
      if (!latitudeColumn && (firstRow.Enlem !== undefined || firstRow.enlem !== undefined)) {
        latitudeColumn = firstRow.Enlem !== undefined ? 'Enlem' : 'enlem';
        console.log(`Türkçe enlem sütunu kullanılıyor: ${latitudeColumn}, değer: ${firstRow[latitudeColumn]}`);
      }
      
      if (!longitudeColumn && (firstRow.Boylam !== undefined || firstRow.boylam !== undefined)) {
        longitudeColumn = firstRow.Boylam !== undefined ? 'Boylam' : 'boylam';
        console.log(`Türkçe boylam sütunu kullanılıyor: ${longitudeColumn}, değer: ${firstRow[longitudeColumn]}`);
      }
      
      if (!timestampColumn && (firstRow.ZamanDamgasi !== undefined || firstRow.Zamandamgasi !== undefined)) {
        timestampColumn = firstRow.ZamanDamgasi !== undefined ? 'ZamanDamgasi' : 'Zamandamgasi';
        console.log(`Türkçe zaman damgası sütunu kullanılıyor: ${timestampColumn}, değer: ${firstRow[timestampColumn]}`);
      }
        
        if (!latitudeColumn || !longitudeColumn) {
        console.error("Enlem veya boylam sütunları tespit edilemedi. Tüm sütunlar:", Object.keys(firstRow).join(", "));
        
        // Alternatif olarak standart sütun isimlerini kullanmayı dene
        if (firstRow.Latitude !== undefined || firstRow.latitude !== undefined) {
          latitudeColumn = firstRow.Latitude !== undefined ? 'Latitude' : 'latitude';
          console.log(`Standart enlem sütunu kullanılıyor: ${latitudeColumn}`);
        }
        
        if (firstRow.Longitude !== undefined || firstRow.longitude !== undefined) {
          longitudeColumn = firstRow.Longitude !== undefined ? 'Longitude' : 'longitude';
          console.log(`Standart boylam sütunu kullanılıyor: ${longitudeColumn}`);
        }
        
        if (!latitudeColumn || !longitudeColumn) {
          console.error("Standart enlem veya boylam sütunları da bulunamadı. Demo veri kullanılacak.");
          setUsingDemoData(true);
          processDemoData();
          return;
        }
      }
      
      // Zaman ve koordinat sütunlarının şehir verisi ile uyumluluğunu kontrol et
      // Türkçe sütun adları için genişletilmiş kontrol
      const isCityDataset = columnKeys.some(key => key.toLowerCase().includes('zamandamga')) && 
                             columnKeys.some(key => key.toLowerCase().includes('enlem')) && 
                             columnKeys.some(key => key.toLowerCase().includes('boylam')) &&
                             columnKeys.some(key => key.toLowerCase().includes('ika'));
                             
      console.log("Şehir veri seti mi?", isCityDataset);
      
      if (isCityDataset) {
        console.log("Şehir veri seti algılandı, özel alanlar kullanılacak");
        // Şehir verisi için özel sütun isimleri - varsa mevcut değeri kullan
        if (!latitudeColumn) latitudeColumn = columnKeys.find(key => key.toLowerCase().includes('enlem'));
        if (!longitudeColumn) longitudeColumn = columnKeys.find(key => key.toLowerCase().includes('boylam'));
        if (!timestampColumn) timestampColumn = columnKeys.find(key => key.toLowerCase().includes('zamandamga'));
        
        console.log("Şehir veri seti için kullanılan sütunlar:", {
          enlem: latitudeColumn,
          boylam: longitudeColumn,
          zaman: timestampColumn
        });
        }
        
        // Verileri işle ve temizle
        let validRowCount = 0;
        let invalidRowCount = 0;
        let fixedCoordinateCount = 0;
      
      // Türkçe sensör sütunlarını eşleştir
      const sensorMappings = {
        // Hava kalitesi
        'PM2.5_ug_m3': ['PM2.5_ug_m3', 'PM2.5', 'PM25'],
        'PM10_ug_m3': ['PM10_ug_m3', 'PM10'],
        'CO_ppm': ['CO_ppm', 'CO'],
        'NO2_ppb': ['NO2_ppb', 'NO2'],
        'SO2_ppb': ['SO2_ppb', 'SO2'],
        'O3_ppb': ['O3_ppb', 'O3'],
        'VOC_ppb': ['VOC_ppb', 'VOC'],
        
        // Çevresel koşullar
        'Temperature_C': ['Temperature_C', 'Sicaklik_C', 'Sıcaklık_C', 'Sicaklik', 'Sıcaklık'],
        'Relative_Humidity_Percent': ['Relative_Humidity_Percent', 'Bagil_Nem_Yuzde', 'Bağıl_Nem_Yüzde', 'Nem'],
        'Sound_Level_dB': ['Sound_Level_dB', 'Ses_Seviyesi_dB', 'Ses'],
        'Light_Level_lux': ['Light_Level_lux', 'Isik_Seviyesi_lux', 'Işık_Seviyesi_lux', 'Isik', 'Işık'],
        
        // Diğer
        'Vibration_g': ['Vibration_g', 'Titresim_g', 'Titreşim_g', 'Titresim', 'Titreşim'],
        'Radiation_uSv_h': ['Radiation_uSv_h', 'Radyasyon_uSv_h', 'Radyasyon']
      };
      
      // CSV'deki sütun adlarını kontrol ederek sensör eşlemelerini yap
      const sensorColumnMap = {};
      for (const [standardKey, possibleColumns] of Object.entries(sensorMappings)) {
        for (const colName of possibleColumns) {
          const matchingColumn = columnKeys.find(key => 
            key.toLowerCase() === colName.toLowerCase() || 
            key.toLowerCase().includes(colName.toLowerCase())
          );
          
          if (matchingColumn) {
            sensorColumnMap[standardKey] = matchingColumn;
            console.log(`Sensör eşleştirmesi: ${standardKey} -> ${matchingColumn}`);
            break;
          }
        }
      }
      
      // Bulunan sensörleri göster
      console.log("Algılanan sensör sütunları:", sensorColumnMap);
        
        const cleanedData = results.data
          .filter(item => {
            // Sadece veri içeren satırları al (en az 3 alan dolu olmalı)
            const filledFields = Object.values(item).filter(v => v !== undefined && v !== null && v !== '').length;
            if (filledFields < 3) {
              invalidRowCount++;
              return false;
            }
            return true;
          })
          .map(item => {
            try {
              // Koordinatları ayrıştır ve doğrula
              let lat = parseFloat(item[latitudeColumn]);
              let lng = parseFloat(item[longitudeColumn]);
              
              // Koordinat geçerli değilse düzelt
              if (!isValidCoordinate(lat, lng)) {
                fixedCoordinateCount++;
              [lat, lng] = fixCoordinates(lat, lng, selectedCity);
              } 
            // Şehir sınırları dışındaysa düzelt
            else if (!isInCityBounds(lat, lng, selectedCity)) {
                fixedCoordinateCount++;
              [lat, lng] = fixCoordinates(lat, lng, selectedCity);
              }
              
              // Zaman bilgisini ayrıştır
              let timestamp = new Date();
              let hour = 0;
            let minute = 0;
              
              if (timestampColumn && item[timestampColumn]) {
                try {
                  timestamp = new Date(item[timestampColumn]);
                  if (!isNaN(timestamp.getTime())) {
                    hour = timestamp.getHours();
                  minute = timestamp.getMinutes(); // Dakika bilgisini de al
                  console.log(`Zaman damgası başarıyla ayrıştırıldı: ${item[timestampColumn]} -> ${hour}:${minute}`);
                } else {
                  console.warn(`Geçersiz zaman damgası: ${item[timestampColumn]}`);
                  }
                } catch (e) {
                console.error(`Zaman damgası ayrıştırma hatası: ${e.message}`);
                  // Geçersiz zaman formatı, varsayılan kullan
                }
              }
              
              // Her sütunu sayısal değere dönüştürmeyi dene
            const processedItem = {
              // Temel alanları ekle
              Latitude: lat,
              Longitude: lng,
              Timestamp: timestamp,
              hour: hour,
              minute: minute,
            };
            
            // Orijinal sütun değerlerini koru
            if (latitudeColumn) processedItem[latitudeColumn] = lat;
            if (longitudeColumn) processedItem[longitudeColumn] = lng;
            if (timestampColumn) processedItem[timestampColumn] = item[timestampColumn];
            
            // ID alanı için kontrol
            if (item.Ika_ID) {
              processedItem.Ika_ID = item.Ika_ID;
            } else if (item.IKA_ID) {
              processedItem.Ika_ID = item.IKA_ID;
                  } else {
              // Benzer ID alanını ara
              const possibleIDFields = ['id', 'cihaz', 'sensor'];
              let idField = null;
              
              for (const field of Object.keys(item)) {
                if (possibleIDFields.some(idName => field.toLowerCase().includes(idName))) {
                  idField = field;
                  break;
                }
              }
              
              if (idField) {
                processedItem.Ika_ID = item[idField];
              } else {
                processedItem.Ika_ID = `Generated_${validRowCount}`;
              }
            }
            
            // Tüm sensör alanlarını işle
            for (const [standardKey, originalKey] of Object.entries(sensorColumnMap)) {
              if (item[originalKey] !== undefined && item[originalKey] !== null && item[originalKey] !== '') {
                // Sayısal değere dönüştürmeyi dene
                const numValue = parseFloat(item[originalKey]);
                if (!isNaN(numValue)) {
                  // Hem standart adla hem de orijinal adla ekle
                  processedItem[standardKey] = numValue;
                  processedItem[originalKey] = numValue;
                } else {
                  // Sayısal dönüştürme başarısız olduysa, string olarak sakla
                  processedItem[standardKey] = item[originalKey];
                  processedItem[originalKey] = item[originalKey];
                }
              }
              }
              
              validRowCount++;
              return processedItem;
            } catch (e) {
              console.error("Satır işleme hatası:", e, item);
              invalidRowCount++;
              return null;
            }
          })
          .filter(item => item !== null);
        
        console.log(`Veri işleme özeti:
          Toplam satır: ${results.data.length}
          Geçerli satır: ${validRowCount}
          Geçersiz satır: ${invalidRowCount}
          Düzeltilen koordinat: ${fixedCoordinateCount}
          Son veri boyutu: ${cleanedData.length}`);
        
        if (cleanedData.length === 0) {
          console.error("İşlemeden sonra geçerli veri satırı kalmadı. Demo veri kullanılacak.");
          setUsingDemoData(true);
          processDemoData();
          return;
        }
        
        // Veri örneği göster
        console.log("İşlenmiş veri örneği:", cleanedData[0]);
      console.log("Son işlenmiş verinin tüm alanları:", Object.keys(cleanedData[0]));
      
      // Sensör listesini oluştur
      const sensorsToInclude = [];
      // Standart sensörler için kontrol et ve ekle
      for (const standardKey of Object.keys(sensorMappings)) {
        // Temizlenmiş veri içinde bu sensör var mı kontrol et
        const sensorExists = cleanedData.some(item => item[standardKey] !== undefined);
        
        if (sensorExists) {
          const sensorInfo = sensorDisplayInfo[standardKey] || { name: standardKey, unit: '' };
          sensorsToInclude.push({
            id: standardKey,
            name: sensorInfo.name || standardKey,
            unit: sensorInfo.unit || ''
          });
          console.log(`Sensör listeye eklendi: ${standardKey}`);
        }
      }
      
      // Algılanmamış potansiyel sensörleri kontrol et
      const knownSensors = Object.keys(sensorMappings).flat();
      const potentialSensorColumns = columnKeys.filter(key => {
        // Bilinen kolon tiplerini ve koordinat/zaman/id kolonlarını hariç tut
        const isKnownType = key === latitudeColumn || 
                           key === longitudeColumn || 
                           key === timestampColumn ||
                           key.toLowerCase().includes('ika') ||
                           key.toLowerCase().includes('id') ||
                           key.toLowerCase().includes('height') ||
                           key.toLowerCase().includes('hedef');
        
        // Daha önce algılanmış sensör değilse ve bilinen tip değilse, potansiyel sensör olabilir
        return !isKnownType && !knownSensors.includes(key);
      });
      
      // Potansiyel sensörleri ekle
      for (const colName of potentialSensorColumns) {
        // Bu sütunda en az bir sayısal değer var mı kontrol et
        const hasNumericValues = cleanedData.some(item => {
          const val = item[colName];
          return val !== undefined && val !== null && !isNaN(parseFloat(val));
        });
        
        if (hasNumericValues) {
          // Eğer bu sensör daha önce eklenmediyse ekle
          if (!sensorsToInclude.some(s => s.id === colName)) {
            sensorsToInclude.push({
              id: colName,
              name: colName,
              unit: ''
            });
            console.log(`Algılanmamış potansiyel sensör eklendi: ${colName}`);
          }
        }
      }
      
      console.log(`Toplam ${sensorsToInclude.length} sensör tespit edildi:`, sensorsToInclude);
      setAvailableSensors(sensorsToInclude);
      
      // İstatistikler hesaplanıyor
      let stats;
      try {
        stats = calculateStatistics(cleanedData);
      } catch (statError) {
        console.error('calculateStatistics hata', statError);
          setUsingDemoData(true);
          processDemoData();
          return;
        }
        
      // Verileri güncelle
      setSensorData(cleanedData);
        setSensorStatistics(stats);
        setLoading(false);
      setError(null);
      console.log("Veri yükleme tamamlandı!");
        
      } catch (processError) {
        console.error("CSV işleme hatası:", processError);
        setError(`CSV işleme hatası: ${processError.message}`);
        setUsingDemoData(true);
        processDemoData();
      }
    };
    
  const processData = (data, latKey, lonKey, sensorIdKey, timestampKey, sensorKeys) => {
    console.log(`İşlenecek veri noktası sayısı: ${data.length}`);
    
    // Veriyi temizle ve standardize et
    const standardizedData = data.map(item => {
      const lat = parseFloat(item[latKey]);
      const lng = parseFloat(item[lonKey]);
      const timestamp = new Date(item[timestampKey] || new Date());
      const hour = timestamp.getHours();
      
      // Şehir sınırlarında mı kontrol et
      if (!isInCityBounds(lat, lng, selectedCity)) {
        return null; // Şehir dışındaki verileri atla
      }
      
      const standardizedItem = {
        Latitude: lat,
        Longitude: lng,
        Timestamp: timestamp,
        hour,
      };
      
      // Sensör ID'sini ekle
      if (sensorIdKey && item[sensorIdKey]) {
        standardizedItem.Ika_ID = item[sensorIdKey];
      } else {
        standardizedItem.Ika_ID = "Unknown";
      }
      
      // Tüm sensör verilerini standardize et
      Object.entries(sensorKeys).forEach(([standardKey, originalKey]) => {
        if (item[originalKey] !== undefined) {
          try {
            const value = parseFloat(item[originalKey]);
            if (!isNaN(value) && isFinite(value)) {
              // Hem standardize ad hem de orijinal adı kullan
              standardizedItem[standardKey] = value;
              // Orijinal adları da sakla böylece calculateStatistics bunları bulabilir
              standardizedItem[originalKey] = value;
            }
          } catch (error) {
            // Sayısal dönüştürme hatası, bu alanı atla
          }
        }
      });
      
      return standardizedItem;
    }).filter(item => item !== null);
    
    console.log(`Standardize edilmiş veri sayısı: ${standardizedData.length}`);
    
    if (standardizedData.length === 0) {
      console.error("Veri standardizasyonundan sonra hiç geçerli veri kalmadı.");
      setUsingDemoData(true);
      processDemoData();
      return;
    }
    
    // İlk birkaç veriyi göster
    console.log("Standardize edilmiş örnek veri:", standardizedData.slice(0, 3));
    
    // Sensör adlarını tanımla
    const sensorsToInclude = Object.entries(sensorKeys).map(([standardKey, originalKey]) => {
      return {
        id: standardKey,
        name: getSensorDisplayName(standardKey, originalKey),
        unit: getSensorUnit(standardKey)
      };
    });
    
    console.log("Kullanılacak sensörler:", sensorsToInclude);
    setAvailableSensors(sensorsToInclude);
    
    // İstatistikler hesaplanıyor
    let stats;
    try {
      stats = calculateStatistics(standardizedData);
    } catch (statError) {
      console.error('calculateStatistics hata', statError);
      // Hata durumunda demo veri kullan
      setUsingDemoData(true);
      processDemoData();
      return;
    }
    
    // Verileri güncelle
    setSensorData(standardizedData);
    setFilteredData(standardizedData);
    setSensorStatistics(stats);
    setLoading(false);
    setError(null);
    console.log("Veri yükleme tamamlandı!");
  };
  
  const processDemoData = () => {
    console.log("CSV verisi okunamadı, demo veri kullanılıyor...");
    
    // Demo veri oluştur
    const demoData = generateDemoData();
    console.log("Demo veri oluşturuldu:", demoData.length, "veri noktası");
    
    // Sensör tanımlarını oluştur
    const sensorsToInclude = [
      { id: 'PM2.5_ug_m3', name: 'Hava Kirliliği: PM2.5', unit: 'μg/m³' },
      { id: 'PM10_ug_m3', name: 'Hava Kirliliği: PM10', unit: 'μg/m³' },
      { id: 'CO_ppm', name: 'Karbon Monoksit', unit: 'ppm' },
      { id: 'NO2_ppb', name: 'Azot Dioksit', unit: 'ppb' },
      { id: 'SO2_ppb', name: 'Kükürt Dioksit', unit: 'ppb' },
      { id: 'O3_ppb', name: 'Ozon', unit: 'ppb' },
      { id: 'VOC_ppb', name: 'Uçucu Organik Bileşikler', unit: 'ppb' },
      { id: 'Temperature_C', name: 'Sıcaklık', unit: '°C' },
      { id: 'Relative_Humidity_Percent', name: 'Nem', unit: '%' },
      { id: 'Sound_Level_dB', name: 'Ses Seviyesi', unit: 'dB' },
      { id: 'Light_Level_lux', name: 'Işık Seviyesi', unit: 'lux' },
      { id: 'Vibration_g', name: 'Titreşim', unit: 'g' },
      { id: 'Radiation_uSv_h', name: 'Radyasyon', unit: 'μSv/h' }
    ];
            
    setAvailableSensors(sensorsToInclude);

    // Demo veri için istatistikler hesapla
    const stats = calculateStatistics(demoData);
    setSensorStatistics(stats);
    
    setSensorData(demoData);
    setFilteredData(demoData);
    setLoading(false);
  };

  // Helper function to filter data by hour and minute
  const filterDataByTime = (data, selectedHour, selectedMinute) => {
    if (!data || data.length === 0) return [];
    
    console.log(`Veri filtrelemesi başlıyor: ${selectedHour}:${selectedMinute}, toplam veri nokta sayısı: ${data.length}`);
    
    // Tüm benzersiz sensör ID'lerini bul
    const allSensorIds = Array.from(new Set(data.map(item => item.Ika_ID)));
    console.log(`Tüm veri setinde ${allSensorIds.length} benzersiz sensör bulundu`);
    
    // Sadece seçili saate ait verileri filtrele
    const hourData = data.filter(item => {
      // Saat kontrolü
      if (item.hour !== undefined) {
        return item.hour === selectedHour;
      }
      
      if (item.Timestamp instanceof Date) {
        return item.Timestamp.getHours() === selectedHour;
      }
      
      if (item.ZamanDamgasi) {
        try {
          const date = new Date(item.ZamanDamgasi);
          return !isNaN(date.getTime()) && date.getHours() === selectedHour;
        } catch (e) {
          return false;
        }
      }
      
      return false;
    });
    
    console.log(`${selectedHour}. saat için bulunan veri sayısı: ${hourData.length}`);
    
    // O saate ait benzersiz sensörler
    const sensorsInHour = Array.from(new Set(hourData.map(item => item.Ika_ID)));
    console.log(`${selectedHour}. saatte veri gönderen sensör sayısı: ${sensorsInHour.length}`);
    console.log("Saatte bulunan sensör ID'leri:", sensorsInHour);
    
    // Her sensör için özellikle o dakikada veri var mı kontrol et
    const minuteData = hourData.filter(item => {
      // Dakika kontrolü
      let itemMinute = null;
      
      if (item.minute !== undefined) {
        itemMinute = item.minute;
      } else if (item.Timestamp instanceof Date) {
        itemMinute = item.Timestamp.getMinutes();
      } else if (item.ZamanDamgasi) {
        try {
          const date = new Date(item.ZamanDamgasi);
          if (!isNaN(date.getTime())) {
            itemMinute = date.getMinutes();
          }
        } catch (e) {
          // Ayrıştırma hatası
        }
      }
      
      return itemMinute === selectedMinute;
    });
    
    // Seçilen dakikadaki benzersiz sensörler
    const sensorsInMinute = Array.from(new Set(minuteData.map(item => item.Ika_ID)));
    console.log(`${selectedHour}:${selectedMinute} dakikasında veri gönderen sensör sayısı: ${sensorsInMinute.size}`);
    console.log("Dakikada bulunan sensör ID'leri:", sensorsInMinute);
    
    // Her sensör için o dakikadaki kayıt sayısı
    const sensorCount = {};
    minuteData.forEach(item => {
      sensorCount[item.Ika_ID] = (sensorCount[item.Ika_ID] || 0) + 1;
    });
    
    // Birden fazla kayıt olan sensörleri göster
    const multiRecordSensors = Object.entries(sensorCount)
      .filter(([_, count]) => count > 1)
      .map(([id, count]) => ({ id, count }));
    
    if (multiRecordSensors.length > 0) {
      console.log(`${selectedHour}:${selectedMinute} dakikasında birden fazla kaydı olan sensörler:`, multiRecordSensors);
    }
    
    // Eksik sensörleri göster - saatte olup dakikada olmayan
    const missingSensors = sensorsInHour.filter(id => !sensorsInMinute.includes(id));
    if (missingSensors.length > 0) {
      console.log(`${selectedHour}:${selectedMinute} dakikasında veri göndermeyen ${missingSensors.length} sensör var:`, missingSensors);
    }
    
    console.log(`${selectedHour}:${selectedMinute} için toplam ${minuteData.length} veri noktası filtrelendi`);
    
    return minuteData;
  };

  // In useEffect where filteredData is updated
  useEffect(() => {
    if (sensorData.length > 0) {
      // Veri miktarı ve niteliği hakkında bilgi ver
      console.log(`Toplam veri nokta sayısı: ${sensorData.length}`);
      console.log(`Filtreleme için seçilen zaman: ${selectedHour}:${selectedMinute}`);
      
      // Benzersiz IKA_ID'leri kontrol et
      const uniqueIkaIDs = new Set(sensorData.map(item => item.Ika_ID)).size;
      console.log(`Veri setindeki toplam benzersiz sensör sayısı: ${uniqueIkaIDs}`);
      
      // Dakika bazında veri sayısını görmek için her dakikadaki kayıt sayısını hesapla
      const allMinuteCountInHour = {};
      sensorData.filter(item => item.hour === selectedHour).forEach(item => {
        const minute = item.minute !== undefined ? item.minute : 
                      (item.Timestamp instanceof Date ? item.Timestamp.getMinutes() : -1);
        if (minute >= 0) {
          allMinuteCountInHour[minute] = (allMinuteCountInHour[minute] || 0) + 1;
        }
      });
      console.log(`${selectedHour}. saatteki tüm dakikalar ve kayıt sayıları:`, allMinuteCountInHour);
      
      // Saate göre filtreleme yap
      const hourFiltered = sensorData.filter(item => {
        // İlk önce hour özelliğini kontrol et
        if (item.hour !== undefined) {
          return item.hour === selectedHour;
        }
        
        // Timestamp özelliğini kontrol et
        if (item.Timestamp instanceof Date) {
          return item.Timestamp.getHours() === selectedHour;
        }
        
        // ZamanDamgasi özelliğini kontrol et
        if (item.ZamanDamgasi) {
          try {
            const date = new Date(item.ZamanDamgasi);
            return !isNaN(date.getTime()) && date.getHours() === selectedHour;
          } catch (e) {
            return false;
          }
        }
        
        return false;
      });
      
      // Saatteki benzersiz sensörleri bul
      const sensorsInHour = Array.from(new Set(hourFiltered.map(item => item.Ika_ID)));
      console.log(`${selectedHour}. saatte bulunan toplam sensör sayısı: ${sensorsInHour.length}`);
      
      // Tüm veriyi filtrele - sadece seçilen dakika için
      const minuteFiltered = filterDataByTime(sensorData, selectedHour, selectedMinute);
      console.log(`${selectedHour}:${selectedMinute} için filtrelenen veri: ${minuteFiltered.length} satır`);
      
      // ÖNEMLI: Dakika kontrolünü değiştirdik - artık 10'dan az olsa bile dakika verileri gösterilecek
      // Bu sayede tüm ham veri olduğu gibi görüntülenecek
      if (minuteFiltered.length === 0) {
        console.log(`${selectedMinute}. dakika için hiç veri bulunamadı, tüm saat verilerini gösteriyorum`);
        setFilteredData(hourFiltered);
      } else {
        console.log(`${selectedMinute}. dakika için ${minuteFiltered.length} veri noktası gösteriliyor`);
        setFilteredData(minuteFiltered);
      }
    }
  }, [sensorData, selectedHour, selectedMinute]);

  // Function to check if a value is anomalous
  const isAnomaly = useCallback((sensorId, value) => {
    if (!sensorStatistics || !sensorStatistics[sensorId]) return false;
    
    const stats = sensorStatistics[sensorId];
    const hourStats = stats.byHour[selectedHour] || stats.overall;
    
    // Using 2 standard deviations as threshold for anomaly
    const threshold = 2;
    const normalizedValue = (value - hourStats.mean) / hourStats.std;
    
    return Math.abs(normalizedValue) > threshold;
  }, [sensorStatistics, selectedHour]);

  // Helper function to get sensor display name
  const getSensorDisplayName = (sensorId, originalName) => {
    const displayNames = {
      'PM25': 'Hava Kirliliği: PM2.5',
      'PM10': 'Hava Kirliliği: PM10',
      'CO': 'Karbon Monoksit',
      'NO2': 'Azot Dioksit',
      'SO2': 'Kükürt Dioksit',
      'O3': 'Ozon',
      'VOC': 'Uçucu Organik Bileşikler',
      'Temperature': 'Sıcaklık',
      'Humidity': 'Nem',
      'Sound': 'Ses Seviyesi',
      'Light': 'Işık Seviyesi',
      'Vibration': 'Titreşim',
      'MagneticX': 'Manyetik Alan X',
      'MagneticY': 'Manyetik Alan Y',
      'MagneticZ': 'Manyetik Alan Z',
      'Radiation': 'Radyasyon'
    };
    
    return displayNames[sensorId] || originalName || sensorId;
  };
  
  // Helper function to get sensor unit
  const getSensorUnit = (sensorId) => {
    const units = {
      'PM25': 'μg/m³',
      'PM10': 'μg/m³',
      'CO': 'ppm',
      'NO2': 'ppb',
      'SO2': 'ppb',
      'O3': 'ppb',
      'VOC': 'ppb',
      'Temperature': '°C',
      'Humidity': '%',
      'Sound': 'dB',
      'Light': 'lux',
      'Vibration': 'g',
      'MagneticX': 'μT',
      'MagneticY': 'μT',
      'MagneticZ': 'μT',
      'Radiation': 'μSv/h'
    };
    
    return units[sensorId] || '';
  };

  // Demo verisi - eğer gerçek veri okunamazsa kullanılır
  const generateDemoData = () => {
    const demoData = [];
    const sensorsToInclude = [
      'PM2.5_ug_m3', 'PM10_ug_m3', 'CO_ppm', 'NO2_ppb', 'SO2_ppb', 'O3_ppb', 'VOC_ppb',
      'Temperature_C', 'Relative_Humidity_Percent', 'Sound_Level_dB', 'Light_Level_lux', 
      'Vibration_g', 'Radiation_uSv_h'
    ];
    
    // Şehir için 200 rastgele nokta oluştur
    for (let i = 0; i < 200; i++) {
      // Şehir sınırları içinde rastgele kordinatlar
      const latitude = CITY_SETTINGS[selectedCity].minLat + Math.random() * (CITY_SETTINGS[selectedCity].maxLat - CITY_SETTINGS[selectedCity].minLat);
      const longitude = CITY_SETTINGS[selectedCity].minLng + Math.random() * (CITY_SETTINGS[selectedCity].maxLng - CITY_SETTINGS[selectedCity].minLng);
      
      const record = {
        Ika_ID: `DEMO_${i}`,
        Latitude: latitude,
        Longitude: longitude,
        Timestamp: new Date(),
        hour: Math.floor(Math.random() * 24)
      };
      
      // Her sensör için rastgele değerler ekle
      sensorsToInclude.forEach(sensor => {
        // Sensöre göre farklı değer aralıkları belirle (daha gerçekçi veriler için)
        let minVal = 0;
        let maxVal = 100;
        
        if (sensor === 'Temperature_C') {
          minVal = 5;
          maxVal = 35;
        } else if (sensor === 'Relative_Humidity_Percent') {
          minVal = 30;
          maxVal = 90;
        } else if (sensor.includes('ppb') || sensor.includes('ppm')) {
          minVal = 0;
          maxVal = 50;
        }
        
        record[sensor] = minVal + Math.random() * (maxVal - minVal);
      });
      
      demoData.push(record);
    }
    
    return demoData;
  };

  return (
    <DataContext.Provider value={{
      sensorData,
      filteredData,
      selectedHour,
      setSelectedHour,
      selectedMinute,
      setSelectedMinute,
      loading,
      availableSensors,
      sensorStatistics,
      isAnomaly,
      error,
      usingDemoData,
      // Şehir değiştirme özellikleri
      selectedCity,
      setSelectedCity,
      citySettings: CITY_SETTINGS,
      availableCities: Object.keys(CITY_SETTINGS)
    }}>
      {children}
    </DataContext.Provider>
  );
};

// Add a custom hook to easily access the context
export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}; 