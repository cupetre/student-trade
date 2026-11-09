// One-time clean-up before `npx prisma db push` adds the rule
// "one review per person about another person" (@@unique([reviewer_id, reviewee_id])).
//
// For every pair with more than one review it keeps the newest one and deletes
// the older ones. Run it once:
//
//   node scripts/merge-duplicate-reviews.js          (shows what it would do)
//   node scripts/merge-duplicate-reviews.js --apply  (does it)
//
// then `npx prisma db push`.

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

async function main() {
    const reviews = await prisma.review.findMany({
        select: { id: true, reviewer_id: true, reviewee_id: true, rating: true, updated_at: true },
        orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
    });

    const seen = new Set();
    const extra = [];
    for (const review of reviews) {
        const pair = `${review.reviewer_id}->${review.reviewee_id}`;
        if (seen.has(pair)) extra.push(review); // an older review of the same person
        else seen.add(pair);
    }

    if (!extra.length) {
        console.log('No duplicate reviews. You can run `npx prisma db push`.');
        return;
    }

    console.log(`${extra.length} older duplicate review(s) found (the newest one per pair is kept):`);
    extra.forEach(r => console.log(`  review ${r.id}: user ${r.reviewer_id} about user ${r.reviewee_id}, ${r.rating}★, ${r.updated_at.toISOString().slice(0, 10)}`));

    if (!apply) {
        console.log('\nNothing deleted. Run again with --apply to delete them.');
        return;
    }
    const { count } = await prisma.review.deleteMany({ where: { id: { in: extra.map(r => r.id) } } });
    console.log(`\nDeleted ${count}. Now run \`npx prisma db push\`.`);
}

main()
    .catch((err) => { console.error(err); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
