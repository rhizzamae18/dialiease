const express = require("express");
const router = express.Router();
const pool = require("../index.js"); // kung naka-separate ka ng db connection

router.get("/:userID", async (req, res) => {
  const { userID } = req.params;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM prescriptions WHERE userID = ? ORDER BY created_at DESC LIMIT 1",
      [userID]
    );
    if (rows.length === 0) {
      return res.json({ success: false, message: "No prescription found" });
    }
    res.json({ success: true, prescription: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
