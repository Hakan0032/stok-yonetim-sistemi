# Yüceler Makine Stok Yönetim Sistemi

Yüceler Makine için geliştirilmiş modern stok yönetim sistemi.

## Özellikler

- 📦 Malzeme stok takibi
- 📊 Detaylı raporlama
- 📈 Dashboard ve analitik
- 🔐 Güvenli kullanıcı yönetimi
- 📱 Responsive tasarım
- 🎯 ABC analizi
- 📋 İşlem geçmişi

## Teknolojiler

### Frontend
- React 18
- Bootstrap 5
- Chart.js
- React Router
- Axios

### Backend
- Node.js
- Express.js
- MongoDB
- JWT Authentication
- Multer (Dosya yükleme)

## Kurulum

### Gereksinimler
- Node.js (v16 veya üzeri)
- MongoDB
- npm veya yarn

### Yerel Geliştirme

1. Projeyi klonlayın:
```bash
git clone <repository-url>
cd yuceler-makine-stok-sistemi
```

2. Bağımlılıkları yükleyin:
```bash
npm run install-all
```

3. Environment variables ayarlayın:
```bash
# backend/.env dosyası oluşturun
MONGODB_URI=mongodb://localhost:27017/yuceler-stok
JWT_SECRET=your-secret-key
PORT=5001
```

4. Uygulamayı başlatın:
```bash
# Backend
cd backend && npm start

# Frontend (yeni terminal)
cd frontend && npm start
```

## Deployment

### Vercel ile Deploy

1. GitHub'a push edin
2. Vercel hesabınızla GitHub repository'yi bağlayın
3. Environment variables'ları Vercel dashboard'da ayarlayın
4. Otomatik deployment başlayacak

### Environment Variables (Production)

```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=production-secret-key
NODE_ENV=production
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Kullanıcı girişi
- `POST /api/auth/register` - Kullanıcı kaydı

### Materials
- `GET /api/materials` - Tüm malzemeleri listele
- `POST /api/materials` - Yeni malzeme ekle
- `PUT /api/materials/:id` - Malzeme güncelle
- `DELETE /api/materials/:id` - Malzeme sil

### Transactions
- `GET /api/transactions` - İşlemleri listele
- `POST /api/transactions` - Yeni işlem ekle

### Reports
- `GET /api/reports/stock` - Stok raporu
- `GET /api/reports/abc` - ABC analizi
- `GET /api/reports/transactions` - İşlem raporu

## Lisans

MIT License

