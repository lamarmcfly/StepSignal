import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    console.log('Seeding database...');
    // Create test institution
    const institution = await prisma.institution.upsert({
        where: { id: '00000000-0000-0000-0000-000000000001' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000001',
            name: 'Test Medical School',
            slug: 'test-medical-school',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    });
    console.log('Created test institution:', institution);
    console.log('Seeding complete!');
}
main()
    .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
