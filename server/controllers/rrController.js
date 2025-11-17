const { addReport, addReview } = require('../models/rrModels.js');

async function submitReport(req, res) {
    const pool = req.pool;
    const reporter_id = req.user.id;
    const { reported_id, item_id, description } = req.body;

    try { 
        await addReport(pool , {reporter_id, reported_id, item_id, description });
        
        res.status(200).json({ message: "successfully submitted report"});
    } catch(err) {
        console.error(err);
        res.status(500).json({error: "report not handled correclty in backend"});
    }
};

async function submitReview(req, res) {
    const pool = req.pool;
    const user1_id = req.user.id;
    const { user2_id, rating, description } = req.body;

    try { 
        await addReview(pool, { user1_id, user2_id, rating, description});

        res.status(200).json({ message: " info sent , controller is fine " });
    } catch (err) { 
        console.error("something doesnt work in backend");
    }
};

module.exports = { 
    submitReport,
    submitReview
}