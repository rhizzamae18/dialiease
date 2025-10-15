const express = require("express");
const router = express.Router();
const pool = require("../index");

// START treatment
router.post("/start", async (req, res) => {
  const { patientID } = req.body;
  try {
    // create IN record
    const [inResult] = await pool.query(
      "INSERT INTO insolution (InStarted) VALUES (NOW())"
    );
    const inID = inResult.insertId;

    // create treatment record
    const [treatResult] = await pool.query(
      "INSERT INTO treatment (patientID, IN_ID, TreatmentStatus, treatmentDate) VALUES (?, ?, 'ongoing', NOW())",
      [patientID, inID]
    );

    res.json({
      success: true,
      treatmentID: treatResult.insertId,
      inID,
    });
  } catch (err) {
    console.error("Start treatment error:", err);
    res
      .status(500)
      .json({ success: false, message: "Error starting treatment" });
  }
});

// FINISH treatment
router.post("/finish", async (req, res) => {
  const { treatmentID, volumeIn, dialysate, dwell, volumeOut, color, notes } =
    req.body;
  try {
    // get treatment info
    const [[treatment]] = await pool.query(
      "SELECT IN_ID, OUT_ID FROM treatment WHERE treatmentID = ?",
      [treatmentID]
    );
    if (!treatment) {
      return res
        .status(404)
        .json({ success: false, message: "Treatment not found" });
    }

    // finish IN
    await pool.query(
      "UPDATE insolution SET InFinished = NOW(), VolumeIn=?, Dialysate=?, Dwell=? WHERE IN_ID=?",
      [volumeIn, dialysate, dwell, treatment.IN_ID]
    );

    // create OUT
    const [outResult] = await pool.query(
      "INSERT INTO outsolution (DrainStarted, DrainFinished, VolumeOut, Color, Notes) VALUES (NOW(), NOW(), ?, ?, ?)",
      [volumeOut, color, notes]
    );
    const outID = outResult.insertId;

    // update treatment link + status
    await pool.query(
      "UPDATE treatment SET OUT_ID=?, TreatmentStatus='completed' WHERE treatmentID=?",
      [outID, treatmentID]
    );

    res.json({ success: true, treatmentID });
  } catch (err) {
    console.error("Finish treatment error:", err);
    res
      .status(500)
      .json({ success: false, message: "Error finishing treatment" });
  }
});

module.exports = router;
