# Scalable Leaderboard System
# Projeye Genel Bakış

Bu projede **AdonisJS** ve **Node.js** kullanarak on milyon kullanıcıya hizmet verebilecek ölçeklenebilir bir leaderboard sistemi geliştirdim. Üç düğümlü Docker tabanlı bir **Redis Cluster** kurdum ve on bin **bucket**’tan oluşan bir bucketing mantığı uyguladım. Tüm kullanıcı puanlarını Redis **ZSET**’lerine kaydederek “top 100” sorgularını milisaniyeler içinde yanıtlayacak şekilde optimize ettim.

Veritabanı katmanı için **PostgreSQL**’i tercih ettim. Üçüncü parti bir API’den çekilen ve özel bir AdonisJS komutuyla oluşturulan on milyon kullanıcı veri setini seed ederken her kullanıcının money alanını sıfır olarak başlattım. Haftalık ödül dağıtımları bu alanı yapılandırılmış mantığa göre güncelliyor.

**Cron job**’lar, .env dosyasında tanımlanan çevresel değişkenlerle tetikleniyor. Cron başlangıç tarihinden itibaren geçen hafta sayısını hesaplayan getWeekSinceCronJob fonksiyonunu yazarak veri yazımı, frontend’e gönderim ve ödül dağıtımı süreçlerinde tutarlılık sağladım. Ayrıca haftalık olarak çalışan ve ödülleri PostgreSQL’e işleyen, ardından  **WebSocket** kanalı üzerinden gerçek zamanlı güncellemeler (highlight, pool güncellemeleri vb.) yayınlayan ayrı bir DistributePrizes servisi tanımladım.

AdonisJS’in **IoC** konteynerine **Redis** servisini dahil ederek controller’ların ve servislerin Redis’e manuel yapılandırma gerektirmeden **IoC** üzerinden erişmesini sağladım. **Dockerfile** oluşturdum, yerel bir imaj yarattım ve **Docker Compose** ile **Redis cluster düğümlerini**, **PostgreSQL’i** socket servisini ve API sunucusunu geliştirme ortamımda ayağa kaldırdım.

Prodüksiyon ortamı için bir **AWS EC2** instance kiraladım, sunucuya Docker ve Docker Compose kurdum, **SSH** üzerinden bağlanarak uygulama bileşenlerini deploy ettim. Docker Compose konfigürasyon dosyasını EC2’ye kopyalayıp imajları çekerek docker-compose up -d komutuyla PostgreSQL, Redis cluster, socket servisi ve API’yi başlattım.

AWS üzerinde gerekli portlara erişimi sağlamak için güvenlik gruplarını konfigüre ettim: frontend için HTTP/HTTPS (80, 443), API (3333), WebSocket (6001), Redis cluster (7000–7002) ve PostgreSQL (5432). Bu sayede hem kullanıcı arayüzü hem de servisler erişilebilir kalırken güvenlik sınırları korunmuş oldu.

Tamamen stateless bir mimari kurarak Redis üzerinden okuma darboğazlarını ortadan kaldırdım; yüksek eşzamanlılık gerektiren “top 100” gibi sorgularda tüm okuma işlemleri doğrudan Redis’ten yapılarak milisaniyeler içinde sonuç dönülüyor. Arama veya filtreleme gibi veritabanı sorgusu gereken senaryolarda ise ilgili PostgreSQL sütunlarına eklediğim **B-tree** indekslerle performansı yüksek tutuyorum.

Gerçek zamanlı frontend güncellemeleri için socket servisi, puan güncellemeleri veya ödül dağıtımları gerçekleştiğinde private WebSocket kanallar üzerinden event yayınlıyor. Frontend bu kanalları dinleyerek leaderboard ve havuz bilgilerini anında güncelliyor, kullanıcılar sayfayı yenilemeden en güncel verileri görüyor.

## Project Overview

This is a highly scalable ****leaderboard system**** built with ****AdonisJS**** and ****Node.js****, designed to serve ****10 million**** users with millisecond-level performance for queries like “Top 100.” Key highlights:

- ****Redis Cluster Bucketing:**** Three-node Redis cluster with 10 000 buckets, using ZSETs for ultra-fast ranking.
- ****PostgreSQL:**** Relational persistence seeded with 10 million users; weekly prize distributions update user balances.
- ****Cron Jobs & Simulation:**** Environment-driven cron jobs simulate achievements, update Redis scores, compute elapsed weeks via `getWeekSinceCronJob`, and distribute prizes via `DistributePrizes`.
- ****Real-Time Updates:**** Private WebSocket channels push highlights and pool changes to the frontend in real time.
- ****Stateless Architecture:**** Reads come directly from Redis; PostgreSQL is only written to, avoiding database read bottlenecks.

---

## Architecture

### Redis Cluster with Bucketing

- ****Three-node cluster**** deployed via Docker for HA and horizontal scalability.
- ****10 000 buckets**** partition user scores evenly across the cluster.
- ****Redis ZSETs**** maintain scores; `ZREVRANGE` queries run in O(log N) time.

### PostgreSQL Setup

- Seeds 10 million users (initial `money = 0`) via AdonisJS seed command and third-party API.
- Weekly prize job persists updated balances back to PostgreSQL.
- B-tree indexes on ranking and filter columns ensure fast searches when DB reads are needed.

### Stateless Design & Caching

- ****Write-through:**** Every simulated achievement writes to Redis ZSET.
- ****Read-from Redis:**** Frontend and services read leaderboard data directly from Redis.
- ****Millisecond responses:**** Eliminates DB read bottlenecks under high concurrency.

### Cron Jobs & Scheduling

- ****`getWeekSinceCronJob`**** — calculates number of weeks since `cronJobStartDate`.
- ****Simulation Job:**** Runs per `.env` schedule to simulate achievements and update reward pool.
- ****`DistributePrizes` Job:**** Weekly cron calculates prizes, writes to PostgreSQL, and emits WebSocket events.

### Real-Time WebSocket Notifications

- Broadcast highlights and pool changes via Pusher channels.
- Leveraged a third-party Pusher service because the Vercel-deployed frontend does not support long-lived socket connections.
- The AdonisJS backend triggers Pusher events to deliver real-time updates to the UI.

---

## Dependency Injection (IoC)

- Redis clients and other services are injected via AdonisJS’s IoC container.
- Promotes modularity and testability; swap implementations or mock services easily.

---


<img width="1301" alt="Screenshot 2025-05-05 at 16 54 14" src="https://github.com/user-attachments/assets/9929d7d0-a6cf-47dc-b51b-02ba1616482a" />
<img width="1313" alt="Screenshot 2025-05-05 at 17 07 33" src="https://github.com/user-attachments/assets/b7a28562-67be-4b7d-b92a-7b0bd5a32f90" />
