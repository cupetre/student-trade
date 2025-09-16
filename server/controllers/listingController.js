const { updateListing } = require('../models/listingModels.js');

async function editListing(req, res) {
    const pool = req.pool;
    const { id, title, description, price } = req.body;
    const photoPath = req.file ? `/uploads/listings/${req.file.filename}` : null;

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

module.exports = { editListing };