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

## Backlog / Sonraki Adımlar
- ✅ (2026-06) Bracket ağaç görünümü: turlar sütun olarak + aralarında bağlantı çizgileri (Connector/BracketTree). İç kısım yatay kaydırmalı, sayfa taşmıyor (min-w-0 ile grid taşması giderildi).
- ✅ (2026-06) Kupa özeti PNG export: takım kısaltmaları dikey kırpılması düzeltildi (truncate kaldırıldı, line-height + html2canvas onclone). Özette de bağlantı çizgili ağaç.
- P2: Bracket'te ileride animasyonlu kazanan vurgusu / tema seçenekleri (opsiyonel).
