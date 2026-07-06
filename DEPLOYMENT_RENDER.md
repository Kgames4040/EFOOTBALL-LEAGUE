# 🚀 Render Kurulum Rehberi — Premier Ligi Kupa (eFootball Lig)

Bu rehber, uygulamayı **Render** üzerinde (Backend + Frontend) ve veritabanı için **MongoDB Atlas** kullanarak sıfırdan yayına almanı sağlar. Adımları sırayla takip et.

---

## 0) Genel Mimari

| Bileşen | Teknoloji | Render Servis Tipi |
|---|---|---|
| Backend | FastAPI (Python) | Web Service |
| Frontend | React (CRA + craco) | Static Site |
| Veritabanı | MongoDB Atlas (M0 ücretsiz) | Harici |
| Görsel depolama | Cloudinary | Harici (mevcut) |
| Bildirim | Web Push (VAPID) | Harici (mevcut) |

---

## 1) MongoDB Atlas Kurulumu (Ücretsiz)

1. https://www.mongodb.com/cloud/atlas adresinden ücretsiz hesap aç.
2. **Create a Cluster** → **M0 (Free)** seç → bölge olarak sana yakın bir yer (örn. Frankfurt) seç.
3. **Database Access** → **Add New Database User**:
   - Kullanıcı adı + şifre belirle (şifrede `@ : / ?` gibi özel karakter kullanma, sorun çıkarır).
4. **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`) seç. (Render IP'leri dinamik olduğu için bu gerekli.)
5. **Database** → **Connect** → **Drivers** → connection string'i kopyala. Şuna benzer:
   ```
   mongodb+srv://KULLANICI:SIFRE@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Bunu `MONGO_URL` olarak kullanacaksın. **Not:** Sonuna veritabanı adı eklemen gerekmez; `DB_NAME` ayrı env değişkeni olarak verilecek.

---

## 2) Kodu GitHub'a Yükle

Render, GitHub reposundan otomatik deploy eder.
- Bu projeyi (klasör yapısı: `backend/`, `frontend/`, `render.yaml`) bir GitHub reposuna push et.
- (Emergent kullanıyorsan sohbetteki **"Save to GitHub"** özelliğiyle bunu yapabilirsin.)

---

## 3) Yöntem A — Blueprint ile Tek Tıkla (Önerilen)

Proje kökünde hazır `render.yaml` var.

1. Render Dashboard → **New +** → **Blueprint**.
2. GitHub reponu seç. Render `render.yaml`'ı otomatik okur ve **2 servis** önerir.
3. `sync: false` olan env değişkenlerini (gizli olanlar) elle gir (bkz. **Bölüm 5**).
4. **Apply** de. Render iki servisi de kurar.
5. Kurulum bitince:
   - Backend URL'ini al (örn. `https://premier-ligi-backend.onrender.com`).
   - Frontend servisinde `REACT_APP_BACKEND_URL`'i bu backend URL'i yap.
   - Backend servisinde `CORS_ORIGINS`'i frontend URL'in yap.
   - Her iki servisi **Manual Deploy → Clear build cache & deploy** ile yeniden başlat.

---

## 4) Yöntem B — Servisleri Elle Oluştur

### 4.1 Backend (Web Service)
1. **New +** → **Web Service** → repo seç.
2. Ayarlar:
   - **Name:** `premier-ligi-backend`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path:** `/api/`
3. Env değişkenlerini ekle (Bölüm 5).
4. **Create Web Service**.

### 4.2 Frontend (Static Site)
1. **New +** → **Static Site** → repo seç.
2. Ayarlar:
   - **Name:** `premier-ligi-frontend`
   - **Root Directory:** `frontend`
   - **Build Command:** `yarn install && yarn build`
   - **Publish Directory:** `build`
3. Env değişkeni:
   - `REACT_APP_BACKEND_URL` = backend URL'in (örn. `https://premier-ligi-backend.onrender.com`) — **sonunda `/` olmasın**.
   - `WDS_SOCKET_PORT` = `443`
4. **Redirects/Rewrites** sekmesi → kural ekle (SPA için zorunlu):
   - **Source:** `/*`  →  **Destination:** `/index.html`  →  **Action:** `Rewrite`
5. **Create Static Site**.

---

## 5) Ortam Değişkenleri (Environment Variables)

### Backend
| Anahtar | Açıklama | Örnek / Değer |
|---|---|---|
| `MONGO_URL` | Atlas connection string | `mongodb+srv://user:pass@cluster0.xxx.mongodb.net/?retryWrites=true&w=majority` |
| `DB_NAME` | Veritabanı adı | `premier_ligi` |
| `CORS_ORIGINS` | İzin verilen frontend adresi | `https://premier-ligi-frontend.onrender.com` |
| `JWT_SECRET` | Token imzalama anahtarı (uzun rastgele) | `9f2c7a1e...` (Blueprint otomatik üretir) |
| `ADMIN_USERNAME` | Yönetici kullanıcı adı | `neco` |
| `ADMIN_PASSWORD` | Yönetici şifresi | `neco404` (yayında değiştir!) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary | `doyl3efyd` |
| `CLOUDINARY_API_KEY` | Cloudinary | `679689671548124` |
| `CLOUDINARY_API_SECRET` | Cloudinary | `1vpLqD7_C9PDehTLK69d0GVWXEY` |
| `VAPID_PUBLIC_KEY` | Web Push | (mevcut .env'deki değer) |
| `VAPID_PRIVATE_KEY` | Web Push | (mevcut .env'deki değer) |
| `VAPID_SUBJECT` | Web Push iletişim | `mailto:admin@efootball-league.app` |

> Mevcut değerler `backend/.env` dosyasında hazır. Aynılarını Render'a kopyalayabilirsin.

### Frontend
| Anahtar | Açıklama | Örnek |
|---|---|---|
| `REACT_APP_BACKEND_URL` | Backend kök URL (sonunda `/` yok) | `https://premier-ligi-backend.onrender.com` |
| `WDS_SOCKET_PORT` | — | `443` |

---

## 6) Yayın Sonrası Kontrol Listesi

1. **Backend sağlık:** Tarayıcıda `https://<backend-url>/api/` → `{"message":"eFootball League Manager API"}` görmeli.
2. **Admin girişi:** Frontend'i aç → `neco` / `neco404` (veya belirlediğin şifre) ile giriş yap.
3. **Görsel yükleme:** Bir takım logosu yükle → Cloudinary'ye düşmeli.
4. **Bildirim:** Menü → "Bildirimleri Aç" → izin ver (HTTPS şart, Render zaten HTTPS verir).
5. **CORS hatası alırsan:** Backend'deki `CORS_ORIGINS`'in tam frontend URL'i olduğundan emin ol ve backend'i yeniden deploy et.

---

## 7) Önemli Notlar

- **Free plan uyku modu:** Render ücretsiz web servisi 15 dk hareketsizlikte uykuya geçer; ilk istek ~50 sn gecikebilir. **Bölüm 8**'deki keep-alive kurulumunu uygula (ücretsiz, 7/24 açık tutar) veya **Starter** plana geç.
- **MONGO_URL gizliliği:** Connection string'i asla public repoya koyma; sadece Render env'inde tut.
- **Admin şifresi:** Yayında `ADMIN_PASSWORD`'ü güçlü bir değerle değiştir. Backend her açılışta env'deki şifreyle admin hesabını senkronlar.
- **Veri kalıcılığı:** Tüm veriler MongoDB Atlas'ta tutulur; Render servisini silsen bile veriler Atlas'ta kalır.

---

## 8) Backend'i 7/24 Açık Tutmak (Keep-Alive)

Render ücretsiz plan 15 dakika hareketsizlikten sonra servisi uyutur. İki katman koruma öneriyoruz:

### 8.1 Uygulama içi otomatik ping (zaten yerleşik ✅)
- Frontend her 10 dakikada bir ve tab yeniden aktif olduğunda `GET /api/keepalive` çağırır.
- **Etki:** Sitede en az bir kullanıcı açıkken backend uykuya geçmez.

### 8.2 Harici cron (Kesin 7/24 çözüm — ÜCRETSİZ)

Aşağıdaki servislerden birini seç ve backend URL'ine her 5 dakikada bir istek yaptır:

**Endpoint:** `https://<backend-url>/api/keepalive`

#### A) UptimeRobot (Önerilen)
1. https://uptimerobot.com — ücretsiz hesap aç (50 monitor'e kadar).
2. **+ Add New Monitor** →
   - Monitor Type: **HTTP(s)**
   - Friendly Name: `Premier Ligi Backend`
   - URL: `https://<backend-url>/api/keepalive`
   - Monitoring Interval: **5 minutes** (ücretsiz plan minimum)
3. **Create Monitor**. UptimeRobot dünya çapında 5dk aralıklarla ping atacak → Render asla uykuya geçmez.

#### B) cron-job.org
1. https://cron-job.org — ücretsiz hesap aç.
2. **Create cronjob** →
   - Title: `Backend keepalive`
   - URL: `https://<backend-url>/api/keepalive`
   - Schedule: **Every 5 minutes**
3. **Create**.

#### C) GitHub Actions (opsiyonel, teknik kullanıcı için)
`.github/workflows/keepalive.yml` dosyası oluştur:
```yaml
name: Keepalive
on:
  schedule:
    - cron: "*/10 * * * *"  # her 10 dk
  workflow_dispatch:
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: curl -fsS https://<backend-url>/api/keepalive
```

> **Not:** UptimeRobot en güvenilir yol. GitHub Actions cron'u bazen 15+dk gecikebiliyor.

---

İyi yayınlar! 🏆
