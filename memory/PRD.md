# PRD — Premier Ligi Kupa (eFootball Lig Yönetim Merkezi)

## Orijinal Problem (Final Sürüm İsteği)
Türkçe eFootball lig/kupa yönetim uygulaması. Final sürüm öncesi düzeltmeler:
1. Kupa "Tamamen Sil" telefonlarda çalışmıyordu (durdurma çalışıyor, silme hiçbir şey yapmıyor).
2. Bazı telefonlarda kadro değişikliği sonrası bildirim (toast) ekrandan gitmiyor.
3. Sağ üstte profil sekmesinden kullanıcı her şeyi güncelleyebilsin (kullanıcı adı, şifre, resimler, takım ismi, TD ismi, ülke, açıklama).
4. Mobilde sayfa yenilenince ana sayfaya atsın.
5. Kupa eşleşmeleri daha şık görünsün, ekrandan taşma/bug olmasın.
6. Tüm sistem matematiği ve hatalar gözden geçirilsin.
7. Render kurulum talimatı + tüm sistemin zip'i (.env dahil).

## Mimari
- Backend: FastAPI (`backend/server.py`), JWT auth (`auth.py`), Cloudinary + Web Push (`media.py`), Mongo (`db.py`).
- Frontend: React (CRA + craco), Tailwind, shadcn/ui, sonner toasts, react-router.
- DB: MongoDB (yayında MongoDB Atlas).
- Görsel: Cloudinary (imzalı upload). Bildirim: VAPID Web Push.

## Kullanıcı Personaları
- Admin (`neco`): turnuva/kupa yönetimi, fikstür, maç sonuçları, oyuncu havuzu, magazin, kullanıcılar.
- Kullanıcı: takım kurar, kadro oluşturur, profil & takım bilgilerini düzenler.

## Tamamlanan İşler (2026-06)
- ✅ Kupa silme bug'ı: `window.confirm` (mobil PWA'da güvenilmez) → Promise tabanlı `ConfirmProvider` modal'ı. Admin.jsx'teki tüm onaylar (turnuva/kupa sil, çekiliş, sıfırla, fikstür, kullanıcı sil) bu modal'ı kullanır. Uçtan uca doğrulandı.
- ✅ Toast düzeltmesi: `index.js` Toaster `closeButton` + `duration=3500` → her zaman kapanır/kapatılabilir.
- ✅ Profil: `PUT /api/auth/me` (kullanıcı adı/şifre, yeni token döner) + `ProfileDialog` (Hesap + Takım&TD sekmeleri). Sağ üst `profile-menu-btn`'den açılır. Takım bilgileri `PUT /api/teams/me/info` ile.
- ✅ Mobil yenileme → ana sayfa: `App.js` `MobileReloadRedirect` (performance navigation type=reload & genişlik<1024 → "/").
- ✅ Kupa bracket: şık eşleşme kartları, kazanan vurgusu, CANLI/BAY/BİTTİ rozetleri, penaltı (P). Mobilde `grid-cols-1` (yatay taşma yok, 390px'de scrollWidth==clientWidth), masaüstünde 2 sütun.
- ✅ Sistem matematiği gözden geçirildi (çift devreli lig round-robin, kupa eleme/bay/penaltı ilerleme, puan durumu) — sorun yok.
- ✅ Render kurulum: `render.yaml` (Blueprint) + `DEPLOYMENT_RENDER.md` (Atlas + adım adım Türkçe).
- ✅ `requirements.txt`'ten kullanılmayan/çakışan `emergentintegrations` + `litellm` kaldırıldı.

## Test Durumu
- Backend pytest (yeni): 7/7 geçti (auth/me, kupa silme, tam kupa akışı). Eski bayat test dosyası silindi.
- Frontend (testing agent): iteration_1 (kupa silme + admin profil) ve iteration_2 (normal kullanıcı 2 sekmeli profil, mobil taşma yok, masaüstü grid, kadro toast) — hepsi geçti.

## Faz 2 — Kurucu/Admin Rol Sistemi (2026-06) ✅ test edildi (iteration_5, 7/7)
- `neco` artık KURUCU (founder). Backend: require_founder ile tüm yönetim endpoint'leri kurucuya kısıtlandı; require_staff eklendi (Faz 3 canlı maç için).
- Rol atama: POST /founder/users/{id}/grant-admin {match_id}, /revoke-admin, GET /founder/staff. Admin bir maça atanır; sadece atanan maç panelini görür (canlı kontroller Faz 3).
- Branding: GET /branding (public) + PUT /founder/branding. Uygulama adı, logo, favicon kurucu panelinden değişir; header anında güncellenir.
- Kurucu paneli: yeni "Roller" + "Marka" sekmeleri; Kullanıcılar sekmesinde "Takımı Düzenle" (her kullanıcının takım/TD/logo/ülke/açıklama bilgisi düzenlenir).
- Faz 1'den foldlananlar: profil menüsüne Çıkış Yap; yenile butonu artık mevcut ekranda kalır (MobileReloadRedirect kaldırıldı); oturum kalıcılığı (backend cold-start'ta cached_user ile logout yapmaz, sadece 401/403'te çıkış).
- GET /api/health eklendi (Render keep-alive ping için).

## Kalan Fazlar (sıradaki)
## Faz 3 — Canlı Maç Sistemi (2026-06) ✅ test edildi (iteration_6: backend 7/7 + frontend 6/6)
- Maç takip ekranı /match/:id: maç öncesi (logolar, isimler, TD, son-5 form), canlı (CANLI rozeti, dakika saati, canlı skor), bitmiş görünüm.
- Canlı kontroller (kurucu VEYA atanan admin): start/end-first-half (İLK YARI push), start-second-half, end-match (MAÇ BİTTİ push + sonuç işleme), goal (popup → +1 → GOOOOL push), correct-goal (gerçek golcüyü seç → gol taşınır).
- Saat: HALF_REAL_SEC=300 (45dk≈5 gerçek dk), uzatma random 1-5dk, mola 90sn. Dakika client-side hesaplanır.
- Yetki: check_match_access (founder=her maç, admin=assigned_match_id), 403 korumalı. Deep-link: bildirimler /match/:id (sw.js client.navigate). Fikstür+kupa kartları tıklanır, dashboard canlı skor gösterir.

## Faz 4 — Mini Lig + Maç İptali + Magazin Video + Oyuncu Havuzu (2026-06) ✅ backend test edildi (4/4)
- Tek-sayı turda mini lig (round-robin): zaten backend'de vardı (create_cup_round / maybe_advance_round, advance_count = n'den küçük en büyük 2'nin kuvveti) — doğrulandı.
- Maç iptali: Lig → POST /admin/matches/{id}/cancel {reason} (status=canceled, magazin "⛔ MAÇ İPTALİ home - away" + sebep, standings'te OM+1/M+1, 0 puan). Kupa → POST /admin/cup/match/{id}/cancel {reason, cup_action: both_out|advance, advance_team_id} (advance'de winner atanır + maybe_advance_round). Bay maçı iptali 400. build_match_view + build_cup_match_view'a cancel_reason eklendi.
- Frontend: CancelMatchDialog (2 aşamalı: onay → sebep; kupada both_out/advance seçimi). MatchesTab + CupTab'a X butonu ve iptal görünümü.
- Magazin video: video_url zaten destekliydi. Admin'e VideoUpload (Cloudinary /video/upload) + YouTube link girişi. VideoPlayer (YouTube iframe / native video) magazin arşivinde; MagazineFeed'de play rozeti.
- Oyuncu havuzu: PlayersTab'a "Takım Ekle" (chip listesi, /pool-clubs) + oyuncu eklerken takım list-box (select). PlayerModal'da havuzdan seçilen oyuncunun değeri kilitli (readOnly).

## Faz 1 — Tam Ekran Modalları (2026-06) ✅
- FullscreenModal bileşeni. Kupa eşleşme ağacı, lig fikstürü ve puan durumu için "Tam ekran için tıklayınız" butonları (Dashboard masaüstü+mobil, CupBracket). Fikstür tam ekranda dikey kaydırmalı.

## ⚠️ Önemli — .env dosyaları (2026-06)
- GitHub checkout'unda backend/.env ve frontend/.env YOKTU (gitignore). Bu oturumda preview için yeniden oluşturuldu: backend (local MongoDB, Cloudinary kimlikleri deployment dokümanından, YENİ üretilmiş VAPID çifti), frontend (REACT_APP_BACKEND_URL = preview URL). Render'da bu env değişkenleri Dashboard'da ayarlanmalı.

## Kalan Fazlar
- FAZ 2/3'ün kalan UI parçaları (canlı dakika ekranı detayları, bildirim deep-link → magazin, vb.) ana istek listesinde; bu oturum sadece FAZ 4 + FAZ 1 kapsamındaydı.

## Faz 5 — Küçük Eklentiler (2026-07) ✅
- Backend keep-alive: GET /api/keepalive (DB ping + zaman); frontend her 10dk tab açıkken ping atar (useBackendKeepalive App root'ta). Render dokümanına UptimeRobot/cron-job.org talimatları eklendi.
- **DEPLOYMENT_GCP_VM.md** eklendi: e2-micro free tier, systemd + Nginx reverse proxy + Let's Encrypt HTTPS, alternatif Docker kurulumu.
- Puan durumu Son 5: yeşil tik (W) / kırmızı X (L) / gri eksi (D) daireleri; mobilde hidden değil artık; ana sayfa StandingsPreview'a da eklendi.
- Magazin @mention'lar body içinde inline renkli tıklanabilir buton olarak render ediliyor (MentionText komponenti). Chip'ler altta hâlâ var.
- Her magazin kendi sayfası: /magazine/:id (MagazineDetail). Üstte başlık + tarih, altında medya (YouTube auto-embed veya optimize edilmiş resim), scrollable body, en altta bağlantı chip'leri. Push bildirimleri de bu sayfaya deep-link olur.
- "Section" mention'ları: mention-targets'a Fikstür/Puan Durumu/Kupa Ağacı/Gösteri Maçları/Magazin Arşivi eklendi (url=`/?section=...`). Dashboard `?section=` param'ını okuyup ilgili fullscreen modal'ı açar.
- PUT /api/admin/tournament: kurucu turnuva başladıktan sonra ad ve kapak resmini değiştirebilir. Admin > Turnuva'ya "Düzenle" butonu + EditTournamentDialog eklendi.
- Cloudinary otomatik ölçekleme: `optimizeImage(url,{w,h,crop,gravity})` helper'ı `f_auto,q_auto,c_fill` transformasyonu ekler. Dashboard hero ve magazin arşivi bunu kullanır. `tournamentCover(url)` = 1200×675.

### 2026-07 küçük düzeltmeler
- publish_magazine varsayılan URL'i `/?magazine=id` yerine `/magazine/id` oldu (dedicated sayfaya deep-link).
- MatchMagazineReq artık opsiyonel mentions kabul ediyor (match magazine'lerde de link etiketleyebiliyoruz).
- Draw indicator "•" → Minus icon; Son 5 kolonu mobilde de görünür.
