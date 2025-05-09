# Scalable Leaderboard System

## Projeye Genel Bakış

Bu projede **AdonisJS** ve **Node.js** kullanarak on milyon kullanıcıya hizmet verebilecek ölçeklenebilir bir *leaderboard* sistemi geliştirdim. Sistem, yüksek eşzamanlılık altında milisaniye seviyesinde "top 100" sorgularına yanıt verebilecek şekilde tasarlandı.

### Temel Özellikler

- **Redis Cluster Bucketing:**
    - Üç düğümlü Docker tabanlı **Redis Cluster** kuruldu.
    - Toplam **10.000 bucket** kullanılarak her bir kullanıcı skoru dağıtıldı.
    - Kullanıcı sıralamaları için Redis **ZSET** yapısı kullanıldı ve `ZREVRANGE` gibi sorgular logaritmik sürede çalışıyor.

- **PostgreSQL:**
    - Veritabanı olarak **PostgreSQL** kullanıldı.
    - Üçüncü parti bir API’den çekilen ve özel bir **AdonisJS komutu** ile oluşturulan **100 bin kullanıcı** verisi seed edildi.
    - Her kullanıcının `money` alanı başlangıçta sıfır olarak ayarlandı.
    - Haftalık ödül dağıtımları bu alanları yapılandırılmış mantıkla güncelliyor.

- **Cron Job & Simülasyon:**
    - `.env` dosyasından okunan çevresel değişkenlerle tetiklenen **cron job** sistemleri kuruldu.
    - `getWeekSinceCronJob` fonksiyonu ile cron başlangıç tarihinden itibaren geçen hafta sayısı hesaplanıyor.
    - Bu hesaplamalar, hem veri yazımı hem de ödül dağıtımı gibi süreçlerde tutarlılığı sağlıyor.
    - Haftalık olarak çalışan `DistributePrizes` servisi tanımlandı; bu servis PostgreSQL’e ödülleri işliyor ve WebSocket kanalları aracılığıyla frontend’e gerçek zamanlı veri gönderiyor.

- **IoC Entegrasyonu:**
    - AdonisJS’in **IoC Container** yapısı kullanılarak Redis servisleri container’a entegre edildi.
    - Böylece controller’lar ve servisler, Redis yapılandırmasına ihtiyaç duymadan container üzerinden erişebiliyor.

- **Docker & Geliştirme Ortamı:**
    - Bir **Dockerfile** yazarak yerel bir imaj oluşturuldu.
    - **Docker Compose** ile geliştirme ortamında şu servisler ayağa kaldırıldı:
        - Redis Cluster düğümleri (3 adet)
        - PostgreSQL
        - Socket servisi
        - API sunucusu

- **Prodüksiyon Ortamı:**
    - Bir **AWS EC2 instance** kiralandı.
    - Sunucuya **Docker** ve **Docker Compose** yüklendi.
    - **SSH** ile sunucuya bağlanılıp uygulama bileşenleri deploy edildi.
    - Docker Compose konfigürasyon dosyası sunucuya kopyalanıp `docker-compose up -d` komutu ile PostgreSQL, Redis Cluster, socket servisi ve API başlatıldı.

- **Güvenlik Grupları:**
    - AWS ortamında gerekli portlara erişimi sağlamak için aşağıdaki güvenlik grubu ayarları yapıldı:
        - HTTP/HTTPS: 80, 443 (Frontend)
        - API: 3333
        - WebSocket: 6001
        - Redis Cluster: 7000–7002
        - PostgreSQL: 5432
    - Böylece hem frontend hem de servisler erişilebilir kalırken güvenlik sınırları korundu.

- **Stateless Mimari:**
    - Tamamen **stateless** bir yapı kuruldu.
    - Tüm okuma işlemleri Redis üzerinden yapılıyor.
    - Redis, okuma işlemleri için kullanılırken PostgreSQL yalnızca veri yazımı için kullanılıyor.
    - “Top 100” gibi yüksek trafikli sorgular milisaniyeler içinde sonuçlanıyor.
    - Arama ve filtreleme gereken durumlar için PostgreSQL’de **B-tree index** kullanıldı.

- **Gerçek Zamanlı Güncellemeler:**
    - Socket servisi, puan güncellemeleri ve ödül dağıtımları gerçekleştiğinde **WebSocket kanalları** üzerinden event yayınlıyor.
    - Frontend tarafı bu kanalları dinleyerek:
        - Anlık leaderboard güncellemelerini
        - Ödül havuzundaki değişiklikleri
        - Vurgulu (highlight) kullanıcı satırlarını gösteriyor.
    - Böylece kullanıcılar sayfayı yenilemeden en güncel verileri görebiliyor.

- **Simülasyon Senaryosu (Test için Ölçek Küçültme):**
    - Sunucu kapasitesinden dolayı şu anda veritabanında **100.000 kullanıcı** bulunuyor.
    - Her **1 dakikada bir**, **100 kullanıcıya** Redis üzerinden başarı simüle edilip `money` değerleri artırılıyor.
    - Her **3 dakikada bir**, en çok paraya sahip **100 kullanıcıya** ödüller dağıtılıyor.
    - Bu interval değerleri `.env` dosyası ile dinamik olarak ayarlanabiliyor.
    - Ödüller dağıtılırken:
        - Kazanan satırlar arayüzde **altın rengiyle** vurgulanıyor.
        - Ödül havuzundaki miktar gerçek zamanlı olarak eksiliyor.

---

## Ekran Görüntüleri

<img width="1301" alt="Screenshot 2025-05-05 at 16 54 14" src="https://github.com/user-attachments/assets/9929d7d0-a6cf-47dc-b51b-02ba1616482a" />
<br/>
<img width="1313" alt="Screenshot 2025-05-05 at 17 07 33" src="https://github.com/user-attachments/assets/b7a28562-67be-4b7d-b92a-7b0bd5a32f90" />
