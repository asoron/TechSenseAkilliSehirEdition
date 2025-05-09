import csv
import datetime
import random
import math
import numpy as np

# --- Ayarlar ---
NUM_IKAS = 50  # İKA sayısı - 50 sensör birimi 
DURATION_HOURS = 24  # 24 saatlik veri
RECORDS_PER_HOUR = 60  # Her dakika bir kayıt

# --- Aydın için ayarlar ---
# Aydın merkezi koordinatları
AYDIN_CENTER_LAT, AYDIN_CENTER_LON = 37.8560, 27.8416
# Dairesel alan için yarıçap (derece cinsinden, ~11km)
AYDIN_RADIUS = 0.1  # 0.1 derece yaklaşık 11 km

# Aydın'daki kilit konumlar
aydin_key_locations = {
    "Aydin_Merkez": (37.8560, 27.8416),
    "Aydin_Ataturk_Kent_Meydani": (37.8512, 27.8398),
    "Forum_Aydin_AVM": (37.8484, 27.8455),
    "Aydin_ADU_Kampusu": (37.8590, 27.7911),
    "Aydin_Tren_Gari": (37.8498, 27.8367),
    "Aydin_Otogar": (37.8396, 27.8678),
    "Tralleis_Antik_Kenti": (37.8689, 27.8300),
    "Kemer_Mahallesi": (37.8427, 27.8290),
    "Zafer_Mahallesi": (37.8631, 27.8523),
    "Orta_Mahalle": (37.8554, 27.8362),
    "Aydin_Devlet_Hastanesi": (37.8421, 27.8312),
    "Efeler_Belediyesi": (37.8522, 27.8383),
    "Guzelcamli": (37.7304, 27.2688),  # Bu nokta yarıçap içine zorlanacak
    "Kusadasi": (37.8640, 27.2600)     # Bu nokta yarıçap içine zorlanacak
}

# Belirlenen yarıçap içinde olup olmadığını kontrol et ve düzeltmeler yap
def is_in_circular_aydin(lat, lon):
    """Bir noktanın dairesel Aydın alanı içinde olup olmadığını kontrol eder"""
    dlat = lat - AYDIN_CENTER_LAT
    dlon = lon - AYDIN_CENTER_LON
    dlon_adjusted = dlon * math.cos(math.radians(AYDIN_CENTER_LAT))
    distance = math.sqrt(dlat**2 + dlon_adjusted**2)
    return distance <= AYDIN_RADIUS

# Tüm noktaları dairesel alan içinde kalmaya zorla
print(f"--- Dairesel Alan Yarıçapı: {AYDIN_RADIUS} derece (yaklaşık {AYDIN_RADIUS * 111:.1f} km) ---")
for name, (lat, lon) in list(aydin_key_locations.items()):
    if not is_in_circular_aydin(lat, lon):
        print(f"'{name}' konumu ({lat:.4f}, {lon:.4f}) dairesel alanın dışında.")
        # Açıyı hesapla ve sınırda bir nokta oluştur
        dlat = lat - AYDIN_CENTER_LAT
        dlon = lon - AYDIN_CENTER_LON
        dlon_adjusted = dlon * math.cos(math.radians(AYDIN_CENTER_LAT))
        angle = math.atan2(dlat, dlon_adjusted)
        
        # Yeni nokta, sınırın biraz içinde olsun
        new_distance_factor = 0.95
        new_lat = AYDIN_CENTER_LAT + (AYDIN_RADIUS * new_distance_factor) * math.sin(angle)
        new_lon = AYDIN_CENTER_LON + ((AYDIN_RADIUS * new_distance_factor) * math.cos(angle)) / math.cos(math.radians(AYDIN_CENTER_LAT))
        
        print(f"  Yeni koordinatlar: ({new_lat:.4f}, {new_lon:.4f})")
        aydin_key_locations[name] = (new_lat, new_lon)

location_names = list(aydin_key_locations.keys())
print(f"Aydın için tanımlanan toplam kilit konum sayısı: {len(location_names)}")

OUTPUT_CSV_FILE = "aydin_sensor_data_circular.csv"

# --- Dairesel alan içinde rastgele nokta üretme ---
def random_circular_point_aydin():
    """Aydın'ın dairesel alanı içinde rastgele bir nokta üretir"""
    angle = random.uniform(0, 2 * math.pi)
    radius_factor = math.sqrt(random.random())  # Uniform dağılım için
    effective_radius = AYDIN_RADIUS * radius_factor
    
    lat = AYDIN_CENTER_LAT + effective_radius * math.sin(angle)
    lon = AYDIN_CENTER_LON + (effective_radius * math.cos(angle)) / math.cos(math.radians(AYDIN_CENTER_LAT))
    
    return lat, lon

# --- Nokta sınır dışındaysa sınıra taşı ---
def enforce_circular_boundary_aydin(lat, lon):
    """Koordinatların dairesel sınır içinde olmasını sağlar"""
    if is_in_circular_aydin(lat, lon):
        return lat, lon
    
    dlat = lat - AYDIN_CENTER_LAT
    dlon = lon - AYDIN_CENTER_LON
    dlon_adjusted = dlon * math.cos(math.radians(AYDIN_CENTER_LAT))
    angle = math.atan2(dlat, dlon_adjusted)
    
    new_distance_on_edge = AYDIN_RADIUS * 0.95
    
    new_lat = AYDIN_CENTER_LAT + new_distance_on_edge * math.sin(angle)
    new_lon = AYDIN_CENTER_LON + (new_distance_on_edge * math.cos(angle)) / math.cos(math.radians(AYDIN_CENTER_LAT))
    return new_lat, new_lon

# --- Yol Ağı Simülasyonu ---
main_roads = {}
ring_road_points_count = 24

print("Aydın için yol ağı oluşturuluyor...")
for radius_factor, name in [(0.4, "Ic_Cevre_Yolu"), (0.7, "Orta_Cevre_Yolu"), (0.95, "Dis_Cevre_Yolu")]:
    road_points = []
    current_ring_radius = AYDIN_RADIUS * radius_factor
    for i in range(ring_road_points_count):
        angle = 2 * math.pi * i / ring_road_points_count
        lat = AYDIN_CENTER_LAT + current_ring_radius * math.sin(angle)
        lon = AYDIN_CENTER_LON + (current_ring_radius * math.cos(angle)) / math.cos(math.radians(AYDIN_CENTER_LAT))
        road_points.append((lat, lon))
    main_roads[name] = road_points
    print(f"'{name}' {len(road_points)} nokta ile oluşturuldu.")

num_radial_roads = 6
for i in range(num_radial_roads):
    angle = 2 * math.pi * i / num_radial_roads
    road_points = []
    for radius_factor_radial in [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]:
        current_radial_pos_radius = AYDIN_RADIUS * radius_factor_radial
        lat = AYDIN_CENTER_LAT + current_radial_pos_radius * math.sin(angle)
        lon = AYDIN_CENTER_LON + (current_radial_pos_radius * math.cos(angle)) / math.cos(math.radians(AYDIN_CENTER_LAT))
        road_points.append((lat, lon))
    main_roads[f"Radyal_Yol_{i+1}"] = road_points
    print(f"'Radyal_Yol_{i+1}' {len(road_points)} nokta ile oluşturuldu.")

# --- Sensör Veri Üretme Fonksiyonları ---
# Anomali oluşturma olasılığı
ANOMALY_CHANCE = 0.0005  # %0.05 olasılık
ANOMALY_MULTIPLIER_RANGE = (2.0, 5.0)

def maybe_add_anomaly(value, sensor_type):
    if random.random() < ANOMALY_CHANCE:
        if random.random() < 0.7:
            multiplier = random.uniform(*ANOMALY_MULTIPLIER_RANGE)
            return value * multiplier
        else:
            multiplier = random.uniform(*ANOMALY_MULTIPLIER_RANGE)
            return value / multiplier
    return value

# Aydın için sensör değerleri (Akdeniz iklimi, kıyı bölgesi özellikleri)
def get_pm25_aydin(hour, location_name_hint):
    is_center = "Merkez" in location_name_hint
    is_rush_hour = (7 <= hour <= 9) or (17 <= hour <= 19)
    base = random.uniform(5, 20)  # Aydın'da hava kirliliği genel olarak daha düşük
    if is_center: base *= random.uniform(1.1, 1.3)
    if is_rush_hour: base *= random.uniform(1.2, 1.8)
    return maybe_add_anomaly(round(min(base, 100), 2), "PM2.5")

def get_pm10_aydin(hour, location_name_hint):
    is_center = "Merkez" in location_name_hint
    is_rush_hour = (7 <= hour <= 9) or (17 <= hour <= 19)
    base = random.uniform(10, 30)
    if is_center: base *= random.uniform(1.1, 1.3)
    if is_rush_hour: base *= random.uniform(1.2, 1.8)
    return maybe_add_anomaly(round(min(base, 120), 2), "PM10")

def get_co_aydin(hour, location_name_hint):
    is_road = "Yolu" in location_name_hint
    is_rush_hour = (7 <= hour <= 9) or (17 <= hour <= 19)
    base = random.uniform(0.1, 1.2)
    if is_road: base *= random.uniform(1.2, 1.5)
    if is_rush_hour: base *= random.uniform(1.4, 2.0)
    return maybe_add_anomaly(round(min(base, 5), 2), "CO")

def get_no2_aydin(hour, location_name_hint):
    is_road = "Yolu" in location_name_hint
    is_rush_hour = (7 <= hour <= 9) or (17 <= hour <= 19)
    base = random.uniform(5, 15)
    if is_road: base *= random.uniform(1.2, 1.5)
    if is_rush_hour: base *= random.uniform(1.3, 2.0)
    return maybe_add_anomaly(round(min(base, 60), 1), "NO2")

def get_so2_aydin(location_name_hint):
    # Aydın'da büyük endüstriyel SO2 kaynakları varsayılmıyor, genel düşük seviyeler
    base = random.uniform(1, 10)
    return maybe_add_anomaly(round(min(base, 30), 1), "SO2")

def get_o3_aydin(hour):
    # Aydın, güneşli bir bölge olduğu için O3 seviyeleri özellikle gündüz daha yüksek olabilir
    if 10 <= hour <= 16:
        return maybe_add_anomaly(round(random.uniform(35, 110), 1), "O3")
    else:
        return maybe_add_anomaly(round(random.uniform(10, 30), 1), "O3")

def get_voc_aydin(location_name_hint):
    is_traffic = "Yolu" in location_name_hint or "Merkez" in location_name_hint
    base = random.uniform(30, 250)
    if is_traffic: base *= random.uniform(1.1, 1.3)
    return maybe_add_anomaly(round(min(base, 500), 0), "VOC")

def get_temperature_aydin(hour, day_variation):
    # Aydın Akdeniz iklimi: Daha sıcak yazlar, ılıman kışlar
    min_temp, max_temp = 14 + day_variation, 28 + day_variation
    amplitude = (max_temp - min_temp) / 2
    avg_temp = min_temp + amplitude
    temp = avg_temp + amplitude * math.sin((hour - 9) * (2 * math.pi / 24))
    return maybe_add_anomaly(round(temp + random.uniform(-1, 1), 1), "Sıcaklık")

def get_humidity_aydin(temperature):
    # Aydın, Ankara'ya göre daha nemli olabilir, özellikle kıyıya yakınlığı nedeniyle
    base_humidity = 65 - (temperature * 1.2)
    return maybe_add_anomaly(round(max(30, min(90, base_humidity + random.uniform(-10, 10))), 1), "Nem")

def get_sound_level_aydin(hour, location_name_hint):
    is_center = "Merkez" in location_name_hint
    is_night = (23 <= hour <= 24) or (0 <= hour <= 6)
    is_day = (7 <= hour <= 19)
    
    if is_night:
        base = random.uniform(30, 45)  # Gece saatleri daha sessiz
    elif is_day:
        base = random.uniform(55, 75)  # Gündüz saatleri daha gürültülü
    else:
        base = random.uniform(45, 60)  # Ara saatler orta düzeyde
    
    if is_center:
        base += random.uniform(5, 12)  # Merkez daha gürültülü
    
    return maybe_add_anomaly(round(min(base, 85), 1), "Ses")

def get_light_level_aydin(hour):
    # Aydın'ın daha güneşli olması nedeniyle ışık seviyeleri yüksek olabilir
    if 7 <= hour <= 18:
        return maybe_add_anomaly(round(random.uniform(5500, 90000) * (math.sin((hour-6) * math.pi / 13)**2) + random.uniform(500, 1500)), "Işık")
    else:
        return maybe_add_anomaly(round(random.uniform(1, 70) + random.choice([0,0,0,0,120,250])), "Işık")

def get_vibration_aydin(location_name_hint):
    is_construction = random.random() < 0.02
    is_traffic_heavy = "Merkez" in location_name_hint
    
    if is_construction:
        base = round(random.uniform(0.3, 1.5), 2)
    elif is_traffic_heavy:
        base = round(random.uniform(0.05, 0.3), 2)
    else:
        base = round(random.uniform(0.01, 0.15), 2)
    
    return maybe_add_anomaly(base, "Titreşim")

def get_magnetic_field_aydin():
    return maybe_add_anomaly(round(random.uniform(-60, 60), 2), "ManyetikAlan")

def get_radiation_aydin():
    if random.random() < 0.0001:
        return maybe_add_anomaly(round(random.uniform(0.31, 0.45), 3), "Radyasyon")
    else:
        return maybe_add_anomaly(round(random.uniform(0.05, 0.30), 3), "Radyasyon")

# --- Rota Fonksiyonları ---
def find_nearest_road_point_aydin(lat, lon):
    min_dist = float('inf')
    nearest_point = None
    
    for road_name, road_points_list in main_roads.items():
        for point in road_points_list:
            dist = math.sqrt((lat - point[0])**2 + (lon - point[1])**2)
            if dist < min_dist:
                min_dist = dist
                nearest_point = point
    
    if nearest_point is None:
        return (enforce_circular_boundary_aydin(lat, lon))
    
    return nearest_point

def get_circular_path_aydin(start_lat, start_lon, end_lat, end_lon):
    path = []
    
    start_lat, start_lon = enforce_circular_boundary_aydin(start_lat, start_lon)
    end_lat, end_lon = enforce_circular_boundary_aydin(end_lat, end_lon)
    
    # Eğer çok yakınsa, doğrudan rota kullan
    dist_direct = math.sqrt((start_lat - end_lat)**2 + (start_lon - end_lon)**2)
    if dist_direct < 0.005:  # ~500m
        num_steps = 3
        for i in range(num_steps):
            t = i / (num_steps - 1)
            lat = start_lat + t * (end_lat - start_lat)
            lon = start_lon + t * (end_lon - start_lon)
            path.append(enforce_circular_boundary_aydin(lat, lon))
        return path
    
    # Yol ağına bağlan
    start_road_point = find_nearest_road_point_aydin(start_lat, start_lon)
    end_road_point = find_nearest_road_point_aydin(end_lat, end_lon)
    
    # Başlangıçtan yola
    dist_to_start_road = math.sqrt((start_lat - start_road_point[0])**2 + (start_lon - start_road_point[1])**2)
    steps_to_start_road = max(2, int(dist_to_start_road * 20000))
    steps_to_start_road = min(steps_to_start_road, 10)
    
    for i in range(steps_to_start_road):
        t = i / (steps_to_start_road - 1)
        lat = start_lat + t * (start_road_point[0] - start_lat)
        lon = start_lon + t * (start_road_point[1] - start_lon)
        path.append(enforce_circular_boundary_aydin(lat, lon))
    
    # Yol üzerinde ilerleme
    if random.random() < 0.6:  # %60 olasılıkla çevre yolu kullan
        ring_road_options = [name for name in main_roads.keys() if "Cevre_Yolu" in name]
        if ring_road_options:
            chosen_ring_road = random.choice(ring_road_options)
            ring_road_points = main_roads[chosen_ring_road]
            
            start_idx = min(range(len(ring_road_points)), 
                            key=lambda i: math.sqrt((start_road_point[0] - ring_road_points[i][0])**2 + 
                                                   (start_road_point[1] - ring_road_points[i][1])**2))
            end_idx = min(range(len(ring_road_points)), 
                         key=lambda i: math.sqrt((end_road_point[0] - ring_road_points[i][0])**2 + 
                                               (end_road_point[1] - ring_road_points[i][1])**2))
            
            # Çevre yoluna katıl
            ring_entry_point = ring_road_points[start_idx]
            steps_to_ring = max(3, int(math.sqrt((start_road_point[0] - ring_entry_point[0])**2 + 
                                                (start_road_point[1] - ring_entry_point[1])**2) * 20000))
            steps_to_ring = min(steps_to_ring, 8)
            
            for i in range(steps_to_ring):
                t = i / (steps_to_ring - 1)
                lat = start_road_point[0] + t * (ring_entry_point[0] - start_road_point[0])
                lon = start_road_point[1] + t * (ring_entry_point[1] - start_road_point[1])
                path.append(enforce_circular_boundary_aydin(lat, lon))
            
            # Çevre yolu üzerinde ilerle
            current_idx = start_idx
            if abs(end_idx - start_idx) <= len(ring_road_points) / 2:
                direction = 1 if end_idx > start_idx else -1
            else:
                direction = -1 if end_idx > start_idx else 1
            
            while current_idx != end_idx:
                path.append(enforce_circular_boundary_aydin(*ring_road_points[current_idx]))
                current_idx = (current_idx + direction) % len(ring_road_points)
            
            path.append(enforce_circular_boundary_aydin(*ring_road_points[end_idx]))
            start_road_point = ring_road_points[end_idx]
    
    # Yoldan hedefe
    steps_to_end = max(3, int(math.sqrt((start_road_point[0] - end_lat)**2 + 
                                       (start_road_point[1] - end_lon)**2) * 20000))
    steps_to_end = min(steps_to_end, 15)
    
    for i in range(steps_to_end):
        t = i / (steps_to_end - 1)
        lat = start_road_point[0] + t * (end_lat - start_road_point[0])
        lon = start_road_point[1] + t * (end_lon - start_road_point[1])
        # Biraz rastgele gürültü ekle
        noise_lat = random.uniform(-0.0001, 0.0001) * math.sin(t * math.pi)
        noise_lon = random.uniform(-0.0001, 0.0001) * math.sin(t * math.pi * 0.7)
        path.append(enforce_circular_boundary_aydin(lat + noise_lat, lon + noise_lon))
    
    # Boş path durumu için kontrol
    if not path:
        path = [(start_lat, start_lon), (end_lat, end_lon)]
    
    return path

# --- İKA Durumlarını Başlatma ---
print("Sensör birimleri dairesel rotalarla başlatılıyor...")
ika_states = []
for i in range(NUM_IKAS):
    start_lat, start_lon = random_circular_point_aydin()
    
    # Hedef belirle
    if random.random() < 0.8:  # %80 olasılıkla önemli bir konumu hedefle
        target_location_name = random.choice(location_names)
        target_lat, target_lon = aydin_key_locations[target_location_name]
    else:  # %20 rastgele hedef
        target_lat, target_lon = random_circular_point_aydin()
        # En yakın önemli konumu bul
        min_dist = float('inf')
        target_location_name = "Rastgele_Nokta"
        for name, (loc_lat, loc_lon) in aydin_key_locations.items():
            dist = math.sqrt((target_lat - loc_lat)**2 + (target_lon - loc_lon)**2)
            if dist < min_dist:
                min_dist = dist
                target_location_name = name + "_Yakini"
    
    # Rota oluştur
    path = get_circular_path_aydin(start_lat, start_lon, target_lat, target_lon)
    
    ika_states.append({
        "id": f"IKA_{str(i+1).zfill(3)}",
        "lat": start_lat,
        "lon": start_lon,
        "alt": random.uniform(40, 120),  # Aydın'ın rakımı daha düşük
        "current_target_name": target_location_name,
        "target_lat": target_lat,
        "target_lon": target_lon,
        "path": path,
        "path_index": 0,
        "total_path_points": len(path) if path else 0,
        "path_complete": False if path and len(path) > 1 else True,
    })

# --- CSV Dosyası Kurulumu ---
headers = [
    "ZamanDamgasi", "Ika_ID", "Enlem", "Boylam", "Yukseklik_m", "Hedef_Konum",
    "PM2.5_ug_m3", "PM10_ug_m3", "CO_ppm", "NO2_ppb", "SO2_ppb", "O3_ppb", "VOC_ppb",
    "Sicaklik_C", "Bagil_Nem_Yuzde", "Ses_Seviyesi_dB", "Isik_Seviyesi_lux",
    "Titresim_g", "ManyetikAlan_X_uT", "ManyetikAlan_Y_uT", "ManyetikAlan_Z_uT",
    "Radyasyon_uSv_h"
]

# --- Veri Üretme ---
print(f"Dairesel sınırlar (Yarıçap: {AYDIN_RADIUS}) zorlanarak veri üretimi başlıyor...")
start_time = datetime.datetime(2023, 10, 28, 0, 0, 0)
daily_temp_variation = random.uniform(-2, 5)  # Aydın'da sıcaklık değişimleri

with open(OUTPUT_CSV_FILE, 'w', newline='', encoding='utf-8') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(headers)
    
    for hour_delta in range(DURATION_HOURS):
        current_hour_of_day = (start_time.hour + hour_delta) % 24
        
        if current_hour_of_day == 0:
            daily_temp_variation = random.uniform(-2, 5)  # Günlük sıcaklık varyasyonu
        
        for minute_delta in range(RECORDS_PER_HOUR):
            current_timestamp = start_time + datetime.timedelta(hours=hour_delta, minutes=minute_delta)
            timestamp_str = current_timestamp.strftime("%Y-%m-%dT%H:%M:%SZ")
            
            for ika in ika_states:
                # Güzergah takibi
                if not ika["path_complete"] and ika["path"] and ika["total_path_points"] > 0:
                    if ika["path_index"] < ika["total_path_points"]:
                        current_path_point = ika["path"][ika["path_index"]]
                        ika["lat"] = current_path_point[0]
                        ika["lon"] = current_path_point[1]
                        ika["path_index"] += 1
                    else:
                        ika["path_complete"] = True
                
                # Hedefe ulaşıldıysa yeni hedef belirle
                if ika["path_complete"]:
                    if random.random() < 0.8:
                        old_target = ika["current_target_name"]
                        possible_new_targets = [name for name in location_names if name != old_target]
                        if possible_new_targets:
                            new_target_name = random.choice(possible_new_targets)
                        else:
                            new_target_name = random.choice(location_names)
                        new_target_lat, new_target_lon = aydin_key_locations[new_target_name]
                    else:
                        new_target_lat, new_target_lon = random_circular_point_aydin()
                        # En yakın önemli konumu bul
                        min_dist = float('inf')
                        new_target_name = "Rastgele_Nokta"
                        for name, (loc_lat, loc_lon) in aydin_key_locations.items():
                            dist = math.sqrt((new_target_lat - loc_lat)**2 + (new_target_lon - loc_lon)**2)
                            if dist < min_dist:
                                min_dist = dist
                                new_target_name = name + "_Yakini"
                    
                    ika["current_target_name"] = new_target_name
                    ika["target_lat"] = new_target_lat
                    ika["target_lon"] = new_target_lon
                    
                    ika["path"] = get_circular_path_aydin(ika["lat"], ika["lon"], new_target_lat, new_target_lon)
                    ika["path_index"] = 0
                    ika["total_path_points"] = len(ika["path"]) if ika["path"] else 0
                    ika["path_complete"] = False if ika["path"] and len(ika["path"]) > 1 else True
                
                # Sınırları zorla
                ika["lat"], ika["lon"] = enforce_circular_boundary_aydin(ika["lat"], ika["lon"])
                
                # Yükseklik değişimi
                ika['alt'] += random.uniform(-0.5, 0.5)
                ika['alt'] = max(40, min(ika['alt'], 120))
                
                # Sensör değerlerini oluştur
                temp_val = get_temperature_aydin(current_hour_of_day, daily_temp_variation)
                humidity_val = get_humidity_aydin(temp_val)
                pm25_val = get_pm25_aydin(current_hour_of_day, ika["current_target_name"])
                pm10_val = get_pm10_aydin(current_hour_of_day, ika["current_target_name"])
                co_val = get_co_aydin(current_hour_of_day, ika["current_target_name"])
                no2_val = get_no2_aydin(current_hour_of_day, ika["current_target_name"])
                so2_val = get_so2_aydin(ika["current_target_name"])
                o3_val = get_o3_aydin(current_hour_of_day)
                voc_val = get_voc_aydin(ika["current_target_name"])
                sound_val = get_sound_level_aydin(current_hour_of_day, ika["current_target_name"])
                light_val = get_light_level_aydin(current_hour_of_day)
                vibration_val = get_vibration_aydin(ika["current_target_name"])
                mag_x_val = get_magnetic_field_aydin()
                mag_y_val = get_magnetic_field_aydin()
                mag_z_val = get_magnetic_field_aydin()
                radiation_val = get_radiation_aydin()
                
                # CSV satırını yaz
                row = [
                    timestamp_str, ika['id'], round(ika['lat'], 6), round(ika['lon'], 6), round(ika['alt'], 1),
                    ika["current_target_name"], pm25_val, pm10_val, co_val, no2_val, so2_val, o3_val, voc_val,
                    temp_val, humidity_val, sound_val, light_val, vibration_val, mag_x_val, mag_y_val, mag_z_val, radiation_val
                ]
                writer.writerow(row)
            
            if (minute_delta + 1) % 10 == 0:
                print(f"İşlenen zaman: {current_timestamp}, Saat {hour_delta+1}/{DURATION_HOURS}, Dakika {minute_delta+1}/{RECORDS_PER_HOUR}")

print(f"Veri seti başarıyla oluşturuldu ve '{OUTPUT_CSV_FILE}' dosyasına kaydedildi.")
print(f"Toplam satır sayısı (başlık hariç): {NUM_IKAS * DURATION_HOURS * RECORDS_PER_HOUR}")
num_potential_anomaly_sources = 15
print(f"Beklenen yaklaşık anomali sayısı: ~{NUM_IKAS * DURATION_HOURS * RECORDS_PER_HOUR * num_potential_anomaly_sources * ANOMALY_CHANCE:.0f}")
print("Not: Tüm sensör ölçümleri 0.1 derece (yaklaşık 11 km) yarıçaplı dairesel bir alanda oluşturulmuştur.")
