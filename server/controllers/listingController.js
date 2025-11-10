const { updateListing, addListing } = require('../models/listingModels.js');

async function editListing(req, res) {
    const pool = req.pool;
    const { id, title, description, price } = req.body;
    const photoPath = req.file ? req.file.location : null;

    try { 
        await updateListing(pool, { 
            id, 
            ownerId: req.user.id,
            title,
            description,
            price,
            photo: photoPath
        });
        res.status(200).json({ message: 'Listing updated successfully' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to update listing' });
    }
};

async function uploadListing(req, res) {
    const pool = req.pool;
    const {title, description, price} = req.body;
    const photoPath = req.file ? req.file.location : null;

    try {
        await addListing(pool,{
            ownerId: req.user.id,
            title,
            description,
            price,
            photo: photoPath
        });
        res.status(200).json("workd fine");
    } catch ( err ){
        console.error(err);
        res.status(500).json({ error: " failed to add it "});
    }
};

module.exports = { editListing, uploadListing };