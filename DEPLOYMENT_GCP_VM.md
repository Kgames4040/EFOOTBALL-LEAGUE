# 🚀 Google Cloud VM Kurulum Rehberi — Premier Ligi Kupa Backend

Bu rehber, backend'i **Google Cloud Compute Engine (VM)** üzerinde 7/24 açık kalacak şekilde kurmanı sağlar. **Frontend Render'da kalır** (Static Site), sadece backend adresini VM'e yönlendireceğiz.

**Hedef mimari:**
```
Kullanıcı → Frontend (Render Static) → https://api.senindomain.com → Nginx → uvicorn (127.0.0.1:8001)
                                                                            ↓
                                                                    MongoDB Atlas
```

**Öneri:** VM tipi olarak **e2-micro** (Free Tier — ABD dışı $6/ay, us-west1/us-central1/us-east1 bölgelerinde ücretsiz katman kapsamında ayda 720 saat). Backend + Nginx için yeterli.

---

## 1) GCP Projesi ve VM Oluşturma

### 1.1 Proje aç
1. https://console.cloud.google.com — Google hesabınla gir.
2. Üst çubuktan **New Project** → isim: `premier-ligi` → **Create**.
3. Sol menüden **Billing** → kredi kartı ekle (Free Tier için gerekli, ücret çıkmaz).

### 1.2 VM'i oluştur
1. Sol menü → **Compute Engine** → **VM instances** → **Create Instance**.
2. Ayarlar:
   - **Name:** `premier-ligi-backend`
   - **Region:** `us-west1 (Oregon)` VEYA `us-central1 (Iowa)` VEYA `us-east1 (S. Carolina)` — **bu 3 bölge Free Tier**
   - **Zone:** herhangi biri (örn. `us-central1-a`)
   - **Machine configuration:**
     - Series: `E2`
     - Machine type: **`e2-micro`** (2 vCPU shared, 1 GB RAM — Free Tier)
   - **Boot disk:**
     - **Change** → OS: **Ubuntu**, Version: **Ubuntu 22.04 LTS**, Size: `30 GB` Standard persistent disk (Free Tier limit)
   - **Firewall:** ✅ Allow HTTP traffic, ✅ Allow HTTPS traffic
3. **Create** — 30 sn içinde VM hazır olur.
4. VM listesinde **External IP** kolonundaki adresi kopyala (örn. `34.72.123.45`) — bunu domain'e A record olarak vereceğiz.

> **Not:** External IP'yi statik yap (ücretsiz, VM'e bağlı olduğu sürece). **VPC network** → **IP addresses** → yeni ephemeral IP'yi **Reserve** et.

---

## 2) VM'e Bağlan (SSH)

En kolayı Console'daki **SSH** butonu (VM satırının sağında). Ya da yerelden:
```bash
gcloud compute ssh premier-ligi-backend --zone=us-central1-a
```

Bağlandıktan sonra sistemi güncelle:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv git nginx ufw certbot python3-certbot-nginx
```

Firewall'u aç:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

---

## 3) Kodu VM'e Getir

### Yöntem A — GitHub üzerinden (önerilen)
```bash
cd ~
git clone https://github.com/<KULLANICI>/<REPO>.git premier-ligi
cd premier-ligi/backend
```

### Yöntem B — Zip ile
- Zip'i yerel makinene indir → `scp` ile VM'e yolla:
```bash
scp premier-ligi-full.zip user@34.72.123.45:~/
```
- VM'de:
```bash
sudo apt install -y unzip
unzip premier-ligi-full.zip -d premier-ligi
cd premier-ligi/backend
```

---

## 4) Python Ortamı ve Bağımlılıklar

```bash
cd ~/premier-ligi/backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn  # üretim WSGI wrapper (uvicorn worker'ları yönetecek)
```

---

## 5) Environment Değişkenleri

`~/premier-ligi/backend/.env` dosyasını oluştur/düzenle:
```bash
nano ~/premier-ligi/backend/.env
```

İçerik (**değerleri kendi Atlas/Cloudinary bilgilerinle değiştir**):
```env
MONGO_URL=mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
DB_NAME=premier_ligi
CORS_ORIGINS=https://premier-ligi-frontend.onrender.com
JWT_SECRET=BURAYA_UZUN_RASTGELE_KARAKTER_DIZISI
ADMIN_USERNAME=neco
ADMIN_PASSWORD=neco404
CLOUDINARY_CLOUD_NAME=doyl3efyd
CLOUDINARY_API_KEY=679689671548124
CLOUDINARY_API_SECRET=1vpLqD7_C9PDehTLK69d0GVWXEY
VAPID_PUBLIC_KEY=... 
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@senindomain.com
```

> **JWT_SECRET üret:** `openssl rand -hex 32` çalıştır, çıktıyı kopyala.

Kaydet: `Ctrl+O` → `Enter` → `Ctrl+X`.

MongoDB Atlas'ta **Network Access** sekmesine VM'in dış IP'sini ekle (veya `0.0.0.0/0`).

---

## 6) Systemd Servisi (Backend otomatik başlar, çökerse dirilir)

```bash
sudo nano /etc/systemd/system/premier-ligi.service
```

İçerik:
```ini
[Unit]
Description=Premier Ligi Backend (FastAPI/uvicorn)
After=network.target

[Service]
Type=simple
User=%i
WorkingDirectory=/home/UBUNTU_KULLANICI/premier-ligi/backend
EnvironmentFile=/home/UBUNTU_KULLANICI/premier-ligi/backend/.env
ExecStart=/home/UBUNTU_KULLANICI/premier-ligi/backend/.venv/bin/gunicorn server:app \
  --workers 2 --worker-class uvicorn.workers.UvicornWorker \
  --bind 127.0.0.1:8001 --timeout 120 --access-logfile - --error-logfile -
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

> **`UBUNTU_KULLANICI`** yerine `whoami` çıktısını (örn. `necati_04`) yaz. `User=%i` satırındaki `%i`'yi de aynı isimle değiştir (`User=necati_04`).

Aktive et:
```bash
sudo systemctl daemon-reload
sudo systemctl enable premier-ligi
sudo systemctl start premier-ligi
sudo systemctl status premier-ligi   # aktif olmalı
```

Loglar:
```bash
sudo journalctl -u premier-ligi -f
```

Test:
```bash
curl http://127.0.0.1:8001/api/health
# {"status":"ok","time":"..."}
```

---

## 7) Domain ve Nginx Reverse Proxy

### 7.1 Domain A record
- Domain sağlayıcında (Namecheap, GoDaddy, Cloudflare vb.) bir A record ekle:
  - **Host:** `api` (veya sub-domain neyse)
  - **Value:** VM'in **External IP**'si (örn. `34.72.123.45`)
  - **TTL:** Auto / 300

Sonuç: `api.senindomain.com` → VM'in IP'sine düşer.

### 7.2 Nginx config
```bash
sudo nano /etc/nginx/sites-available/premier-ligi
```

İçerik:
```nginx
server {
    listen 80;
    server_name api.senindomain.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

Aktive et:
```bash
sudo ln -s /etc/nginx/sites-available/premier-ligi /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default   # opsiyonel
sudo nginx -t
sudo systemctl reload nginx
```

Test: Tarayıcıda `http://api.senindomain.com/api/health` → JSON dönmeli.

### 7.3 HTTPS (Let's Encrypt — ücretsiz)
```bash
sudo certbot --nginx -d api.senindomain.com
```
- Email gir.
- Şartları kabul et.
- **Redirect HTTP → HTTPS:** `2` (Yes).

Sertifika otomatik 90 günde bir yenilenecek (certbot cron zaten kurulu).

Test: `https://api.senindomain.com/api/health` → JSON.

---

## 8) Frontend'i (Render'daki) Bu Backend'e Yönlendir

Render Dashboard → Frontend Static Site → **Environment**:
```
REACT_APP_BACKEND_URL=https://api.senindomain.com
```
Ardından **Manual Deploy → Clear build cache & deploy**.

Backend'de `CORS_ORIGINS` env'inin frontend URL'ini içerdiğinden emin ol (`https://premier-ligi-frontend.onrender.com` veya kendi domain'in).

---

## 9) Kod Güncelleme Akışı

Kodu GitHub'a push ettikten sonra VM'de:
```bash
cd ~/premier-ligi
git pull
cd backend
source .venv/bin/activate
pip install -r requirements.txt   # yeni bağımlılık varsa
sudo systemctl restart premier-ligi
```

---

## 10) İzleme ve Yedekleme

### Log kontrolü
```bash
sudo journalctl -u premier-ligi -n 100 --no-pager
sudo tail -f /var/log/nginx/access.log
```

### RAM/CPU kontrolü
```bash
htop   # (sudo apt install htop)
```

### MongoDB yedek (opsiyonel — Atlas zaten alıyor)
Atlas M0 free plan'da otomatik yedek yok, ama veri Atlas'ta güvende. **M10+** planında point-in-time recovery açılır.

---

## 11) Neden Bu Kurulum?

| Konu | Avantaj |
|---|---|
| e2-micro Free Tier | ABD 3 bölgede ücretsiz (720 saat/ay = 7/24) |
| systemd | Backend çökse dirilir, VM yeniden başlarsa otomatik başlar |
| Nginx reverse proxy | HTTPS + gzip + rate-limit gibi ek özelliklere hazır |
| Let's Encrypt | Ücretsiz SSL, otomatik yenileme |
| MongoDB Atlas | VM sıfırlasan bile veri güvende, ayrı yedek |

**Toplam aylık maliyet:** Free Tier + Atlas M0 + domain (~$1/ay) = **~$0**. Free Tier dışı bir bölge seçersen ~$6/ay.

---

## 12) Sık Sorunlar

- **502 Bad Gateway:** `sudo systemctl status premier-ligi` — uvicorn çalışıyor mu?
- **CORS hatası:** `.env`'deki `CORS_ORIGINS` frontend URL'ini içeriyor mu? Backend'i restart et.
- **502'de log yok:** Nginx logu: `sudo tail /var/log/nginx/error.log`.
- **Domain yönlenmiyor:** DNS propagation 5-30dk sürebilir. `dig api.senindomain.com` ile kontrol et.
- **MongoDB bağlanmıyor:** Atlas Network Access'te VM IP'si (veya `0.0.0.0/0`) eklendi mi?
- **Push bildirim çalışmıyor:** `.env`'deki VAPID anahtarları frontend'deki `push.js`'deki public key ile aynı mı?

---

## 13) Bonus — Docker ile Alternatif Kurulum

Eğer Docker tercih ediyorsan, `backend/Dockerfile` örneği:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn
COPY . .
EXPOSE 8001
CMD ["gunicorn", "server:app", "--workers", "2", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8001"]
```

`docker build -t premier-ligi-backend .` sonra `docker run -d --name backend --env-file .env -p 127.0.0.1:8001:8001 --restart unless-stopped premier-ligi-backend`.

Nginx yine önde reverse proxy görevi görür.

---

Kolay gelsin! Sorun çıkarsa `sudo journalctl -u premier-ligi -f` her şeyi söyler. 🚀
