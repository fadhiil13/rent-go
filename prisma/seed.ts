import { PrismaClient, Role, VehicleType, VehicleStatus, RentalStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    const saltRounds = 10;
    const adminPassword = await bcrypt.hash('Admin123!', saltRounds);
    const userPassword = await bcrypt.hash('User123!', saltRounds);

    // ── Users ──────────────────────────────────────────────────────────────────
    const admin = await prisma.user.upsert({
        where: { email: 'admin@rentgo.com' },
        update: {},
        create: {
            name: 'Admin RentGo',
            email: 'admin@rentgo.com',
            password: adminPassword,
            phone: '08100000000',
            role: Role.ADMIN,
        },
    });

    const user1 = await prisma.user.upsert({
        where: { email: 'user1@mail.com' },
        update: {},
        create: {
            name: 'Budi Santoso',
            email: 'user1@mail.com',
            password: userPassword,
            phone: '08111111111',
            role: Role.USER,
        },
    });

    const user2 = await prisma.user.upsert({
        where: { email: 'user2@mail.com' },
        update: {},
        create: {
            name: 'Siti Rahayu',
            email: 'user2@mail.com',
            password: userPassword,
            phone: '08222222222',
            role: Role.USER,
        },
    });

    console.log('✅ Users seeded:', admin.email, user1.email, user2.email);

    // ── Vehicles ───────────────────────────────────────────────────────────────
    const vehicles = [
        {
            name: 'Toyota Avanza',
            type: VehicleType.CAR,
            brand: 'Toyota',
            model: 'Avanza',
            year: 2022,
            plateNumber: 'B 1234 ABC',
            pricePerDay: 350000,
            status: VehicleStatus.AVAILABLE,
            imageUrl: 'https://placehold.co/600x400?text=Toyota+Avanza',
            description: 'Mobil keluarga 7 penumpang, AC, kondisi prima.',
        },
        {
            name: 'Honda HR-V',
            type: VehicleType.CAR,
            brand: 'Honda',
            model: 'HR-V',
            year: 2023,
            plateNumber: 'B 5678 DEF',
            pricePerDay: 500000,
            status: VehicleStatus.AVAILABLE,
            imageUrl: 'https://placehold.co/600x400?text=Honda+HR-V',
            description: 'SUV kompak, nyaman untuk perjalanan jauh.',
        },
        {
            name: 'Daihatsu Xenia',
            type: VehicleType.CAR,
            brand: 'Daihatsu',
            model: 'Xenia',
            year: 2021,
            plateNumber: 'L 9012 GHI',
            pricePerDay: 300000,
            status: VehicleStatus.RENTED,
            imageUrl: 'https://placehold.co/600x400?text=Daihatsu+Xenia',
            description: 'MPV ekonomis, cocok untuk keluarga kecil.',
        },
        {
            name: 'Honda Vario 160',
            type: VehicleType.MOTORCYCLE,
            brand: 'Honda',
            model: 'Vario 160',
            year: 2023,
            plateNumber: 'B 3456 JKL',
            pricePerDay: 100000,
            status: VehicleStatus.AVAILABLE,
            imageUrl: 'https://placehold.co/600x400?text=Honda+Vario+160',
            description: 'Skutik modern, irit bahan bakar, mudah dikendarai.',
        },
        {
            name: 'Yamaha NMAX',
            type: VehicleType.MOTORCYCLE,
            brand: 'Yamaha',
            model: 'NMAX',
            year: 2022,
            plateNumber: 'L 7890 MNO',
            pricePerDay: 120000,
            status: VehicleStatus.AVAILABLE,
            imageUrl: 'https://placehold.co/600x400?text=Yamaha+NMAX',
            description: 'Skutik premium, cocok untuk touring kota.',
        },
        {
            name: 'Yamaha RX-King',
            type: VehicleType.MOTORCYCLE,
            brand: 'Yamaha',
            model: 'RX-King',
            year: 2005,
            plateNumber: 'W 1122 PQR',
            pricePerDay: 80000,
            status: VehicleStatus.MAINTENANCE,
            imageUrl: 'https://placehold.co/600x400?text=Yamaha+RX-King',
            description: 'Motor sport klasik, sedang dalam perawatan.',
        },
        {
            name: 'Suzuki Jimny',
            type: VehicleType.CAR,
            brand: 'Suzuki',
            model: 'Jimny',
            year: 2023,
            plateNumber: 'B 6677 VWX',
            pricePerDay: 750000,
            status: VehicleStatus.AVAILABLE,
            imageUrl: 'https://placehold.co/600x400?text=Suzuki+Jimny',
            description: 'SUV off-road compact, ideal untuk petualangan.',
        },
        {
            name: 'Vespa Primavera',
            type: VehicleType.MOTORCYCLE,
            brand: 'Vespa',
            model: 'Primavera 150',
            year: 2022,
            plateNumber: 'B 8899 YZA',
            pricePerDay: 150000,
            status: VehicleStatus.AVAILABLE,
            imageUrl: 'https://placehold.co/600x400?text=Vespa+Primavera',
            description: 'Skuter retro bergaya Italia, nyaman di perkotaan.',
        },
    ];

    const createdVehicles: Record<string, string> = {};
    for (const v of vehicles) {
        const record = await prisma.vehicle.upsert({
            where: { plateNumber: v.plateNumber },
            update: {},
            create: {
                name: v.name,
                type: v.type,
                brand: v.brand,
                model: v.model,
                year: v.year,
                plateNumber: v.plateNumber,
                pricePerDay: v.pricePerDay,
                status: v.status,
                imageUrl: v.imageUrl,
                description: v.description,
            },
        });
        createdVehicles[v.plateNumber] = record.id;
    }

    console.log('✅ Vehicles seeded:', Object.keys(createdVehicles).length, 'vehicles');

    // ── Rentals ────────────────────────────────────────────────────────────────
    function calcTotal(pricePerDay: number, startDate: Date, endDate: Date): number {
        const diffMs = endDate.getTime() - startDate.getTime();
        const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        return pricePerDay * days;
    }

    const rental1Start = new Date('2025-04-01T08:00:00Z');
    const rental1End   = new Date('2025-04-04T08:00:00Z');
    const rental1Price = calcTotal(350000, rental1Start, rental1End);

    await prisma.rental.upsert({
        where: { id: 'seed-rental-00000001' },
        update: {},
        create: {
            id: 'seed-rental-00000001',
            userId: user1.id,
            vehicleId: createdVehicles['B 1234 ABC'],
            startDate: rental1Start,
            endDate: rental1End,
            totalPrice: rental1Price,
            status: RentalStatus.COMPLETED,
        },
    });

    const rental2Start = new Date('2025-05-10T08:00:00Z');
    const rental2End   = new Date('2025-05-12T08:00:00Z');
    const rental2Price = calcTotal(100000, rental2Start, rental2End);

    await prisma.rental.upsert({
        where: { id: 'seed-rental-00000002' },
        update: {},
        create: {
            id: 'seed-rental-00000002',
            userId: user2.id,
            vehicleId: createdVehicles['B 3456 JKL'],
            startDate: rental2Start,
            endDate: rental2End,
            totalPrice: rental2Price,
            status: RentalStatus.CONFIRMED,
        },
    });

    const rental3Start = new Date('2025-06-01T08:00:00Z');
    const rental3End   = new Date('2025-06-03T08:00:00Z');
    const rental3Price = calcTotal(750000, rental3Start, rental3End);

    await prisma.rental.upsert({
        where: { id: 'seed-rental-00000003' },
        update: {},
        create: {
            id: 'seed-rental-00000003',
            userId: user1.id,
            vehicleId: createdVehicles['B 6677 VWX'],
            startDate: rental3Start,
            endDate: rental3End,
            totalPrice: rental3Price,
            status: RentalStatus.PENDING,
        },
    });

    console.log('✅ Rentals seeded: 3 rentals');

    // ── Payment & Invoice (hanya untuk rental COMPLETED) ──────────────────────
    await prisma.payment.upsert({
        where: { rentalId: 'seed-rental-00000001' },
        update: {},
        create: {
            rentalId:  'seed-rental-00000001',
            amount:    rental1Price,
            method:    PaymentMethod.TRANSFER,
            status:    PaymentStatus.PAID,
            reference: 'REF-SEED-00000001',
            paidAt:    new Date('2025-04-01T09:00:00Z'),
        },
    });

    await prisma.invoice.upsert({
        where: { rentalId: 'seed-rental-00000001' },
        update: {},
        create: {
            rentalId:      'seed-rental-00000001',
            invoiceNumber: 'INV-SEED-00000001',
            amount:        rental1Price,
            issuedAt:      new Date('2025-04-01T09:00:00Z'),
        },
    });

    console.log('✅ Payment & Invoice seeded: rental COMPLETED');
    console.log('');
    console.log('🎉 Seed completed successfully!');
    console.log('');
    console.log('📋 Test accounts:');
    console.log('   ADMIN  → admin@rentgo.com  / Admin123!');
    console.log('   USER 1 → user1@mail.com    / User123!');
    console.log('   USER 2 → user2@mail.com    / User123!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });