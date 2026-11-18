// Loads the first Settle In guides into the database.
//   node scripts/seed-settle.js          adds guides that don't exist yet
//   node scripts/seed-settle.js --force  also overwrites existing ones with the seed text
// After the first run, edit guides in the app (/settle-in/admin) instead.
require('dotenv').config({ quiet: true });
const prisma = require('../lib/prisma');
const { guides } = require('../db/settleSeed');
const { validateGuideInput } = require('../lib/settleRules');

async function main() {
    const force = process.argv.includes('--force');
    let added = 0, updated = 0, skipped = 0;
    for (const raw of guides) {
        const data = validateGuideInput(raw); // the seed must pass the same checks as the editor
        const row = { ...data, last_checked: new Date(`${data.last_checked}T00:00:00Z`) };
        const existing = await prisma.guide.findUnique({ where: { slug: data.slug } });
        if (!existing) {
            await prisma.guide.create({ data: row });
            added++;
        } else if (force) {
            await prisma.guide.update({ where: { slug: data.slug }, data: row });
            updated++;
        } else {
            skipped++;
        }
    }
    console.log(`Guides: ${added} added, ${updated} updated, ${skipped} already there${skipped && !force ? ' (use --force to overwrite)' : ''}.`);
}

main()
    .catch((err) => { console.error(err.message || err); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
