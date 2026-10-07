const { updateListing, 
    addListing, 
    viewListings, 
    fetchMyListings,
    removeListing
 } = require('../models/listingModels.js');

async function editListing(req, res) {
    const { id, title, description, price, date } = req.body;
    const photoPath = req.file ? req.file.location : null;

    try { 
        await updateListing({ 
            id, 
            owner_id: req.user.id,
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
    const {title, description, price, date} = req.body;
    const photoPath = req.file ? req.file.location : null;

    try {
        await addListing({
            owner_id: req.user.id,
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
    const owner_id = req.user.id;

    try {
        const listings = await viewListings({ owner_id });
        res.json(listings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "failed loading listings "});
    }
};

async function showMyListings(req, res) {
    const owner_id = req.user.id;

    try {
        const listings = await fetchMyListings({owner_id});
        res.json(listings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "not found in db listings"});
    }
};

async function deleteListing(req, res) {
    const owner_id = req.user.id;
    const {listingId} = req.params;

    try {
        const result = await removeListing({ id: listingId, owner_id })

        if ( result.count === 0 ) {
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
