require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Service = require('../models/Service');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/buspool';

const seedDatabase = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('📦 MongoDB Connected');

        // Temizlik
        await User.deleteMany({});
        await Service.deleteMany({});
        console.log('🧹 Database Cleaned');

        // Şifre Hashleme
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('123456', salt);

        // 1. Sürücü Oluştur
        const driver = await User.create({
            name: 'Ahmet Yılmaz (Sürücü)',
            phoneNumber: '5551112233',
            password: passwordHash, // Schema'da password yoksa auth flow farklı olabilir, kontrol edelim.
            role: 'DRIVER',         // Modelde büyük harf 'DRIVER'
            pushToken: null
        });
        console.log('✅ Driver Created:', driver.name);

        // 2. Yolcuları Oluştur
        const passenger1 = await User.create({
            name: 'Mehmet Demir (Yolcu)',
            phoneNumber: '5554445566',
            role: 'PASSENGER',
            pickupLocation: {
                latitude: 41.0082,
                longitude: 28.9784, // Sultanahmet
                address: 'Sultanahmet Meydanı',
                addressDetail: 'Cami önü'
            }
        });

        const passenger2 = await User.create({
            name: 'Ayşe Kaya (Yolcu)',
            phoneNumber: '5557778899',
            role: 'PASSENGER',
            pickupLocation: {
                latitude: 41.0256, // Galata Kulesi yakınları
                longitude: 28.9741,
                address: 'Galata Kulesi',
                addressDetail: 'Kule dibi'
            }
        });
        console.log('✅ Passengers Created');

        // 3. Servis Oluştur
        // Servisi oluştururken yolcuları ekliyoruz.
        const service = await Service.create({
            name: 'Sabah Servisi - Avrupa',
            plate: '34 VP 5858',
            driver: driver._id,
            code: '1234',
            active: false,
            passengers: [passenger1._id, passenger2._id], // Yolcular burada ekli
            destination: {
                latitude: 41.0601, // Zincirlikuyu
                longitude: 29.0093,
                address: 'Zincirlikuyu Metrobüs'
            },
            schedules: ['08:00', '18:00'],
            attendance: []
        });
        console.log('✅ Service Created:', service.name, 'Code:', service.code);

        // Yolcuların servis listesinde göründüğünden emin olmak için bir kontrol veya güncelleme gerekirse buraya eklenebilir.
        // Ancak Service modelinde 'passengers' array olduğu için ve sorgular Service üzerinden yapıldığı için bu yeterli.

        console.log('\n🎉 Seeding Completed Successfully!');
        console.log('-----------------------------------');
        console.log('GİRİŞ BİLGİLERİ (TEST İÇİN):');
        console.log('-----------------------------------');
        console.log('🚐 SÜRÜCÜ:');
        console.log(`   Tel: ${driver.phoneNumber}`);
        console.log('   Rol: Driver');
        console.log('');
        console.log('👤 YOLCU 1 (Sultanahmet):');
        console.log(`   Tel: ${passenger1.phoneNumber}`);
        console.log('   Rol: Passenger');
        console.log('');
        console.log('👤 YOLCU 2 (Galata):');
        console.log(`   Tel: ${passenger2.phoneNumber}`);
        console.log('   Rol: Passenger');
        console.log('-----------------------------------');
        console.log('ℹ️  NOT: Giriş yaptıktan sonra eğer yolcu ekranında servis görünmüyorsa,');
        console.log('    "Servise Katıl" diyerek 1234 kodunu giriniz.');
        console.log('-----------------------------------');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding Error:', error);
        process.exit(1);
    }
};

seedDatabase();
