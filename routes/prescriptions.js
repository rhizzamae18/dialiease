const express = require("express");
const router = express.Router();
const prescriptionsController = require("../controllers/prescriptionsController");

// More specific routes first
router.get("/details/:id", prescriptionsController.getPrescriptionDetails);
router.get("/:id/pdf", prescriptionsController.getPrescriptionPDF);

// Generic catch-all last
router.get("/:patientId", prescriptionsController.getPrescriptionsByPatient);


module.exports = router;
