const pool = require("../index");
const pdfService = require("../services/pdfService");

// ✅ Get all prescriptions for a patient
exports.getPrescriptionsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { startDate, endDate } = req.query;

    let query = `
      SELECT p.id, p.created_at AS dateUploaded,
             CONCAT(u.first_name, ' ', u.last_name) AS doctor
      FROM prescriptions p
      JOIN users u ON p.userID = u.userID
      WHERE p.patientID = ?
    `;
    let params = [patientId];

    if (startDate && endDate) {
      query += " AND DATE(p.created_at) BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }

    query += " ORDER BY p.created_at DESC";

    const [rows] = await pool.query(query, params);

    res.json(rows);
  } catch (error) {
    console.error("Error fetching prescriptions:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Get prescription details
exports.getPrescriptionDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const [prescriptions] = await pool.query(
      `SELECT p.*, 
              CONCAT(u.first_name, ' ', u.last_name) AS doctor,
              u.specialization
       FROM prescriptions p
       JOIN users u ON p.userID = u.userID
       WHERE p.id = ?`,
      [id]
    );

    if (prescriptions.length === 0) {
      return res.status(404).json({ error: "Prescription not found" });
    }

    const [medicines] = await pool.query(
      `SELECT m.name, pm.dosage, pm.frequency, pm.duration, pm.instructions
       FROM prescription_medicine pm
       JOIN medicines m ON pm.medicine_id = m.id
       WHERE pm.prescription_id = ?`,
      [id]
    );

    res.json({
      ...prescriptions[0],
      medicines,
    });
  } catch (error) {
    console.error("Error fetching prescription details:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Generate PDF for prescription
exports.getPrescriptionPDF = async (req, res) => {
  try {
    const { id } = req.params;

    const [prescriptions] = await pool.query(
      `SELECT p.*, 
              CONCAT(u.first_name, ' ', u.last_name) AS doctor,
              u.specialization
       FROM prescriptions p
       JOIN users u ON p.userID = u.userID
       WHERE p.id = ?`,
      [id]
    );

    if (prescriptions.length === 0) {
      return res.status(404).json({ error: "Prescription not found" });
    }

    const [medicines] = await pool.query(
      `SELECT m.name, pm.dosage, pm.frequency, pm.duration, pm.instructions
       FROM prescription_medicine pm
       JOIN medicines m ON pm.medicine_id = m.id
       WHERE pm.prescription_id = ?`,
      [id]
    );

    const pdfBuffer = await pdfService.generatePrescriptionPDF(
      prescriptions[0],
      medicines
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=prescription_${id}.pdf`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.downloadPrescriptionPDF = async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    
    // Fetch prescription and medicines data from database
    const prescription = await getPrescriptionById(prescriptionId);
    const medicines = await getMedicinesByPrescription(prescriptionId);
    
    // Generate PDF
    const pdfBuffer = await pdfService.generatePrescriptionPDF(prescription, medicines);
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="prescription-${prescriptionId}.pdf"`);
    
    // Send PDF
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('PDF Generation Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate PDF' 
    });
  }
};