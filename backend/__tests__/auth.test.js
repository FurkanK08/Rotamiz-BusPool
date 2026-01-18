const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../testApp');
const User = require('../models/User');
const { generatePhoneNumber } = require('./helpers/dataGenerator');

describe('Auth API', () => {
    beforeAll(async () => {
        await mongoose.connect('mongodb://localhost:27017/servis-takip-test');
    });

    afterAll(async () => {
        await User.deleteMany({});
        await mongoose.connection.close();
    });

    afterEach(async () => {
        await User.deleteMany({});
    });

    describe('POST /api/auth/login', () => {
        it('should register a new user', async () => {
            const phoneNumber = generatePhoneNumber();
            const res = await request(app)
                .post('/api/auth/login')
                .send({ phoneNumber });

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('user');
            expect(res.body).toHaveProperty('token');
            expect(res.body.msg).toBe('User registered');
        });

        it('should login existing user', async () => {
            const phoneNumber = generatePhoneNumber();
            // First create user
            await request(app)
                .post('/api/auth/login')
                .send({ phoneNumber });

            // Then login
            const res = await request(app)
                .post('/api/auth/login')
                .send({ phoneNumber });

            expect(res.statusCode).toBe(200);
            expect(res.body.msg).toBe('User logged in');
        });

        it('should return 400 if no phone number', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({});

            expect(res.statusCode).toBe(400);
        });
    });
});
