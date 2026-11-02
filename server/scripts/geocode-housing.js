// Gives existing housing listings a map location by looking up their address.
//
//   cd server
//   npx prisma db push          (once, adds the location columns)
//   node scripts/geocode-housing.js
//
// Goes one listing per second (the free geocoder's limit), so 300 listings
// take about 5 minutes. Safe to run again: it only touches listings that have
// no location yet. Listings whose address can't be found are listed at the end
// so their owners can place the pin by editing the listing.
require('dotenv').config();
const prisma = require('../lib/prisma');
const { geocodeAddress } = require('../lib/geocode');
const { locationFields } = require('../lib/location');

async function main() {
    const listings = await prisma.housingListing.findMany({
        where: { latitude: null },
        select: { id: true, title: true, street: true, city: true, postal_code: true },
        orderBy: { id: 'asc' },
    });
    console.log(`${listings.length} listing(s) without a location`);

    const notFound = [];
    for (const [i, listing] of listings.entries()) {
        try {
            const found = await geocodeAddress(listing);
            if (!found) { notFound.push(listing); console.log(`  ${i + 1}. #${listing.id} not found: ${listing.street}, ${listing.city}`); continue; }
            await prisma.housingListing.update({
                where: { id: listing.id },
                data: locationFields({ latitude: found.latitude, longitude: found.longitude }, 'address', null),
            });
            console.log(`  ${i + 1}. #${listing.id} ok`);
        } catch (err) {
            console.error(`  ${i + 1}. #${listing.id} failed: ${err.message}. Stopping; run again later.`);
            break;
        }
    }

    if (notFound.length) {
        console.log('\nCould not find these addresses (ask the owners to place the pin):');
        notFound.forEach(l => console.log(`  #${l.id} "${l.title}" - ${l.street}, ${l.postal_code || ''} ${l.city}`));
    }
}

main()
    .catch(err => { console.error(err); process.exitCode = 1; })
    .finally(() => prisma.$disconnect && prisma.$disconnect());
