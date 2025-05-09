import csv
import datetime
import random
import math

# --- Ayarlar ---
NUM_IKAS = 50 # İKA sayısı 100'e çıkarıldı
DURATION_HOURS = 24
RECORDS_PER_HOUR = 60 # Her dakika bir kayıt

# İstanbul için kilit noktalar ve genel sınırlar
# Haritadaki ve gerçek İstanbul'a daha uygun sınırlar
CITY_LAT_MIN, CITY_LAT_MAX = 40.80, 41.30 # Biraz daha genişletildi ve kuzeye kaydırıldı
CITY_LON_MIN, CITY_LON_MAX = 28.20, 29.65 # Biraz daha genişletildi

istanbul_key_locations = {
    "Taksim_Meydani": (41.0369, 28.9760), "Kadikoy_Rihtim": (40.9905, 29.0290),
    "Mecidiyekoy_Merkez": (41.0630, 28.9900), "Uskudar_Merkez": (41.0260, 29.0170),
    "Bakirkoy_Merkez": (40.9820, 28.8720), "Levent_Buyukdere_Cad": (41.0780, 29.0150),
    "Atasehir_Merkez": (40.9900, 29.1100), "Besiktas_Iskele": (41.0430, 29.0050),
    "Fatih_Sultanahmet": (41.0082, 28.9784), "Avcilar_E5": (41.0000, 28.7160),
    "Beylikduzu_E5": (41.0050, 28.6500), "Kartal_Sahil": (40.8900, 29.1800),
    "Pendik_Sahil": (40.8750, 29.2300), "Sariyer_Merkez": (41.1650, 29.0550),
    "Arnavutkoy_Havalimani_Bolgesi": (41.2500, 28.7500), # Yeni havalimanı civarı daha belirgin
    "Gaziosmanpasa_Merkez": (41.0650, 28.9100), "Bagcilar_Merkez": (41.0400, 28.8200),
    "Umraniye_Merkez": (41.0250, 29.1100), "Cekmekoy_Merkez": (41.0600, 29.1800),
    "Sancaktepe_Merkez": (41.0100, 29.2100), "Tuzla_Sahil": (40.8250, 29.3000),
    "Buyukcekmece_Sahil": (41.0180, 28.5700),
    "Catalca_Yakin": (41.17, 28.55), # Haritadaki sol üstteki yoğunluğa yakın
    "Beykoz_Kuzey_Yakin": (41.15, 29.15), # Haritadaki sağ üstteki yoğunluğa yakın
    "Sile_Yolu_Uzeri": (41.10, 29.45), # Haritadaki en sağdaki yoğunluğa yakın
    "Marmara_Denizi_GKB_Yakin_Sahil": (40.95, 28.70), # Haritadaki sol alttaki yoğunluğa yakın
    "Marmara_Denizi_Adalar_Yakin": (40.88, 29.05), # Haritadaki orta alttaki yoğunluğa yakın
    "Gebze_Darica_Siniri_Yakin": (40.80, 29.38) # Haritadaki sağ alttaki yoğunluğa yakın
}
location_names = list(istanbul_key_locations.keys())

OUTPUT_CSV_FILE = "istanbul_100ika_guzergahli_yasam_kalitesi.csv"

# --- Sensör Fonksiyonları (Bir önceki cevaptakiyle aynı, buraya kopyalamıyorum) ---
def get_pm25(hour):
    base = random.uniform(5, 40)
    if 7 <= hour <= 9 or 17 <= hour <= 19: base *= random.uniform(1.5, 3)
    return round(min(base, 150), 2)
def get_pm10(hour):
    base = random.uniform(10, 50)
    if 7 <= hour <= 9 or 17 <= hour <= 19: base *= random.uniform(1.5, 3)
    return round(min(base, 200), 2)
def get_co(hour):
    base = random.uniform(0.1, 2.0)
    if 7 <= hour <= 9 or 17 <= hour <= 19: base *= random.uniform(2, 5)
    return round(min(base, 10), 2)
def get_no2(hour):
    base = random.uniform(5, 30)
    if 7 <= hour <= 9 or 17 <= hour <= 19: base *= random.uniform(1.5, 3)
    return round(min(base, 100), 1)
def get_so2(): return round(random.uniform(1, 50), 1)
def get_o3(hour):
    if 10 <= hour <= 16: return round(random.uniform(40, 120), 1)
    return round(random.uniform(10, 40), 1)
def get_voc(): return round(random.uniform(50, 500), 0)
def get_temperature(hour):
    min_temp, max_temp = 10, 22
    amplitude = (max_temp - min_temp) / 2
    avg_temp = min_temp + amplitude
    temp = avg_temp + amplitude * math.sin((hour - 9) * (2 * math.pi / 24))
    return round(temp + random.uniform(-1, 1), 1)
def get_humidity(temperature):
    base_humidity = 80 - (temperature * 1.5)
    return round(max(30, min(95, base_humidity + random.uniform(-10, 10))), 1)
def get_sound_level(hour):
    if 23 <= hour <= 24 or 0 <= hour <= 6: return round(random.uniform(30, 50), 1)
    elif 7 <= hour <= 19: return round(random.uniform(55, 85) + random.choice([0,0,0,5,10]), 1)
    return round(random.uniform(45, 65), 1)
def get_light_level(hour):
    if 7 <= hour <= 18: return round(random.uniform(5000, 80000) * (math.sin((hour-6) * math.pi / 13)**2) + random.uniform(0,1000))
    else: return round(random.uniform(1, 50) + random.choice([0,0,0,0,100,200]))
def get_vibration():
    if random.random() < 0.05: return round(random.uniform(0.5, 2.0), 2)
    return round(random.uniform(0.01, 0.2), 2)
def get_magnetic_field(): return round(random.uniform(-60, 60), 2)
def get_radiation():
    if random.random() < 0.001: return round(random.uniform(0.31, 0.50), 3)
    return round(random.uniform(0.05, 0.30), 3)

# --- İKA Başlangıç Konumları ve Hareket Mantığı ---
ika_states = []
for i in range(NUM_IKAS):
    start_location_name = random.choice(location_names)
    target_location_name = random.choice(location_names)
    while target_location_name == start_location_name: # Başlangıç ve hedef aynı olmasın
        target_location_name = random.choice(location_names)

    ika_states.append({
        "id": f"IKA_{str(i+1).zfill(3)}", # 100 İKA için 3 haneli ID
        "lat": istanbul_key_locations[start_location_name][0] + random.uniform(-0.005, 0.005), # Başlangıç noktasına biraz rastgelelik
        "lon": istanbul_key_locations[start_location_name][1] + random.uniform(-0.005, 0.005),
        "alt": random.uniform(20, 150),
        "current_target_name": target_location_name,
        "target_lat": istanbul_key_locations[target_location_name][0],
        "target_lon": istanbul_key_locations[target_location_name][1],
        "steps_to_target": random.randint(30, 180) # Hedefe kaç adımda (dakikada) varacağı (ortalama hız)
    })

# --- CSV Dosyasını Oluşturma ve Yazma ---
headers = [
    "Timestamp", "Ika_ID", "Latitude", "Longitude", "Altitude_m", "Target_Location",
    "PM2.5_ug_m3", "PM10_ug_m3", "CO_ppm", "NO2_ppb", "SO2_ppb", "O3_ppb", "VOC_ppb",
    "Temperature_C", "Relative_Humidity_Percent", "Sound_Level_dB", "Light_Level_lux",
    "Vibration_g", "Magnetic_Field_X_uT", "Magnetic_Field_Y_uT", "Magnetic_Field_Z_uT",
    "Radiation_uSv_h", "Kamera_Analizi"
]

start_time = datetime.datetime(2023, 10, 28, 0, 0, 0)

with open(OUTPUT_CSV_FILE, 'w', newline='', encoding='utf-8') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(headers)

    for hour_delta in range(DURATION_HOURS):
        current_hour_of_day = (start_time.hour + hour_delta) % 24
        for minute_delta in range(RECORDS_PER_HOUR):
            current_timestamp = start_time + datetime.timedelta(hours=hour_delta, minutes=minute_delta)
            timestamp_str = current_timestamp.strftime("%Y-%m-%dT%H:%M:%SZ")

            for ika in ika_states:
                # Hedefe doğru hareket et
                # Lineer interpolasyon ile basit bir güzergah takibi
                if ika["steps_to_target"] > 0:
                    delta_lat = (ika["target_lat"] - ika["lat"]) / ika["steps_to_target"]
                    delta_lon = (ika["target_lon"] - ika["lon"]) / ika["steps_to_target"]
                    ika["lat"] += delta_lat + random.uniform(-0.0002, 0.0002) # Hafif sapma
                    ika["lon"] += delta_lon + random.uniform(-0.0002, 0.0002) # Hafif sapma
                    ika["steps_to_target"] -= 1
                else: # Hedefe ulaşıldı veya süre doldu, yeni hedef belirle
                    old_target = ika["current_target_name"]
                    new_target_name = random.choice(location_names)
                    while new_target_name == old_target: # Yeni hedef eskisiyle aynı olmasın
                        new_target_name = random.choice(location_names)
                    
                    ika["current_target_name"] = new_target_name
                    ika["target_lat"] = istanbul_key_locations[new_target_name][0]
                    ika["target_lon"] = istanbul_key_locations[new_target_name][1]
                    # Yeni hedefe uzaklığa göre adım sayısı belirleyelim (basitçe)
                    dist_approx = abs(ika["target_lat"] - ika["lat"]) + abs(ika["target_lon"] - ika["lon"])
                    ika["steps_to_target"] = random.randint(max(15, int(dist_approx * 500)), max(45, int(dist_approx * 1500))) # min 15 dk, max ~2-3 saatlik yol
                    ika["steps_to_target"] = min(ika["steps_to_target"], 240) # En fazla 4 saatlik bir yol olsun bir sonraki hedef için

                # Sınırlar içinde kalmasını sağla (çok dışarı taşarsa merkeze yakın bir noktaya resetle)
                ika["lat"] = max(CITY_LAT_MIN, min(ika["lat"], CITY_LAT_MAX))
                ika["lon"] = max(CITY_LON_MIN, min(ika["lon"], CITY_LON_MAX))
                
                ika['alt'] += random.uniform(-1, 1)
                ika['alt'] = max(10, min(ika['alt'], 250))

                temp = get_temperature(current_hour_of_day)
                
                row = [
                    timestamp_str,
                    ika['id'],
                    round(ika['lat'], 6),
                    round(ika['lon'], 6),
                    round(ika['alt'], 1),
                    ika["current_target_name"], # Hedef bilgisi eklendi
                    get_pm25(current_hour_of_day), get_pm10(current_hour_of_day),
                    get_co(current_hour_of_day), get_no2(current_hour_of_day),
                    get_so2(), get_o3(current_hour_of_day), get_voc(),
                    temp, get_humidity(temp),
                    get_sound_level(current_hour_of_day), get_light_level(current_hour_of_day),
                    get_vibration(), get_magnetic_field(), get_magnetic_field(), get_magnetic_field(),
                    get_radiation()
                ]
                writer.writerow(row)
            
            if (minute_delta + 1) % 10 == 0:
                 print(f"İşlenen zaman: {current_timestamp}, Saat {hour_delta+1}/{DURATION_HOURS}, Dakika {minute_delta+1}/{RECORDS_PER_HOUR}")

print(f"Veri seti '{OUTPUT_CSV_FILE}' dosyasına başarıyla oluşturuldu.")
print(f"Toplam satır sayısı (başlık hariç): {NUM_IKAS * DURATION_HOURS * RECORDS_PER_HOUR}")