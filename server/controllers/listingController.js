const { updateListing, 
    addListing, 
    viewListings, 
    fetchMyListings,
    removeListing
 } = require('../models/listingModels.js');

async function editListing(req, res) {
    const pool = req.pool;
    const { id, title, description, price, date } = req.body;
    const photoPath = req.file ? req.file.location : null;

    try { 
        await updateListing(pool, { 
            id, 
            ownerId: req.user.id,
            title,
            description,
            price,
            photo: photoPath,
            date
        });
        res.status(200).json({ message: 'Listing updated successfully' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to update listing' });
    }
};

async function uploadListing(req, res) {
    const pool = req.pool;
    const {title, description, price, date} = req.body;
    const photoPath = req.file ? req.file.location : null;

    try {
        await addListing(pool,{
            ownerId: req.user.id,
            title,
            description,
            price,
            photo: photoPath,
            date
        });
        res.status(200).json("works fine");
    } catch ( err ){
        console.error(err);
        res.status(500).json({ error: " failed to add it "});
    }
};

async function showListings(req,res) {
    const pool = req.pool;
    const ownerId = req.user.id;

    try {
        const listings = await viewListings(pool, {ownerId });
        res.json(listings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "failed loading listings "});
    }
};

async function showMyListings(req, res) {
    const pool = req.pool;
    const owner_id = req.user.id;

    try {
        const listings = await fetchMyListings(pool, {owner_id});
        res.json(listings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "not found in db listings"});
    }
};

async function deleteListing(req, res) {
    const pool = req.pool;
    const owner_id = req.user.id;
    const {listingId} = req.params;

    try {
        const result = await removeListing(pool, {owner_id, listingId})

        if ( result.rowCount == 0 ) {
            return res.status(404).json({ error: "fault in fetching , doesnt exist "});
        }

        res.status(200).json( "message: Deleted successfully ");
    } catch ( err ) { 
        console.error("not working properly");
        res.status(500).json({error: "not working in db/back "});
    }
};

module.exports = { 
    editListing,
    uploadListing,
    showListings,
    showMyListings,
    deleteListing
};