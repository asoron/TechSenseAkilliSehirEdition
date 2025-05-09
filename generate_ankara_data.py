import csv
import datetime
import random
import math
import numpy as np

# --- Yapılandırma Ayarları ---
NUM_IKAS = 50  # Mobil sensör birimi sayısı
DURATION_HOURS = 24  # Veri üretilecek süre (saat)
RECORDS_PER_HOUR = 60  # Saat başına kayıt sayısı (dakikada bir kayıt)
OUTPUT_CSV_FILE = "ankara_sensor_data_circular_v4_radius_0_05.csv" # Çıktı CSV dosyasının adı

# --- Dairesel Ankara Sınırları ---
# Ankara merkez noktası (Kızılay)
ANKARA_CENTER_LAT, ANKARA_CENTER_LON = 39.9208, 32.8541
# Dairesel alan için maksimum yarıçap (derece cinsinden)
# KULLANICININ İSTEĞİ ÜZERİNE DAİRENİN ÇAPI DAHA DA KÜÇÜLTÜLDÜ.
# Önceki değer: 0.10 (yaklaşık 11km yarıçap)
# Yeni değer: 0.05 (yaklaşık 5.5km yarıçap, yani ~11km çap)
ANKARA_RADIUS = 0.10

# --- Anomali Oluşturma Ayarları ---
ANOMALY_CHANCE = 0.0005 # Her bir ölçüm için anomali oluşma olasılığı (%0.05)
ANOMALY_MULTIPLIER_RANGE = (2.0, 5.0)  # Anomalilerin ne kadar aşırı olabileceği

# --- Ankara'daki Önemli Konumları Tanımlama ---
def is_in_circular_ankara(lat, lon):
    """Bir noktanın dairesel Ankara alanı içinde olup olmadığını kontrol eder"""
    dlat = lat - ANKARA_CENTER_LAT
    dlon = lon - ANKARA_CENTER_LON
    dlon_adjusted = dlon * math.cos(math.radians(ANKARA_CENTER_LAT))
    distance = math.sqrt(dlat**2 + dlon_adjusted**2)
    return distance <= ANKARA_RADIUS

original_key_locations = {
    "Kizilay_Merkez": (39.9208, 32.8541),
    "Ulus_Merkez": (39.9398, 32.8547), # Muhtemelen dışarıda kalır
    "Tunali_Hilmi": (39.9109, 32.8645), # Sınırda veya dışarıda
    "Bahcelievler": (39.9246, 32.8174), # Dışarıda kalır
    "Cankaya_Merkez": (39.8963, 32.8639), # Dışarıda kalır
    "Bilkent": (39.8711, 32.7489), # Kesinlikle dışarıda kalır
    "ODTU": (39.8919, 32.7817),    # Kesinlikle dışarıda kalır
    "Eryaman": (39.9750, 32.6453), # Kesinlikle dışarıda kalır
    "Sincan_Merkez": (39.9748, 32.5802),# Kesinlikle dışarıda kalır
    "Etimesgut_Merkez": (39.9580, 32.6812), # Kesinlikle dışarıda kalır
    "Batikent": (39.9719, 32.7295), # Kesinlikle dışarıda kalır
    "Kecioren_Merkez": (39.9806, 32.8683), # Kesinlikle dışarıda kalır
    "Pursaklar": (40.0587, 32.8890), # Kesinlikle dışarıda kalır
    "Mamak_Merkez": (39.9119, 32.9114), # Kesinlikle dışarıda kalır
    "Altindag_Merkez": (39.9502, 32.8763), # Kesinlikle dışarıda kalır
    "Yenimahalle_Merkez": (39.9650, 32.8150), # Kesinlikle dışarıda kalır
    "Gazi_Universitesi": (39.9415, 32.8173), # Dışarıda kalır
    "Ankara_Universitesi": (39.9425, 32.8240), # Dışarıda kalır
    "Hacettepe_Universitesi": (39.9347, 32.8633), # Dışarıda kalır
    "ATO_Congresium": (39.9035, 32.8223), # Dışarıda kalır
    "Ankara_Garı": (39.9389, 32.8625), # Dışarıda kalır
    "Ankapark": (39.9881, 32.8024), # Kesinlikle dışarıda kalır
    "Anitkabir": (39.9253, 32.8364), # İçeride kalabilir
    "Atakule": (39.8825, 32.8581), # Dışarıda kalır
    "Armada_AVM": (39.9153, 32.8135), # Dışarıda kalır
    "ANKAMALL_AVM": (39.9527, 32.8231), # Kesinlikle dışarıda kalır
    "Maltepe": (39.9267, 32.8456), # İçeride kalabilir
    "Kolej": (39.9219, 32.8647), # Sınırda veya dışarıda
    "Dikmen": (39.8912, 32.8394), # Dışarıda kalır
    "Incek": (39.8101, 32.7762), # Kesinlikle dışarıda kalır
    "Eskisehir_Yolu": (39.9030, 32.7620), # Kesinlikle dışarıda kalır
    "Istanbul_Yolu": (39.9850, 32.7200), # Kesinlikle dışarıda kalır
    "Konya_Yolu": (39.8700, 32.8250),   # Kesinlikle dışarıda kalır
    "Samsun_Yolu": (39.9300, 32.9150),  # Kesinlikle dışarıda kalır
    "Airport": (40.1231, 32.9975) # Kesinlikle dışarıda kalır
}

ankara_key_locations = {}
print(f"--- Dairesel Alan Yarıçapı: {ANKARA_RADIUS} derece (yaklaşık {ANKARA_RADIUS * 111:.1f} km) ---")
locations_within_radius = 0
for name, (lat, lon) in original_key_locations.items():
    if is_in_circular_ankara(lat, lon):
        ankara_key_locations[name] = (lat, lon)
        locations_within_radius += 1
    else:
        dlat = lat - ANKARA_CENTER_LAT
        dlon = lon - ANKARA_CENTER_LON
        dlon_adjusted = dlon * math.cos(math.radians(ANKARA_CENTER_LAT))
        
        # distance = math.sqrt(dlat**2 + dlon_adjusted**2) # Bu satır artık kullanılmıyor, açı hesaplaması için gerekli değil
        angle = math.atan2(dlat, dlon_adjusted)
        
        new_distance_factor = 0.95 
        new_lat = ANKARA_CENTER_LAT + (ANKARA_RADIUS * new_distance_factor) * math.sin(angle)
        new_lon = ANKARA_CENTER_LON + ((ANKARA_RADIUS * new_distance_factor) * math.cos(angle)) / math.cos(math.radians(ANKARA_CENTER_LAT))
        
        # print(f"UYARI: '{name}' konumu ({lat:.4f}, {lon:.4f}) dairesel alanın dışındaydı. Yeni koordinatlara ayarlandı: ({new_lat:.4f}, {new_lon:.4f}).")
        ankara_key_locations[name] = (new_lat, new_lon)
print(f"Orijinal {len(original_key_locations)} konumdan {locations_within_radius} tanesi doğrudan {ANKARA_RADIUS} derecelik yarıçap içinde kaldı.")
print(f"Diğer konumlar dairenin kenarına ayarlandı.")

location_names = list(ankara_key_locations.keys())
if not location_names: # Bu durumun olmaması gerekir çünkü Kızılay merkezde
    print("KRİTİK UYARI: Tanımlanan yarıçapta hiçbir önemli konum bulunamadı. Bu beklenmedik bir durum.")
    ankara_key_locations["Merkez_Fallback"] = (ANKARA_CENTER_LAT, ANKARA_CENTER_LON)
    location_names = list(ankara_key_locations.keys())

print(f"Kullanılacak toplam önemli konum sayısı (ayarlanmış): {len(location_names)}")

def random_circular_point():
    """Ankara'nın dairesel alanı içinde rastgele bir nokta üretir"""
    angle = random.uniform(0, 2 * math.pi)
    radius_factor = math.sqrt(random.random()) 
    effective_radius = ANKARA_RADIUS * radius_factor
    
    lat = ANKARA_CENTER_LAT + effective_radius * math.sin(angle)
    lon = ANKARA_CENTER_LON + (effective_radius * math.cos(angle)) / math.cos(math.radians(ANKARA_CENTER_LAT))
    
    return lat, lon

def enforce_circular_boundary(lat, lon):
    """Koordinatların dairesel sınır içinde olmasını sağlar"""
    if is_in_circular_ankara(lat, lon):
        return lat, lon
    
    dlat = lat - ANKARA_CENTER_LAT
    dlon = lon - ANKARA_CENTER_LON
    dlon_adjusted = dlon * math.cos(math.radians(ANKARA_CENTER_LAT))
    angle = math.atan2(dlat, dlon_adjusted) 
    
    new_distance_on_edge = ANKARA_RADIUS * 0.95 
    
    new_lat = ANKARA_CENTER_LAT + new_distance_on_edge * math.sin(angle)
    new_lon = ANKARA_CENTER_LON + (new_distance_on_edge * math.cos(angle)) / math.cos(math.radians(ANKARA_CENTER_LAT))
    return new_lat, new_lon

# --- Yol Ağı Simülasyonu (Dairesel Şehir için) ---
main_roads = {}
ring_road_points_count = 24 # Daha küçük alanda daha az nokta yeterli olabilir
# Yarıçap faktörleri ANKARA_RADIUS'a göre ölçeklenir.
# Örn: ANKARA_RADIUS = 0.05 ise, Ic_Cevre_Yolu 0.05 * 0.3 = 0.015 derece yarıçapında olur (çok küçük).
print("Yol ağı oluşturuluyor...")
for radius_factor, name in [(0.4, "Ic_Cevre_Yolu"), (0.7, "Orta_Cevre_Yolu"), (0.95, "Dis_Cevre_Yolu")]: # Faktörler ayarlandı
    road_points = []
    current_ring_radius = ANKARA_RADIUS * radius_factor
    if current_ring_radius < 0.001: # Çok küçükse atla
        print(f"'{name}' için yarıçap ({current_ring_radius:.4f}) çok küçük, atlanıyor.")
        continue
    for i in range(ring_road_points_count):
        angle = 2 * math.pi * i / ring_road_points_count
        lat = ANKARA_CENTER_LAT + current_ring_radius * math.sin(angle)
        lon = ANKARA_CENTER_LON + (current_ring_radius * math.cos(angle)) / math.cos(math.radians(ANKARA_CENTER_LAT))
        road_points.append((lat, lon))
    main_roads[name] = road_points
    print(f"'{name}' {len(road_points)} nokta ile oluşturuldu (yarıçap: {current_ring_radius:.4f} derece).")


num_radial_roads = 6 # Daha küçük alanda daha az radyal yol
for i in range(num_radial_roads):
    angle = 2 * math.pi * i / num_radial_roads
    road_points = []
    for radius_factor_radial in np.linspace(0.1, 0.95, 10): # Daha az nokta, merkezden biraz daha uzakta başla
        current_radial_pos_radius = ANKARA_RADIUS * radius_factor_radial
        if current_radial_pos_radius < 0.001: continue # Çok kısa ise atla
        lat = ANKARA_CENTER_LAT + current_radial_pos_radius * math.sin(angle)
        lon = ANKARA_CENTER_LON + (current_radial_pos_radius * math.cos(angle)) / math.cos(math.radians(ANKARA_CENTER_LAT))
        road_points.append((lat, lon))
    if road_points:
      main_roads[f"Radyal_Yol_{i+1}"] = road_points
      print(f"'Radyal_Yol_{i+1}' {len(road_points)} nokta ile oluşturuldu.")

if not main_roads:
    print("UYARI: Hiçbir ana yol oluşturulamadı. Yarıçap çok küçük olabilir. Rotalar daha direkt olacaktır.")

# --- Sensör Veri Üretme Fonksiyonları (Değişiklik yok) ---
def maybe_add_anomaly(value, sensor_type):
    if random.random() < ANOMALY_CHANCE: 
        if random.random() < 0.7:
            multiplier = random.uniform(*ANOMALY_MULTIPLIER_RANGE)
            return value * multiplier
        else: 
            multiplier = random.uniform(*ANOMALY_MULTIPLIER_RANGE)
            return value / multiplier
    return value

def get_pm25(hour, location_name_hint):
    is_center = "Merkez" in location_name_hint or "Kizilay" in location_name_hint # Ulus artık çok dışarıda kalabilir
    is_rush_hour = (7 <= hour <= 9) or (17 <= hour <= 19)
    base = random.uniform(5, 25) # Daha küçük alanda genel kirlilik biraz daha düşük olabilir
    if is_center: base *= random.uniform(1.1, 1.3)
    if is_rush_hour: base *= random.uniform(1.3, 2.0)
    return maybe_add_anomaly(round(min(base, 120), 2), "PM2.5") # Max değer düşürüldü

def get_pm10(hour, location_name_hint):
    is_center = "Merkez" in location_name_hint or "Kizilay" in location_name_hint
    is_rush_hour = (7 <= hour <= 9) or (17 <= hour <= 19)
    base = random.uniform(10, 35) # Daha küçük alanda genel kirlilik biraz daha düşük olabilir
    if is_center: base *= random.uniform(1.1, 1.3)
    if is_rush_hour: base *= random.uniform(1.3, 2.0)
    return maybe_add_anomaly(round(min(base, 150), 2), "PM10") # Max değer düşürüldü

def get_co(hour, location_name_hint):
    is_road = "Yolu" in location_name_hint # "Cevre_Yolu" ve "Radyal" çok kısa olabilir
    is_rush_hour = (7 <= hour <= 9) or (17 <= hour <= 19)
    base = random.uniform(0.1, 1.5)
    if is_road and main_roads : base *= random.uniform(1.2, 1.6) # Ana yollar varsa
    if is_rush_hour: base *= random.uniform(1.5, 2.5)
    return maybe_add_anomaly(round(min(base, 7), 2), "CO") # Max değer düşürüldü

def get_no2(hour, location_name_hint):
    is_road = "Yolu" in location_name_hint
    is_rush_hour = (7 <= hour <= 9) or (17 <= hour <= 19)
    base = random.uniform(5, 20)
    if is_road and main_roads: base *= random.uniform(1.2, 1.5)
    if is_rush_hour: base *= random.uniform(1.4, 2.2)
    return maybe_add_anomaly(round(min(base, 70), 1), "NO2") # Max değer düşürüldü

def get_so2(location_name_hint):
    # Sincan gibi endüstriyel alanlar bu küçük yarıçapın çok dışında kalacaktır.
    # Bu nedenle SO2 değerleri genellikle düşük olacaktır.
    base = random.uniform(1, 15) 
    return maybe_add_anomaly(round(min(base, 40), 1), "SO2")

def get_o3(hour):
    if 10 <= hour <= 16: base = round(random.uniform(30, 100), 1)
    else: base = round(random.uniform(10, 30), 1)
    return maybe_add_anomaly(base, "O3")

def get_voc(location_name_hint):
    is_traffic = "Yolu" in location_name_hint or "Merkez" in location_name_hint
    base = random.uniform(40, 300)
    if is_traffic: base *= random.uniform(1.1, 1.4)
    return maybe_add_anomaly(round(min(base, 600), 0), "VOC")

def get_temperature(hour, day_variation):
    min_temp, max_temp = 8 + day_variation, 20 + day_variation 
    amplitude = (max_temp - min_temp) / 2
    avg_temp = min_temp + amplitude
    temp = avg_temp + amplitude * math.sin((hour - 9) * (2 * math.pi / 24)) 
    return maybe_add_anomaly(round(temp + random.uniform(-1, 1), 1), "Sıcaklık")

def get_humidity(temperature):
    base_humidity = 70 - (temperature * 1.5) 
    return maybe_add_anomaly(round(max(20, min(85, base_humidity + random.uniform(-10, 10))), 1), "Nem")

def get_sound_level(hour, location_name_hint):
    is_center = "Merkez" in location_name_hint or "Kizilay" in location_name_hint
    is_night = (23 <= hour <= 24) or (0 <= hour <= 6)
    is_day = (7 <= hour <= 19)
    if is_night: base = random.uniform(25, 40) # Daha sessiz
    elif is_day: base = random.uniform(50, 70)
    else: base = random.uniform(40, 55)
    if is_center: base += random.uniform(3, 10)
    return maybe_add_anomaly(round(min(base, 90), 1), "Ses")

def get_light_level(hour):
    if 7 <= hour <= 18: base = round(random.uniform(5000, 85000) * (math.sin((hour-6) * math.pi / 13)**2) + random.uniform(0, 1000))
    else: base = round(random.uniform(1, 80) + random.choice([0,0,0,0, 150, 300])) 
    return maybe_add_anomaly(base, "Işık")

def get_vibration(location_name_hint):
    is_construction = random.random() < 0.02 # Daha küçük alanda daha az inşaat
    is_traffic_heavy = "Merkez" in location_name_hint
    if is_construction: base = round(random.uniform(0.3, 1.5), 2)
    elif is_traffic_heavy: base = round(random.uniform(0.05, 0.3), 2)
    else: base = round(random.uniform(0.01, 0.15), 2)
    return maybe_add_anomaly(base, "Titreşim")

def get_magnetic_field():
    return maybe_add_anomaly(round(random.uniform(-60, 60), 2), "ManyetikAlan")

def get_radiation():
    if random.random() < 0.0001: 
        base = round(random.uniform(0.31, 0.45), 3)
    else:
        base = round(random.uniform(0.05, 0.30), 3)
    return maybe_add_anomaly(base, "Radyasyon")

# --- Dairesel Şehir İçin Rota Oluşturma ---
def find_nearest_road_point(lat, lon):
    min_dist = float('inf')
    nearest_point = None
    
    if not main_roads: # Eğer hiç yol tanımlanmamışsa
        return (enforce_circular_boundary(lat,lon)) # En yakın sınır noktası veya merkez

    # Önce en yakın radyal yolu dene, sonra çevre yollarını
    # Bu, çok küçük yarıçapta daha mantıklı olabilir.
    candidate_roads = [name for name in main_roads if "Radyal" in name] + \
                      [name for name in main_roads if "Cevre" in name]
    
    if not candidate_roads: # Eğer hiç yol yoksa (main_roads boşsa)
         return (enforce_circular_boundary(lat,lon))

    for road_name in candidate_roads:
        if road_name not in main_roads: continue # Yol listede yoksa atla (örn. çok küçük yarıçapta oluşmadıysa)
        road_points_list = main_roads[road_name]
        for point in road_points_list:
            dist = math.sqrt((lat - point[0])**2 + (lon - point[1])**2)
            if dist < min_dist:
                min_dist = dist
                nearest_point = point
    
    if nearest_point is None: 
        # Fallback: Eğer hiçbir yol noktası bulunamazsa (çok olası değil ama önlem)
        # Rastgele bir yolun rastgele bir noktasını al
        if main_roads:
            fallback_road_name = random.choice(list(main_roads.keys()))
            if main_roads[fallback_road_name]:
                 nearest_point = random.choice(main_roads[fallback_road_name])
            else: # Seçilen yol da boşsa
                 nearest_point = (ANKARA_CENTER_LAT, ANKARA_CENTER_LON) # Merkeze fallback
        else: # Hiç yol yoksa
            nearest_point = (ANKARA_CENTER_LAT, ANKARA_CENTER_LON) # Merkeze fallback
        
    return nearest_point


def get_circular_path(start_lat, start_lon, end_lat, end_lon):
    path = []
    
    start_lat, start_lon = enforce_circular_boundary(start_lat, start_lon)
    end_lat, end_lon = enforce_circular_boundary(end_lat, end_lon)

    # Eğer ana yollar yoksa veya çok azsa, daha direkt bir rota izle
    if not main_roads or len(main_roads) < 2 :
        # print("DEBUG: Ana yol az/yok, direkt rota kullanılıyor.")
        dist_direct = math.sqrt((start_lat - end_lat)**2 + (start_lon - end_lon)**2)
        # Adım sayısı, mesafeye ve ANKARA_RADIUS'a göre ayarlanır.
        # 0.001 derece yaklaşık 100m. Her 20-30m'de bir nokta gibi.
        num_steps = max(3, int(dist_direct * 30000 * (1 / (ANKARA_RADIUS / 0.05)))) # 0.05 radius için 30000
        num_steps = min(num_steps, 100) # Maksimum adım sınırı
        
        if num_steps <= 1: # Başlangıç ve bitiş çok yakınsa
             return [(start_lat, start_lon), (end_lat, end_lon)]

        for i in range(num_steps):
            t = i / (num_steps - 1)
            lat = start_lat + t * (end_lat - start_lat)
            lon = start_lon + t * (end_lon - start_lon)
            path.append(enforce_circular_boundary(lat, lon))
        return path if path else [(start_lat, start_lon), (end_lat, end_lon)]

    start_road_point = find_nearest_road_point(start_lat, start_lon)
    end_road_point = find_nearest_road_point(end_lat, end_lon)
    
    # Adım sayısı çarpanı: ANKARA_RADIUS küçüldükçe artar, böylece daha fazla adım atılır
    # (çünkü aynı derece farkı göreceli olarak daha büyük bir mesafedir)
    # Temel yarıçap 0.05 için adım çarpanı ~20000-30000 civarı
    step_multiplier_base = 25000 
    adaptive_step_multiplier = step_multiplier_base * (0.05 / ANKARA_RADIUS)


    dist_to_start_road = math.sqrt((start_lat - start_road_point[0])**2 + (start_lon - start_road_point[1])**2)
    steps_to_start_road = max(2, int(dist_to_start_road * adaptive_step_multiplier )) 
    steps_to_start_road = min(steps_to_start_road, 30) 

    for i in range(steps_to_start_road):
        t = i / (steps_to_start_road -1) if steps_to_start_road > 1 else 1.0
        lat = start_lat + t * (start_road_point[0] - start_lat)
        lon = start_lon + t * (start_road_point[1] - start_lon)
        path.append(enforce_circular_boundary(lat, lon)) 
        
    # Çevre yolu kullanma olasılığı (eğer uygun çevre yolları varsa)
    # Çok küçük yarıçapta çevre yolları anlamsız olabilir, bu yüzden kontrol ekleyelim.
    # Uygun çevre yolları: ANKARA_RADIUS * factor > (örn) 0.01 derece
    suitable_ring_roads = [name for name, points in main_roads.items() if "Cevre_Yolu" in name and points and ANKARA_RADIUS * (0.4 if "Ic" in name else 0.7 if "Orta" in name else 0.95) > 0.005]

    if suitable_ring_roads and random.random() < 0.6: # Çevre yolu kullanma olasılığı azaltıldı
        chosen_ring_road_name = random.choice(suitable_ring_roads)
        ring_road_actual_points = main_roads[chosen_ring_road_name]
            
        start_idx_on_ring = min(range(len(ring_road_actual_points)), 
                           key=lambda i: math.sqrt((start_road_point[0] - ring_road_actual_points[i][0])**2 + 
                                                 (start_road_point[1] - ring_road_actual_points[i][1])**2))
        end_idx_on_ring = min(range(len(ring_road_actual_points)), 
                         key=lambda i: math.sqrt((end_road_point[0] - ring_road_actual_points[i][0])**2 + 
                                               (end_road_point[1] - ring_road_actual_points[i][1])**2))
        
        ring_entry_target_point = ring_road_actual_points[start_idx_on_ring]
        dist_to_ring_entry = math.sqrt((start_road_point[0] - ring_entry_target_point[0])**2 + (start_road_point[1] - ring_entry_target_point[1])**2)
        steps_to_ring_entry = max(2, int(dist_to_ring_entry * adaptive_step_multiplier ))
        steps_to_ring_entry = min(steps_to_ring_entry, 30)

        for i in range(steps_to_ring_entry):
            t = i / (steps_to_ring_entry - 1) if steps_to_ring_entry > 1 else 1.0
            lat = start_road_point[0] + t * (ring_entry_target_point[0] - start_road_point[0])
            lon = start_road_point[1] + t * (ring_entry_target_point[1] - start_road_point[1])
            path.append(enforce_circular_boundary(lat,lon))

        path_on_ring = []
        temp_idx = start_idx_on_ring
        # Daha kısa yolu seç (saat yönü vs tersi)
        if abs(end_idx_on_ring - start_idx_on_ring) <= len(ring_road_actual_points) / 2:
            direction = 1 if end_idx_on_ring > start_idx_on_ring else -1
        else:
            direction = -1 if end_idx_on_ring > start_idx_on_ring else 1
        
        while temp_idx != end_idx_on_ring:
            path_on_ring.append(enforce_circular_boundary(*ring_road_actual_points[temp_idx]))
            temp_idx = (temp_idx + direction + len(ring_road_actual_points)) % len(ring_road_actual_points)
        path_on_ring.append(enforce_circular_boundary(*ring_road_actual_points[end_idx_on_ring]))
        path.extend(path_on_ring)
        
        ring_exit_source_point = ring_road_actual_points[end_idx_on_ring]
        # Bir sonraki bağlantı noktası artık end_road_point olmalı
        start_road_point = ring_exit_source_point # Bir sonraki "direkt yol" segmenti için başlangıcı güncelle


    # Direkt yol (veya çevre yolundan sonraki bağlantı)
    dist_direct_segment = math.sqrt((start_road_point[0] - end_road_point[0])**2 + (start_road_point[1] - end_road_point[1])**2)
    steps_direct_segment = max(3, int(dist_direct_segment * adaptive_step_multiplier * 0.8 )) # Biraz daha az adım
    steps_direct_segment = min(steps_direct_segment, 40)

    if steps_direct_segment > 1 : # Sadece birden fazla adım gerekiyorsa
        for i in range(steps_direct_segment):
            t = i / (steps_direct_segment -1) 
            lat = start_road_point[0] + t * (end_road_point[0] - start_road_point[0])
            lon = start_road_point[1] + t * (end_road_point[1] - start_road_point[1])
            # Gürültü, ANKARA_RADIUS ile orantılı olmalı
            noise_factor = ANKARA_RADIUS / 0.1 
            noise_lat = random.uniform(-0.00005, 0.00005) * noise_factor * math.sin(t * math.pi) 
            noise_lon = random.uniform(-0.00005, 0.00005) * noise_factor * math.sin(t * math.pi * 0.7)
            path.append(enforce_circular_boundary(lat + noise_lat, lon + noise_lon))
            
    # Yol ağından hedefe bağlan
    dist_to_end_location = math.sqrt((end_road_point[0] - end_lat)**2 + (end_road_point[1] - end_lon)**2)
    steps_to_end_location = max(2, int(dist_to_end_location * adaptive_step_multiplier ))
    steps_to_end_location = min(steps_to_end_location, 30)

    for i in range(steps_to_end_location):
        t = i / (steps_to_end_location -1) if steps_to_end_location > 1 else 1.0
        lat = end_road_point[0] + t * (end_lat - end_road_point[0])
        lon = end_road_point[1] + t * (end_lon - end_road_point[1])
        path.append(enforce_circular_boundary(lat, lon))
        
    # Path'te çok az nokta varsa veya hiç yoksa
    if not path or len(path) < 2:
        # print(f"DEBUG: Path çok kısa ({len(path)}), direkt rota ekleniyor.")
        path = [(start_lat, start_lon)] # Başlangıç noktasını ekle
        dist_final = math.sqrt((start_lat - end_lat)**2 + (start_lon - end_lon)**2)
        num_steps_final = max(2, int(dist_final * adaptive_step_multiplier))
        num_steps_final = min(num_steps_final, 20)
        if num_steps_final <=1:
            path.append((end_lat, end_lon))
        else:
            for i in range(1, num_steps_final + 1): # Hedefi de dahil et
                t = i / num_steps_final
                inter_lat = start_lat + t * (end_lat - start_lat)
                inter_lon = start_lon + t * (end_lon - start_lon)
                path.append(enforce_circular_boundary(inter_lat, inter_lon))

    # Path'in başında ve sonunda aynı noktalar varsa temizle
    if len(path) > 1:
        new_path = [path[0]]
        for point_idx in range(1, len(path)):
            # Çok yakın noktaları atla
            if math.sqrt((path[point_idx][0] - new_path[-1][0])**2 + (path[point_idx][1] - new_path[-1][1])**2) > 0.00001: # ~1m
                new_path.append(path[point_idx])
        path = new_path
        
    return path if path else [(start_lat, start_lon), (end_lat, end_lon)]

# --- İHA Durumlarını Başlatma ---
print("Sensör birimleri dairesel rotalarla başlatılıyor...")
ika_states = []
for i in range(NUM_IKAS):
    start_lat, start_lon = random_circular_point() 
    
    target_lat, target_lon = random_circular_point() 
    target_location_name_for_ika = "Rastgele_Hedef" 

    if location_names and random.random() < 0.8: # Önemli konum hedefleme olasılığı arttırıldı
        target_location_name_for_ika = random.choice(location_names)
        # Hedefin koordinatlarını alırken, listede olup olmadığını kontrol et
        if target_location_name_for_ika in ankara_key_locations:
             target_lat, target_lon = ankara_key_locations[target_location_name_for_ika]
        else: # Eğer bir şekilde listede yoksa (olmamalı ama önlem)
             target_lat, target_lon = random_circular_point() # Rastgele bir nokta ata
             target_location_name_for_ika = "Rastgele_Hedef_HataDurumu"

    else: 
        min_dist_target = float('inf')
        closest_loc_name_for_random_target = "Rastgele_Hedef"
        if location_names: # Sadece location_names doluysa bu bloğa gir
            for name, (loc_lat, loc_lon) in ankara_key_locations.items():
                dist = math.sqrt((target_lat - loc_lat)**2 + (target_lon - loc_lon)**2)
                if dist < min_dist_target:
                    min_dist_target = dist
                    closest_loc_name_for_random_target = name
            target_location_name_for_ika = closest_loc_name_for_random_target

    path_for_ika = get_circular_path(start_lat, start_lon, target_lat, target_lon)
    
    ika_states.append({
        "id": f"IKA_{str(i+1).zfill(3)}",
        "lat": start_lat,
        "lon": start_lon,
        "alt": random.uniform(950, 1100),
        "current_target_name": target_location_name_for_ika,
        "target_lat": target_lat,
        "target_lon": target_lon,
        "path": path_for_ika,
        "path_index": 0,
        "total_path_points": len(path_for_ika) if path_for_ika else 0,
        "path_complete": False if path_for_ika and len(path_for_ika) > 1 else True,
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
print(f"Dairesel sınırlar (Yarıçap: {ANKARA_RADIUS}) zorlanarak veri üretimi başlıyor...")
start_time = datetime.datetime(2023, 10, 28, 0, 0, 0) 
daily_temp_variation = random.uniform(-3, 3)

with open(OUTPUT_CSV_FILE, 'w', newline='', encoding='utf-8') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(headers)
    
    for hour_delta in range(DURATION_HOURS):
        current_hour_of_day = (start_time.hour + hour_delta) % 24
        
        if current_hour_of_day == 0: 
            daily_temp_variation = random.uniform(-3, 3)
        
        for minute_delta in range(RECORDS_PER_HOUR):
            current_timestamp = start_time + datetime.timedelta(hours=hour_delta, minutes=minute_delta)
            timestamp_str = current_timestamp.strftime("%Y-%m-%dT%H:%M:%SZ")
            
            for ika in ika_states:
                if not ika["path_complete"] and ika["path"] and ika["total_path_points"] > 0 :
                    if ika["path_index"] < ika["total_path_points"]:
                        current_path_point = ika["path"][ika["path_index"]]
                        ika["lat"] = current_path_point[0]
                        ika["lon"] = current_path_point[1]
                        ika["path_index"] += 1
                    else: 
                        ika["path_complete"] = True
                
                if ika["path_complete"]:
                    new_target_lat, new_target_lon = random_circular_point()
                    new_target_name_choice = "Rastgele_Hedef_Yeni"

                    if location_names and random.random() < 0.8:
                        old_target = ika["current_target_name"]
                        possible_new_targets = [name for name in location_names if name != old_target]
                        if possible_new_targets:
                             new_target_name_choice = random.choice(possible_new_targets)
                        elif location_names: 
                             new_target_name_choice = random.choice(location_names)
                        
                        if new_target_name_choice in ankara_key_locations:
                             new_target_lat, new_target_lon = ankara_key_locations[new_target_name_choice]
                    else: 
                        min_dist_new_random_target = float('inf')
                        if location_names:
                            for name, (loc_lat, loc_lon) in ankara_key_locations.items():
                                dist = math.sqrt((new_target_lat - loc_lat)**2 + (new_target_lon - loc_lon)**2)
                                if dist < min_dist_new_random_target:
                                    min_dist_new_random_target = dist
                                    new_target_name_choice = name
                    
                    ika["current_target_name"] = new_target_name_choice
                    ika["target_lat"] = new_target_lat
                    ika["target_lon"] = new_target_lon
                    
                    ika["lat"], ika["lon"] = enforce_circular_boundary(ika["lat"], ika["lon"])

                    ika["path"] = get_circular_path(ika["lat"], ika["lon"], new_target_lat, new_target_lon)
                    ika["path_index"] = 0
                    ika["total_path_points"] = len(ika["path"]) if ika["path"] else 0
                    ika["path_complete"] = False if ika["path"] and len(ika["path"]) > 1 else True
                
                ika["lat"], ika["lon"] = enforce_circular_boundary(ika["lat"], ika["lon"])
                
                ika['alt'] += random.uniform(-0.5, 0.5)
                ika['alt'] = max(950, min(ika['alt'], 1100))
                
                temp_val = get_temperature(current_hour_of_day, daily_temp_variation)
                humidity_val = get_humidity(temp_val)
                pm25_val = get_pm25(current_hour_of_day, ika["current_target_name"])
                pm10_val = get_pm10(current_hour_of_day, ika["current_target_name"])
                co_val = get_co(current_hour_of_day, ika["current_target_name"])
                no2_val = get_no2(current_hour_of_day, ika["current_target_name"])
                so2_val = get_so2(ika["current_target_name"])
                o3_val = get_o3(current_hour_of_day)
                voc_val = get_voc(ika["current_target_name"])
                sound_val = get_sound_level(current_hour_of_day, ika["current_target_name"])
                light_val = get_light_level(current_hour_of_day)
                vibration_val = get_vibration(ika["current_target_name"])
                mag_x_val = get_magnetic_field()
                mag_y_val = get_magnetic_field()
                mag_z_val = get_magnetic_field()
                radiation_val = get_radiation()
                
                row = [
                    timestamp_str, ika['id'], round(ika['lat'], 6), round(ika['lon'], 6), round(ika['alt'], 1),
                    ika["current_target_name"], pm25_val, pm10_val, co_val, no2_val, so2_val, o3_val, voc_val,
                    temp_val, humidity_val, sound_val, light_val, vibration_val, mag_x_val, mag_y_val, mag_z_val, radiation_val
                ]
                writer.writerow(row)
            
            if (minute_delta + 1) % 60 == 0: # Her saat başı çıktı ver
                print(f"İşlenen zaman: {current_timestamp}, Saat {hour_delta+1}/{DURATION_HOURS}, Dakika {minute_delta+1}/{RECORDS_PER_HOUR}")

print(f"Veri seti başarıyla oluşturuldu ve '{OUTPUT_CSV_FILE}' dosyasına kaydedildi.")
print(f"Toplam satır sayısı (başlık hariç): {NUM_IKAS * DURATION_HOURS * RECORDS_PER_HOUR}")
num_potential_anomaly_sources = 15 
print(f"Beklenen yaklaşık anomali sayısı: ~{NUM_IKAS * DURATION_HOURS * RECORDS_PER_HOUR * num_potential_anomaly_sources * ANOMALY_CHANCE:.0f}")
print("Not: Anormal değerler nadirdir ve tüm sensör okumalarına rastgele dağıtılmıştır.")
