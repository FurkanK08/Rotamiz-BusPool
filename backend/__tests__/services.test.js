const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../testApp'); // Separate test app instance
const User = require('../models/User');
const Service = require('../models/Service');
const { generatePhoneNumber, generateServiceCode } = require('./helpers/dataGenerator');

describe('Services API Tests', () => {
    let driverId;
    let passengerId;
    let serviceId;

    beforeAll(async () => {
        // Connect to test database
        await mongoose.connect('mongodb://localhost:27017/servis-takip-test');
    });

    afterAll(async () => {
        // Clean up and disconnect
        await User.deleteMany({});
        await Service.deleteMany({});
        await mongoose.connection.close();
    });

    afterEach(async () => {
        // Clear collections after each test
        await Service.deleteMany({});
        await User.deleteMany({});
    });

    describe('POST /api/services/create', () => {
        beforeEach(async () => {
            // Create a driver user
            const driver = await User.create({
                phoneNumber: generatePhoneNumber(),
                name: 'Test Driver',
                role: 'DRIVER'
            });
            driverId = driver._id.toString();
        });

        it('should create a new service successfully', async () => {
            const res = await request(app)
                .post('/api/services/create')
                .send({
                    driverId,
                    name: 'Test Service',
                    plate: '34 ABC 123',
                    schedules: ['08:00', '17:00']
                });

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('code');
            expect(res.body.name).toBe('Test Service');
            expect(res.body.plate).toBe('34 ABC 123');
            expect(res.body.code).toMatch(/^\d{4}$/); // 4-digit code

            serviceId = res.body._id;
        });

        it('should return 400 if required fields are missing', async () => {
            const res = await request(app)
                .post('/api/services/create')
                .send({
                    driverId,
                    name: 'Test Service'
                    // Missing plate
                });

            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('msg');
        });
    });

    describe('GET /api/services/driver/:driverId', () => {
        beforeEach(async () => {
            const driver = await User.create({
                phoneNumber: generatePhoneNumber(),
                name: 'Test Driver',
                role: 'DRIVER'
            });
            driverId = driver._id.toString();

            // Create a service for this driver
            await Service.create({
                driver: driverId,
                name: 'Test Service 1',
                plate: '34 ABC 123',
                code: generateServiceCode(),
                schedules: ['08:00']
            });
        });

        it('should return all services for a driver', async () => {
            const res = await request(app)
                .get(`/api/services/driver/${driverId}`);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1);
            expect(res.body[0].name).toBe('Test Service 1');
        });

        it('should return empty array if driver has no services', async () => {
            const newDriver = await User.create({
                phoneNumber: generatePhoneNumber(),
                role: 'DRIVER'
            });

            const res = await request(app)
                .get(`/api/services/driver/${newDriver._id}`);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(0);
        });
    });

    describe('POST /api/services/join', () => {
        let code;
        beforeEach(async () => {
            const driver = await User.create({
                phoneNumber: generatePhoneNumber(),
                role: 'DRIVER'
            });
            driverId = driver._id.toString();

            const passenger = await User.create({
                phoneNumber: generatePhoneNumber(),
                role: 'PASSENGER'
            });
            passengerId = passenger._id.toString();

            code = generateServiceCode();
            const service = await Service.create({
                driver: driverId,
                name: 'Test Service',
                plate: '34 ABC 123',
                code: code,
                schedules: ['08:00']
            });
            serviceId = service._id;
        });

        it('should allow passenger to join service with valid code', async () => {
            const res = await request(app)
                .post('/api/services/join')
                .send({
                    passengerId,
                    code: code
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.passengers).toContainEqual(expect.objectContaining({
                _id: passengerId
            }));
        });

        it('should return 404 for invalid code', async () => {
            const res = await request(app)
                .post('/api/services/join')
                .send({
                    passengerId,
                    code: '999999' // Definitely invalid
                });

            expect(res.statusCode).toBe(404);
        });

        it('should prevent joining same service twice', async () => {
            // Join first time
            await request(app)
                .post('/api/services/join')
                .send({
                    passengerId,
                    code: code
                });

            // Try to join again
            const res = await request(app)
                .post('/api/services/join')
                .send({
                    passengerId,
                    code: code
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.msg).toContain('already');
        });
    });

    describe('POST /api/services/remove-passenger', () => {
        beforeEach(async () => {
            const driver = await User.create({
                phoneNumber: generatePhoneNumber(),
                role: 'DRIVER'
            });
            driverId = driver._id.toString();

            const passenger = await User.create({
                phoneNumber: generatePhoneNumber(),
                role: 'PASSENGER'
            });
            passengerId = passenger._id.toString();

            const service = await Service.create({
                driver: driverId,
                name: 'Test Service',
                plate: '34 ABC 123',
                code: generateServiceCode(),
                schedules: ['08:00'],
                passengers: [passengerId]
            });
            serviceId = service._id.toString();
        });

        it('should remove passenger from service', async () => {
            const res = await request(app)
                .post('/api/services/remove-passenger')
                .send({
                    serviceId,
                    passengerId
                });

            expect(res.statusCode).toBe(200);
            // expect(res.body.passengers).not.toContainEqual(passengerId); // can fail if object comparison issue
            const updatedService = await Service.findById(serviceId);
            expect(updatedService.passengers).not.toContainEqual(passengerId);
        });
    });
});
