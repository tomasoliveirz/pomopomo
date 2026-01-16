
import { PrismaClient } from '@prisma/client';
import net from 'net';

const client = new net.Socket();
console.log('Testing TCP connection to 127.0.0.1:5432...');

client.connect(5432, '127.0.0.1', () => {
    console.log('TCP Connection successful!');
    client.destroy();

    // Now test Prisma
    console.log('Testing Prisma connection...');
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: 'postgresql://pomopomo:pomopomo123@127.0.0.1:5432/pomopomo'
            }
        }
    });

    prisma.$connect()
        .then(() => {
            console.log('Prisma Connection Successful!');
            return prisma.user.count();
        })
        .then((count) => {
            console.log(`User Count: ${count}`);
            process.exit(0);
        })
        .catch((e) => {
            console.error('Prisma Error:', e);
            process.exit(1);
        });
});

client.on('error', (e) => {
    console.error('TCP Connection Failed:', e);
    process.exit(1);
});
