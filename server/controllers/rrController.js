const { addReport } = require('../models/rrModels.js');

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

module.exports = { 
    submitReport
}