# Projeye Genel Bakış

Bu projede **AdonisJS** ve **Node.js** kullanarak on milyon kullanıcıya hizmet verebilecek ölçeklenebilir bir leaderboard sistemi geliştirdim. Performans ve yatay ölçeklenebilirlik gereksinimlerini karşılamak üzere Docker ile ayağa kaldırdığım üç düğümlü **Redis Cluster** üzerinde on bin **bucket**’tan oluşan bir bucketing mantığı uyguladım. Tüm kullanıcı puanlarını Redis **ZSET**’lerde tutarak “top 100” gibi sorguları saniyeler içinde yanıtlayacak şekilde optimize ettim.

Veritabanı olarak **PostgreSQL**’i tercih ettim. Üçüncü parti bir API’dan çektiğim ve kendi AdonisJS komutumla oluşturduğum on milyon kullanıcı veri setini seed ederken her kullanıcının money alanını başlangıçta sıfır olarak ayarladım. Haftalık ödül dağıtımlarıyla bu alanların güncellenmesini sağlayacak yapılandırmayı uyguladım.

.env dosyasındaki ayarlara bağlı olarak tetiklenen **cron job** ile kullanıcıların başarılarını simüle ediyor, eklediğim her değer için özel Redis key’leri üzerinden ödül havuzunu güncelliyorum. Cron başlangıç tarihinden itibaren geçen periyot sayısını hesaplayan getWeekSinceCronJob fonksiyonunu yazarak bu mantığı veri yazımında, frontend’e gönderimde ve ödül dağıtım aşamasında tutarlı şekilde kullanıyorum. Haftalık dağıtımı gerçekleştiren DistributePrizes servisini ayrı bir cron job olarak tanımlayarak, ödülleri PostgreSQL’e işlerken private **WebSocket** kanalım üzerinden kullanıcı arayüzüne gerçek zamanlı güncellemeler (highlight, pool güncelleme vb.) gönderiyorum.

**Redis** kullanarak tamamen stateless bir mimari elde ettim: kullanıcıların başarı simülasyonları her gerçekleştiğinde önce ilgili puan güncellemelerini Redis’e yazıyor; frontend ve servisler doğrudan bu Redis verisini okuyarak veritabanından okuma (read) işlemlerini ortadan kaldırıyor. Bu sayede yüksek eşzamanlılık gerektiren “top 100” gibi sorgularda veritabanı okumalarına bağlı darboğazları tümüyle önlüyor, tüm sorguları milisaniyeler seviyesinde yanıtlayabiliyorum.

Yine de PostgreSQL tarafında leaderboard ve kullanıcı sorgularının yapıldığı sütunlara index’ler ekleyerek; arama gibi veritabanı sorgusu yapılması gereken senaryolar için performansın yüksek kalmasını sağladım. Bu kapsamda, özellikle sıralama ve filtreleme işlemlerinin hızını artırmak üzere **B-tree** indeksleri kullandım.

<img width="1301" alt="Screenshot 2025-05-05 at 16 54 14" src="https://github.com/user-attachments/assets/9929d7d0-a6cf-47dc-b51b-02ba1616482a" />
<img width="1313" alt="Screenshot 2025-05-05 at 17 07 33" src="https://github.com/user-attachments/assets/b7a28562-67be-4b7d-b92a-7b0bd5a32f90" />
