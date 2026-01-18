---
description: Git workflow ve branch yönetimi rehberi
---

# Git Workflow Rehberi

Bu proje **GitHub Flow** metodolojisi kullanır - basit, modern ve etkili bir workflow.

## 🌳 Branch Stratejisi

### Ana Branch
- **`main`** - Production-ready kod. Her zaman çalışır durumda olmalı.

### Çalışma Branch'leri
Yeni özellikler, düzeltmeler veya güncellemeler için `main`'den branch açılır:

- `feature/özellik-adı` - Yeni özellikler için
- `fix/bug-adı` - Bug düzeltmeleri için
- `refactor/açıklama` - Code refactoring için
- `docs/açıklama` - Dokümantasyon için
- `chore/açıklama` - Bakım işleri için (dependencies, config vb.)

## 📝 Commit Message Formatı

```
<type>: <kısa açıklama>

[opsiyonel detaylı açıklama]
```

### Commit Types

- **`feat`** - Yeni özellik ekleme
  - Örnek: `feat: add driver location tracking`
  
- **`fix`** - Bug düzeltme
  - Örnek: `fix: resolve OTP validation error`
  
- **`refactor`** - Kod yeniden yapılandırma (davranış değişikliği yok)
  - Örnek: `refactor: simplify auth middleware logic`
  
- **`docs`** - Dokümantasyon değişiklikleri
  - Örnek: `docs: update README installation steps`
  
- **`style`** - Kod formatı, boşluklar, noktalı virgüller vb. (mantık değişikliği yok)
  - Örnek: `style: format code with prettier`
  
- **`test`** - Test ekleme veya düzeltme
  - Örnek: `test: add unit tests for api service`
  
- **`chore`** - Build process, dependency güncellemeleri vb.
  - Örnek: `chore: update expo to v50`

### İyi Commit Mesajı Örnekleri

✅ **İyi:**
```bash
feat: add passenger pickup location selection

Added interactive map picker for passengers to select their exact pickup location.
Includes address search, manual pin placement, and reverse geocoding.
```

✅ **İyi:**
```bash
fix: resolve crash on service creation

Fixed null reference error when creating service without selecting end location.
```

❌ **Kötü:**
```bash
update files
```

❌ **Kötü:**
```bash
fixed bug
```

## 🔄 Temel Workflow

### 1. Yeni Özellik Geliştirme

```bash
# main branch'te olduğunuzdan emin olun ve güncelleyin
git checkout main
git pull origin main

# Yeni feature branch oluşturun
git checkout -b feature/yeni-ozellik

# Değişikliklerinizi yapın...
# Dosyaları stage'e alın
git add .

# Anlamlı commit mesajı ile commit edin
git commit -m "feat: add new feature description"

# Branch'inizi GitHub'a push edin
git push origin feature/yeni-ozellik

# GitHub'da Pull Request açın (opsiyonel, küçük projeler için)
# Veya doğrudan main'e merge edin (solo development)
git checkout main
git merge feature/yeni-ozellik
git push origin main

# Feature branch'i silin (opsiyonel)
git branch -d feature/yeni-ozellik
git push origin --delete feature/yeni-ozellik
```

### 2. Acil Bug Düzeltme

```bash
# main'den fix branch oluşturun
git checkout main
git checkout -b fix/kritik-bug

# Düzeltmeyi yapın ve commit edin
git add .
git commit -m "fix: resolve critical bug in authentication"

# main'e merge edin
git checkout main
git merge fix/kritik-bug
git push origin main
```

### 3. Dokümantasyon Güncelleme

```bash
git checkout -b docs/update-readme
git add README.md
git commit -m "docs: update installation instructions"
git checkout main
git merge docs/update-readme
git push origin main
```

## 💡 En İyi Uygulamalar

### Commit Sıklığı
- ✅ **Sık commit edin** - Her mantıksal değişiklik için bir commit
- ✅ **Küçük commitler** - Bir commit bir şey yapmalı
- ❌ Günün sonunda tek bir büyük commit yapmayın

### Branch Yaşam Döngüsü
- ✅ Branch'leri kısa ömürlü tutun
- ✅ Merge'den sonra feature branch'leri silin
- ✅ main'i her zaman güncel tutun

### Commit Mesajları
- ✅ Açıklayıcı olun - "ne" ve "neden"
- ✅ İngilizce veya Türkçe tutarlı kullanın
- ✅ Imperative mood kullanın: "add" not "added"

### Git Komutları İpuçları

```bash
# Son commit mesajını değiştirme (henüz push edilmemiş)
git commit --amend -m "yeni mesaj"

# Değişiklikleri geçici olarak saklama
git stash
git stash pop  # Geri alma

# Branch'leri listeleme
git branch -a

# Commit geçmişini görme
git log --oneline --graph --all

# Değişiklikleri görmek
git status
git diff
```

## 🚀 İlk Push Workflow

```bash
# Tüm değişiklikleri commit edin
git add .
git commit -m "feat: initial project setup with core features"

# GitHub'da repo oluşturun (web interface)
# Remote ekleyin
git remote add origin https://github.com/KULLANICI_ADI/rotamiz.git

# Main branch'i push edin
git push -u origin main
```

## 🔧 Solo Development için Basitleştirilmiş Workflow

Tek kişi geliştirme için daha basit:

```bash
# Doğrudan main'de çalışabilirsiniz (küçük değişiklikler için)
git add .
git commit -m "feat: add feature"
git push

# Büyük özellikler için hala branch kullanın
git checkout -b feature/buyuk-ozellik
# ... çalışın ...
git checkout main
git merge feature/buyuk-ozellik
git push
```

---

**Önemli:** Her commit anlamlı olmalı ve test edilmiş kod içermelidir!
