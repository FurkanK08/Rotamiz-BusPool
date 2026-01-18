# Rotamız 🚗

**Rotamız**, paylaşımlı yolculuk deneyimini kolaylaştıran modern bir mobil uygulama. Sürücüler ve yolcular için gerçek zamanlı konum takibi, güvenli kimlik doğrulama ve kullanıcı dostu arayüz sunar.

## 🎯 Özellikler

### Sürücü Özellikleri
- 🗺️ İnteraktif harita ile servis oluşturma
- 📍 Kalkış ve varış noktası belirleme
- 👥 Yolcu isteklerini yönetme
- 🚦 Gerçek zamanlı yolculuk takibi
- ⏱️ Tahmini varış süresi hesaplama

### Yolcu Özelliklikleri
- 🔍 Aktif servisleri arama ve görüntüleme
- 📲 Servise katılma istekleri gönderme
- 🗺️ Kendi konumunu harita üzerinde belirleme
- 👁️ Canlı sürücü ve servis takibi
- 🔔 Gerçek zamanlı bildirimler

### Güvenlik
- 🔐 SMS tabanlı OTP kimlik doğrulama
- 🛡️ JWT token bazlı oturum yönetimi
- ✅ Middleware ile korumalı API endpointleri

## 🛠️ Teknoloji Stack

### Frontend
- **React Native** (Expo)
- **React Navigation** - Ekran yönetimi
- **React Native Maps** - Harita entegrasyonu
- **AsyncStorage** - Yerel veri saklama
- **TypeScript** - Tip güvenliği

### Backend
- **Node.js** + **Express.js**
- **SQLite** (sqlite3) - Veritabanı
- **JWT** - Token bazlı kimlik doğrulama
- **Socket.io** - Gerçek zamanlı iletişim (planlanan)

## 📦 Kurulum

### Gereksinimler
- Node.js (v16 veya üzeri)
- npm veya yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) veya Android Emulator

### Backend Kurulumu

```bash
# Bağımlılıkları yükle
npm install

# Backend'i başlat
node backend/index.js
```

Backend varsayılan olarak `http://localhost:3000` adresinde çalışır.

### Mobil Uygulama Kurulumu

```bash
# Bağımlılıkları yükle
npm install

# Expo development server'ı başlat
npx expo start
```

Expo uygulamasını kullanarak QR kodu tarayın veya emulator/simulator'de çalıştırın:
- **i** tuşuna basarak iOS Simulator
- **a** tuşuna basarak Android Emulator

## 🚀 Kullanım

1. **Kayıt/Giriş**: Telefon numaranızla giriş yapın, SMS ile gelen OTP kodunu girin
2. **Rol Seçimi**: Sürücü veya Yolcu rolünü seçin
3. **Sürücü İseniz**: 
   - Harita üzerinde kalkış ve varış noktası belirleyin
   - Servis detaylarını girin (kapasite, tarih/saat)
   - Servisi oluşturun ve yolcu isteklerini bekleyin
4. **Yolcu İseniz**:
   - Aktif servisleri görüntüleyin
   - Uygun bir servise katılma isteği gönderin
   - Onaylandıktan sonra canlı takip yapın

## 📁 Proje Yapısı

```
spinning-eagle/
├── backend/              # Node.js Express backend
│   ├── index.js         # Ana sunucu dosyası
│   ├── middleware/      # Auth ve logger middleware
│   ├── routes/          # API route'ları
│   └── seed.js          # Veritabanı seed script
├── src/
│   ├── components/      # Yeniden kullanılabilir bileşenler
│   ├── screens/         # Uygulama ekranları
│   │   ├── Auth/       # Kimlik doğrulama ekranları
│   │   ├── Driver/     # Sürücü ekranları
│   │   └── Passenger/  # Yolcu ekranları
│   ├── services/        # API servisleri
│   ├── types/           # TypeScript tip tanımları
│   └── utils/           # Yardımcı fonksiyonlar
├── App.tsx              # Ana uygulama bileşeni
└── package.json
```

## 🔧 Yapılandırma

Backend API URL'ini değiştirmek için `src/services/api.ts` dosyasını düzenleyin:

```typescript
const API_URL = 'http://YOUR_IP:3000';
```

> ⚠️ **Not**: Fiziksel cihazda test ederken `localhost` yerine bilgisayarınızın IP adresini kullanın.

## 🧪 Test

```bash
# Backend testi için (seed data)
node backend/seed.js
```

## 📝 Git Workflow

Bu proje [GitHub Flow](file:///.agent/workflows/git-workflow.md) kullanır. Detaylı bilgi için workflow dokümantasyonuna bakın.

## 🤝 Katkıda Bulunma

1. Yeni bir feature branch oluşturun (`git checkout -b feature/amazing-feature`)
2. Değişikliklerinizi commit edin (`git commit -m 'feat: add amazing feature'`)
3. Branch'inizi push edin (`git push origin feature/amazing-feature`)
4. Pull Request açın

## 📄 Lisans

Bu proje şu anda özel bir projedir.

## 👤 Geliştirici

**Furkan** - Rotamız Projesi

---

⭐ Projeyi beğendiyseniz yıldız vermeyi unutmayın!
