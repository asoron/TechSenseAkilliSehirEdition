import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

/**
 * HeatmapLayer - Leaflet.heat kütüphanesini kullanarak ısı haritası oluşturan bileşen
 *
 * @param {Object} props
 * @param {Array} props.points - [lat, lng, intensity] formatında noktalar dizisi
 * @param {number} props.radius - Isı noktalarının yarıçapı (piksel)
 * @param {number} props.blur - Bulanıklık miktarı (piksel)
 * @param {number} props.maxZoom - Maksimum yakınlaştırma seviyesi
 * @param {number} props.max - Maksimum yoğunluk değeri (1.0 önerilen)
 * @param {Object} props.gradient - Renk gradyanı ({ 0.4: 'blue', 0.6: 'lime', ... } formatında)
 */
const HeatmapLayer = ({ 
  points, 
  radius = 25, 
  blur = 15, 
  maxZoom = 18, 
  max = 1.0,
  gradient = { 0.4: 'blue', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red' }
}) => {
  const map = useMap();
  const heatLayerRef = useRef(null);
  
  useEffect(() => {
    // Önceki ısı haritası katmanını kaldır (varsa)
    if (heatLayerRef.current) {
      heatLayerRef.current.remove();
      heatLayerRef.current = null;
    }
    
    try {
      // L.heatLayer kullanılabilir mi kontrol et
      if (!L.heatLayer) {
        console.error('L.heatLayer mevcut değil. leaflet.heat kütüphanesinin yüklendiğinden emin olun.');
        return;
      }
      
      // Isı haritasını oluştur
      console.log(`Isı haritası oluşturuluyor: ${points.length} nokta`);
      
      if (points && points.length > 0) {
        const heatLayer = L.heatLayer(points, {
          radius,
          blur,
          maxZoom,
          max,
          gradient
        });
        
        // Haritaya ekle
        heatLayer.addTo(map);
        heatLayerRef.current = heatLayer;
      } else {
        console.warn('Isı haritası için nokta yok');
      }
    } catch (error) {
      console.error('Isı haritası oluşturulurken hata:', error);
    }
    
    // Temizlik fonksiyonu
    return () => {
      if (heatLayerRef.current) {
        heatLayerRef.current.remove();
        heatLayerRef.current = null;
      }
    };
  }, [map, points, radius, blur, maxZoom, max, gradient]);
  
  // Bu bileşen herhangi bir görsel UI öğesi döndürmez,
  // sadece yan etki olarak haritaya bir katman ekler
  return null;
};

export default HeatmapLayer; 