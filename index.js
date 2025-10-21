require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = 3000;

// Middleware - Enhanced CORS configuration
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// MySQL connection pool
const pool = mysql.createPool({
  host: "34.124.232.176",
  user: "instance1",
  password: "CAPDpass123!",
  database: "capd",
  waitForConnections: true,
  connectionLimit: 10,
  // host: "localhost",
  // user: "root",
  // password: "",
  // database: "capd",
  // waitForConnections: true,
  // connectionLimit: 10,
});

// Test route
app.get("/", (req, res) => {
  res.json({ message: "Backend is up and running!" });
});

app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS result");
    res.json({ success: true, result: rows[0].result });
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug endpoint to check server connectivity
app.get("/api/debug", (req, res) => {
  console.log("Debug endpoint hit");
  res.json({
    success: true,
    message: "Server is reachable",
    timestamp: new Date().toISOString(),
  });
});

// Debug endpoint to check what user IDs exist in the database
app.get("/api/debug/users", async (req, res) => {
  try {
    const [users] = await pool.query(
      "SELECT userID, first_name, last_name, email FROM users LIMIT 10"
    );

    res.json({
      success: true,
      users: users,
      message: `Found ${users.length} users in database`,
    });
  } catch (err) {
    console.error("Debug users error:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});

// Login endpoint
// Login endpoint
// Login endpoint
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  try {
    const [users] = await pool.query(
      "SELECT userID, first_name, email, password, userLevel FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = users[0];
    const userLevel = user.userLevel?.trim().toLowerCase();

    if (userLevel === "admin") {
      return res.json({
        success: false,
        message: "You can't access this account here",
      });
    }

    const hash = user.password.replace(/^\$2y/, "$2a");
    const isMatch = await bcrypt.compare(password, hash);

    if (!isMatch) {
      return res.json({
        success: false,
        message: "Invalid email or password",
      });
    }

    res.json({
      success: true,
      user: {
        id: user.userID,
        first_name: user.first_name,
        email: user.email,
        level: userLevel,
      },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});
// Check if user needs to complete registration
app.post("/api/check-registration-status", async (req, res) => {
  const { email } = req.body;

  try {
    // Get user and patient info
    const [users] = await pool.query(
      `SELECT u.userID, u.first_name, u.email, u.userLevel, p.AccStatus, p.TermsAndCondition 
       FROM users u 
       LEFT JOIN patients p ON u.userID = p.userID 
       WHERE u.email = ?`,
      [email]
    );

    if (users.length === 0) {
      return res.json({
        success: false,
        message: "User not found",
      });
    }

    const user = users[0];

    res.json({
      success: true,
      user: {
        id: user.userID,
        first_name: user.first_name,
        email: user.email,
        level: user.userLevel,
        AccStatus: user.AccStatus,
        TermsAndCondition: user.TermsAndCondition,
      },
    });
  } catch (err) {
    console.error("Registration status error:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});

// Complete registration with terms acceptance and password update
app.post("/api/complete-registration", async (req, res) => {
  const { userId, password, acceptTerms } = req.body;

  try {
    // Validate password complexity
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.json({
        success: false,
        message:
          "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character",
      });
    }

    if (!acceptTerms) {
      return res.json({
        success: false,
        message: "You must accept the terms and conditions",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password and patient status
    await pool.query("UPDATE users SET password = ? WHERE userID = ?", [
      hashedPassword,
      userId,
    ]);

    await pool.query(
      "UPDATE patients SET AccStatus = 'active', TermsAndCondition = 'Accepted' WHERE userID = ?",
      [userId]
    );

    res.json({
      success: true,
      message: "Registration completed successfully",
    });
  } catch (err) {
    console.error("Complete registration error:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});
// Check if user needs to complete registration
app.post("/api/check-registration-status", async (req, res) => {
  const { email } = req.body;

  try {
    // Get user and patient info
    const [users] = await pool.query(
      `SELECT u.userID, u.first_name, u.email, u.userLevel, p.AccStatus, p.TermsAndCondition 
       FROM users u 
       LEFT JOIN patients p ON u.userID = p.userID 
       WHERE u.email = ?`,
      [email]
    );

    if (users.length === 0) {
      return res.json({
        success: false,
        message: "User not found",
      });
    }

    const user = users[0];

    res.json({
      success: true,
      user: {
        id: user.userID,
        first_name: user.first_name,
        email: user.email,
        level: user.userLevel,
        AccStatus: user.AccStatus,
        TermsAndCondition: user.TermsAndCondition,
      },
    });
  } catch (err) {
    console.error("Registration status error:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});

// Complete registration with terms acceptance and password update
app.post("/api/complete-registration", async (req, res) => {
  const { userId, password, acceptTerms } = req.body;

  try {
    // Validate password complexity
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.json({
        success: false,
        message:
          "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character",
      });
    }

    if (!acceptTerms) {
      return res.json({
        success: false,
        message: "You must accept the terms and conditions",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password and patient status
    await pool.query("UPDATE users SET password = ? WHERE userID = ?", [
      hashedPassword,
      userId,
    ]);

    await pool.query(
      "UPDATE patients SET AccStatus = 'active', TermsAndCondition = 'Accepted' WHERE userID = ?",
      [userId]
    );

    res.json({
      success: true,
      message: "Registration completed successfully",
    });
  } catch (err) {
    console.error("Complete registration error:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});
// Get user profile by ID
app.get("/api/user/:id", async (req, res) => {
  const { id } = req.params;
  console.log(`Fetching profile for user ID: ${id}`);

  try {
    const [users] = await pool.query(
      `SELECT userID, first_name, middle_name, last_name, email, date_of_birth, 
              phone_number, profile_image, EmpAddress, created_at, userLevel
       FROM users WHERE userID = ?`,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = users[0];

    let age = null;
    if (user.date_of_birth) {
      const birthDate = new Date(user.date_of_birth);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }
    }

    let fullName = user.first_name || "";
    if (user.middle_name) fullName += ` ${user.middle_name}`;
    if (user.last_name) fullName += ` ${user.last_name}`;

    res.json({
      success: true,
      user: {
        id: user.userID,
        fullName,
        email: user.email,
        age,
        address: user.EmpAddress || "Address not provided",
        imageUrl:
          user.profile_image ||
          "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y",
        createdAt: user.created_at,
        phoneNumber: user.phone_number,
        userLevel: user.userLevel,
      },
    });
  } catch (err) {
    console.error("User profile error:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});

// Fetch latest prescription for a user
app.get("/api/prescriptions/:userID", async (req, res) => {
  const { userID } = req.params;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM prescriptions WHERE userID = ? ORDER BY created_at DESC LIMIT 1",
      [userID]
    );

    if (rows.length === 0) {
      return res.json({ success: false, message: "No prescription found" });
    }

    res.json({
      success: true,
      prescription: rows[0],
    });
  } catch (error) {
    console.error("Prescription fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching prescription",
      error: error.message,
    });
  }
});

// Schedule endpoint
app.get("/api/schedule/:userId", async (req, res) => {
  const userId = req.params.userId;
  console.log(`Schedule request for user: ${userId}`);

  try {
    const query = `
      SELECT s.*, u.first_name, u.last_name, u.phone_number
      FROM schedule s
      JOIN users u ON s.userID = u.userID
      WHERE s.userID = ? 
      ORDER BY s.appointment_date DESC
      LIMIT 1
    `;

    console.log("Executing query:", query);
    const [results] = await pool.query(query, [userId]);
    console.log("Query results:", results);

    if (results.length === 0) {
      console.log("No appointments found for user:", userId);
      return res.status(404).json({
        success: false,
        message: "No upcoming appointments",
      });
    }

    console.log("Sending schedule data:", results[0]);
    res.json({
      success: true,
      schedule: results[0],
    });
  } catch (err) {
    console.error("Database error in schedule endpoint:", err);
    res.status(500).json({
      success: false,
      error: "Database error",
      message: err.message,
    });
  }
});

// Add this endpoint to your backend (before app.listen)
app.put("/api/schedule/confirm/:userId", async (req, res) => {
  const userId = req.params.userId;
  console.log(`Confirming appointment for user: ${userId}`);

  try {
    // Update the confirmation status to 'Confirmed'
    const [result] = await pool.query(
      "UPDATE schedule SET confirmation_status = 'confirmed' WHERE userID = ? AND confirmation_status = 'Pending' ORDER BY appointment_date DESC LIMIT 1",
      [userId]
    );

    if (result.affectedRows === 0) {
      console.log("No pending appointment found for user:", userId);
      return res.status(404).json({
        success: false,
        message: "No pending appointment found to confirm",
      });
    }

    console.log("Appointment confirmed successfully for user:", userId);
    res.json({
      success: true,
      message:
        " Check-up Schedule Confirmed Successfully!\n\n Reminder: Please do not forget to bring all necessary items for your check-up.\n\n Paalala: Huwag kalimutan dalhin ang lahat ng kinakailangang gamit para sa iyong check-up.",
    });
  } catch (err) {
    console.error("Error confirming appointment:", err);
    res.status(500).json({
      success: false,
      error: "Database error",
      message: err.message,
    });
  }
});

// Add this endpoint to your backend
// Fix the SQL syntax error - remove the extra comma
app.put("/api/schedule/reschedule/:userId", async (req, res) => {
  const userId = req.params.userId;
  const { reason } = req.body;

  console.log(`Reschedule request for user: ${userId}, reason: ${reason}`);

  try {
    // First, get the latest schedule for the user
    const [scheduleResults] = await pool.query(
      "SELECT * FROM schedule WHERE userID = ? ORDER BY appointment_date DESC LIMIT 1",
      [userId]
    );

    if (scheduleResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No schedule found for this user",
      });
    }

    const schedule = scheduleResults[0];

    // Update the schedule with reschedule request - REMOVED THE EXTRA COMMA
    const [result] = await pool.query(
      `UPDATE schedule 
       SET reschedule_requested_date = NOW(), 
           reschedule_reason = ?,
           reschedule_request_date = NOW()
       WHERE userID = ? AND schedule_id = ?`,
      [reason, userId, schedule.schedule_id]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({
        success: false,
        message: "Failed to update schedule",
      });
    }

    console.log("Reschedule request submitted for user:", userId);
    res.json({
      success: true,
      message: "Reschedule request submitted successfully",
    });
  } catch (err) {
    console.error("Error processing reschedule request:", err);
    res.status(500).json({
      success: false,
      error: "Database error",
      message: err.message,
    });
  }
});

// Fixed: Treatments for today
app.get("/api/treatments/today/:userID", async (req, res) => {
  const { userID } = req.params;
  console.log(`Fetching today's treatments for user: ${userID}`);

  try {
    // First, get the patient ID for this user
    const [patientRows] = await pool.query(
      `SELECT patientID FROM patients WHERE userID = ?`,
      [userID]
    );

    if (patientRows.length === 0) {
      return res.json({
        success: true,
        completed: 0,
        total: 0,
        message: "No patient found for this user",
      });
    }

    const patientID = patientRows[0].patientID;
    console.log(`Found patient ID: ${patientID}`);

    // Count completed treatments for today
    const [completedRows] = await pool.query(
      `SELECT COUNT(*) AS completed
       FROM treatment 
       WHERE patientID = ?
         AND DATE(treatmentDate) = CURDATE()
         AND TreatmentStatus = 'completed'`,
      [patientID]
    );

    // Get total exchanges needed today from latest prescription
    const [totalRows] = await pool.query(
      `SELECT pd_total_exchanges as total
       FROM prescriptions 
       WHERE patientID = ? 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [patientID]
    );

    const completed = completedRows[0]?.completed || 0;
    const total = totalRows[0]?.total || 0;

    console.log(
      `Today's treatments - Completed: ${completed}, Total: ${total}`
    );

    res.json({
      success: true,
      completed: completed,
      total: total,
    });
  } catch (error) {
    console.error("Error fetching treatments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch treatment data",
      error: error.message,
    });
  }
});

// Get treatment history by userID
app.get("/api/treatments/history/:userID", async (req, res) => {
  const { userID } = req.params;

  try {
    const query = `
      SELECT 
        t.Treatment_ID,
        t.treatmentDate,
        t.Balances,
        t.bagSerialNumber,
        t.TreatmentStatus,
        i.InStarted,
        i.InFinished,
        i.VolumeIn,
        i.Dialysate,
        o.DrainStarted,
        o.DrainFinished,
        o.VolumeOut,
        o.Color,
        o.Notes
      FROM treatment t
      JOIN patients p ON t.patientID = p.patientID
      LEFT JOIN insolution i ON t.IN_ID = i.IN_ID
      LEFT JOIN outsolution o ON t.OUT_ID = o.OUT_ID
      WHERE p.userID = ?
      ORDER BY t.treatmentDate ASC, t.Treatment_ID ASC 
    `;

    const [rows] = await pool.query(query, [userID]);

    if (rows.length === 0) {
      return res.json({
        success: true,
        treatments: [],
        message: "No treatment history found",
      });
    }

    // Helper function to format time
    const formatTime = (timeValue) => {
      if (!timeValue) return null;

      const time = new Date(timeValue);
      if (isNaN(time.getTime())) return null;

      return time.toLocaleTimeString("en-US", {
        hour12: true,
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    // Group treatments by date
    const treatmentsByDate = {};
    rows.forEach((row) => {
      const date = new Date(row.treatmentDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });

      if (!treatmentsByDate[date]) {
        treatmentsByDate[date] = {
          date: date,
          totalBalance: 0,
          sessions: [],
        };
      }

      const balance = parseFloat(row.Balances) || 0;

      treatmentsByDate[date].sessions.push({
        no: treatmentsByDate[date].sessions.length + 1,
        balance: balance,
        serialNo: row.bagSerialNumber,
        timeStartedIn: formatTime(row.InStarted),
        timeCompletedIn: formatTime(row.InFinished),
        volumeIn: row.VolumeIn,
        dialysate: row.Dialysate,
        timeStartedOut: formatTime(row.DrainStarted),
        timeCompletedOut: formatTime(row.DrainFinished),
        volumeOut: row.VolumeOut,
        color: row.Color,
        notes: row.Notes,
        status: row.TreatmentStatus,
        remarks: balance <= 0 ? "Good PD exchange" : "Possible Fluid retention",
      });

      treatmentsByDate[date].totalBalance += balance;
    });

    const formattedTreatments = Object.values(treatmentsByDate)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((dateGroup) => {
        dateGroup.sessions.forEach((session, index) => {
          session.no = index + 1;
        });
        return dateGroup;
      });

    res.json({
      success: true,
      treatments: formattedTreatments,
    });
  } catch (error) {
    console.error("Error fetching treatment history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch treatment history",
      error: error.message,
    });
  }
});

// Queue endpoint - Get queue number
// Get queue number with date validation
app.post("/api/queue", async (req, res) => {
  const { userId, appointmentDate } = req.body;

  try {
    // Check if today is the appointment date
    const today = new Date();
    const appointment = new Date(appointmentDate);

    const isAppointmentDate =
      today.getFullYear() === appointment.getFullYear() &&
      today.getMonth() === appointment.getMonth() &&
      today.getDate() === appointment.getDate();

    if (!isAppointmentDate) {
      return res.status(400).json({
        success: false,
        message: "Queue numbers are only available on the appointment date",
      });
    }

    // Check if checkup is already Completed
    const [scheduleCheck] = await pool.query(
      `SELECT checkup_status FROM schedule 
       WHERE userID = ? AND DATE(appointment_date) = ?`,
      [userId, today.toISOString().split("T")[0]]
    );

    if (
      scheduleCheck.length > 0 &&
      scheduleCheck[0].checkup_status === "completed"
    ) {
      return res.status(400).json({
        success: false,
        message: "Checkup already completed for today",
      });
    }

    // Check if user already has a queue number for today (return queue status)
    const [existingQueue] = await pool.query(
      `SELECT queue_number, status FROM queue 
       WHERE userID = ? AND DATE(created_at) = ?`,
      [userId, today.toISOString().split("T")[0]]
    );

    if (existingQueue.length > 0) {
      return res.json({
        success: true,
        queueNumber: existingQueue[0].queue_number,
        queueStatus: existingQueue[0].status, // Return queue status
        message: "You already have a queue number for today",
      });
    }

    // Get the next queue number
    const [maxQueue] = await pool.query(
      `SELECT MAX(queue_number) as max_queue FROM queue 
       WHERE DATE(created_at) = ?`,
      [today.toISOString().split("T")[0]]
    );

    const nextQueueNumber = (maxQueue[0].max_queue || 0) + 1;

    // Insert new queue entry
    await pool.query(
      `INSERT INTO queue (userID, queue_number, appointment_date, status) 
       VALUES (?, ?, ?, 'waiting')`,
      [userId, nextQueueNumber, appointmentDate]
    );

    res.json({
      success: true,
      queueNumber: nextQueueNumber,
      queueStatus: "waiting", // Return initial queue status
      message: "Queue number assigned successfully",
    });
  } catch (err) {
    console.error("Queue error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to get queue number",
    });
  }
});
app.get("/api/queue/today", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Get current serving number
    const [currentServing] = await pool.query(
      `SELECT queue_number FROM queue 
       WHERE DATE(created_at) = ? AND status = 'serving' 
       ORDER BY queue_number ASC LIMIT 1`,
      [today]
    );

    // Get waiting queue
    const [waitingQueue] = await pool.query(
      `SELECT queue_number FROM queue 
       WHERE DATE(created_at) = ? AND status = 'waiting' 
       ORDER BY queue_number ASC`,
      [today]
    );

    res.json({
      success: true,
      currentServing: currentServing[0]?.queue_number || 0,
      waitingQueue: waitingQueue.map((item) => item.queue_number),
      averageTime: 15, // You can calculate this based on historical data
    });
  } catch (err) {
    console.error("Queue data error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch queue data",
    });
  }
});

// Get queue number with date validation
app.post("/api/queue", async (req, res) => {
  const { userId, appointmentDate } = req.body;

  try {
    // Check if today is the appointment date
    const today = new Date();
    const appointment = new Date(appointmentDate);

    const isAppointmentDate =
      today.getFullYear() === appointment.getFullYear() &&
      today.getMonth() === appointment.getMonth() &&
      today.getDate() === appointment.getDate();

    if (!isAppointmentDate) {
      return res.status(400).json({
        success: false,
        message: "Queue numbers are only available on the appointment date",
      });
    }

    // Check if user already has a queue number for today
    const [existingQueue] = await pool.query(
      `SELECT queue_number FROM queue 
       WHERE userID = ? AND DATE(created_at) = ?`,
      [userId, today.toISOString().split("T")[0]]
    );

    if (existingQueue.length > 0) {
      return res.json({
        success: true,
        queueNumber: existingQueue[0].queue_number,
        message: "You already have a queue number for today",
      });
    }

    // Get the next queue number
    const [maxQueue] = await pool.query(
      `SELECT MAX(queue_number) as max_queue FROM queue 
       WHERE DATE(created_at) = ?`,
      [today.toISOString().split("T")[0]]
    );

    const nextQueueNumber = (maxQueue[0].max_queue || 0) + 1;

    // Insert new queue entry
    await pool.query(
      `INSERT INTO queue (userID, queue_number, appointment_date, status) 
       VALUES (?, ?, ?, 'waiting')`,
      [userId, nextQueueNumber, appointmentDate]
    );

    res.json({
      success: true,
      queueNumber: nextQueueNumber,
      message: "Queue number assigned successfully",
    });
  } catch (err) {
    console.error("Queue error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to get queue number",
    });
  }
});
app.get("/api/queue/current", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const [currentNumbers] = await pool.query(
      `SELECT queue_number, start_time FROM queue 
       WHERE DATE(created_at) = ? AND status IN ('in-progress', 'waiting')
       ORDER BY queue_number ASC
       LIMIT 5`,
      [today]
    );

    res.json({
      success: true,
      currentNumbers,
    });
  } catch (err) {
    console.error("Current numbers error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to get current numbers",
    });
  }
});
// Check if user already has a queue number for today
// Check if user already has a queue number for today
app.get("/api/queue/check/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const today = new Date().toISOString().split("T")[0];

    // First check if the user has a Completed checkup for today
    const [scheduleCheck] = await pool.query(
      `SELECT checkup_status FROM schedule 
       WHERE userID = ? AND DATE(appointment_date) = ?`,
      [userId, today]
    );

    // If checkup is Completed, don't return queue number
    if (
      scheduleCheck.length > 0 &&
      scheduleCheck[0].checkup_status === "completed"
    ) {
      return res.json({
        success: true,
        hasQueue: false,
        queueNumber: null,
        checkupCompleted: true,
      });
    }

    // Check for existing queue and return queue status
    const [existingQueue] = await pool.query(
      `SELECT queue_number, status FROM queue 
       WHERE userID = ? AND DATE(created_at) = ?`,
      [userId, today]
    );

    if (existingQueue.length > 0) {
      return res.json({
        success: true,
        hasQueue: true,
        queueNumber: existingQueue[0].queue_number,
        queueStatus: existingQueue[0].status, // Return queue status
        checkupCompleted: false,
      });
    }

    res.json({
      success: true,
      hasQueue: false,
      queueNumber: null,
      checkupCompleted: false,
    });
  } catch (err) {
    console.error("Queue check error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to check queue status",
    });
  }
});
// Update queue status when check-up is Completed

app.put("/api/queue/complete/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const today = new Date().toISOString().split("T")[0];

    // Update queue status to completed
    const [result] = await pool.query(
      `UPDATE queue 
       SET status = 'completed' 
       WHERE userID = ? AND DATE(created_at) = ?`,
      [userId, today]
    );

    // Also update the schedule to mark checkup as Completed
    await pool.query(
      `UPDATE schedule 
       SET checkup_status = 'completed' 
       WHERE userID = ? AND DATE(appointment_date) = ?`,
      [userId, today]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "No active queue found for today",
      });
    }

    res.json({
      success: true,
      message:
        "Queue status updated to completed and checkup marked as Completed",
    });
  } catch (err) {
    console.error("Error completing queue:", err);
    res.status(500).json({
      success: false,
      error: "Database error",
      message: err.message,
    });
  }
});
// Get check-up details including remarks and new appointment date
app.get("/api/checkup-details/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const query = `
      SELECT s.*, u.first_name, u.last_name, q.queue_number
      FROM schedule s
      JOIN users u ON s.userID = u.userID
      LEFT JOIN queue q ON s.userID = q.userID AND DATE(q.created_at) = DATE(s.appointment_date)
      WHERE s.userID = ? 
      ORDER BY s.appointment_date DESC
      LIMIT 1
    `;

    const [results] = await pool.query(query, [userId]);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No check-up details found",
      });
    }

    res.json({
      success: true,
      checkupDetails: results[0],
    });
  } catch (err) {
    console.error("Database error in checkup details endpoint:", err);
    res.status(500).json({
      success: false,
      error: "Database error",
      message: err.message,
    });
  }
});
// Get rescheduled appointments for notifications
app.get(
  "/api/notifications/rescheduled-appointments/:userId",
  async (req, res) => {
    const { userId } = req.params;

    try {
      // Get recently rescheduled appointments (within the last 7 days)
      const [rescheduledAppointments] = await pool.query(
        `SELECT 
        queuing_ID, 
        appointment_date,
        new_appointment_date,
        reschedule_request_date,
        reschedule_reason,
        patient_id,
        confirmation_status
       FROM schedule 
       WHERE userID = ? 
         AND reschedule_requested_date IS NOT NULL
         AND new_appointment_date IS NOT NULL
         AND reschedule_request_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
         AND confirmation_status = 'confirmed'
       ORDER BY reschedule_request_date DESC`,
        [userId]
      );

      console.log(
        `Found ${rescheduledAppointments.length} rescheduled appointments for user ${userId}`
      );

      res.json({
        success: true,
        rescheduledAppointments: rescheduledAppointments,
      });
    } catch (error) {
      console.error("Error fetching rescheduled appointments:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch rescheduled appointments",
        error: error.message,
      });
    }
  }
);
// Get recently rescheduled appointments (for real-time detection)
app.get("/api/notifications/recent-reschedules/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Get appointments rescheduled in the last hour
    const [recentReschedules] = await pool.query(
      `SELECT 
        queuing_ID, 
        appointment_date,
        new_appointment_date,
        reschedule_request_date,
        patient_id
       FROM schedule 
       WHERE userID = ? 
         AND reschedule_requested_date IS NOT NULL
         AND new_appointment_date IS NOT NULL
         AND reschedule_request_date >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
         AND confirmation_status = 'confirmed'
       ORDER BY reschedule_request_date DESC`,
      [userId]
    );

    res.json({
      success: true,
      recentReschedules: recentReschedules,
    });
  } catch (error) {
    console.error("Error fetching recent reschedules:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch recent reschedules",
    });
  }
});
app.get("/api/notifications/appointments/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Get appointments for today and the next 3 days
    const [appointments] = await pool.query(
      `SELECT 
        queuing_ID, 
        appointment_date,
        patient_id, 
        confirmation_status,
        checkup_status
       FROM schedule 
       WHERE userID = ? 
         AND DATE(appointment_date) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)
         AND confirmation_status = 'confirmed'
         AND checkup_status = 'Pending'
       ORDER BY appointment_date ASC`,
      [userId]
    );

    console.log(
      `Found ${appointments.length} upcoming appointments for user ${userId}`
    );

    // Log detailed appointment info for debugging
    appointments.forEach((apt) => {
      const aptDate = new Date(apt.appointment_date);
      const today = new Date();
      const daysDiff = Math.ceil((aptDate - today) / (1000 * 3600 * 24));

      console.log(`Appointment ${apt.queuing_ID}:`, {
        appointment_date: apt.appointment_date,
        days_from_today: daysDiff,
        status: apt.checkup_status,
        confirmation: apt.confirmation_status,
      });
    });

    res.json({
      success: true,
      appointments: appointments,
    });
  } catch (error) {
    console.error("Error fetching appointments for notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch appointments",
      error: error.message,
    });
  }
});
// Get missed appointments for notifications - FIXED VERSION
app.get("/api/notifications/missed-appointments/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Get ALL missed appointments (not just the latest)
    const [missedAppointments] = await pool.query(
      `SELECT queuing_ID, appointment_date, patient_id, checkup_status 
       FROM schedule 
       WHERE userID = ? 
         AND DATE(appointment_date) < CURDATE()
         AND checkup_status = 'pending'
         AND confirmation_status = 'confirmed'
       ORDER BY appointment_date DESC`,
      [userId]
    );

    console.log("Missed appointments found:", missedAppointments.length);
    console.log("Missed appointment details:", missedAppointments);

    res.json({
      success: true,
      missedAppointments: missedAppointments,
    });
  } catch (error) {
    console.error("Error fetching missed appointments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch missed appointments",
      error: error.message,
    });
  }
});
// Add this to your backend (Node.js/Express)
app.post("/api/users/push-token", async (req, res) => {
  const { userId, pushToken } = req.body;

  try {
    // Save the push token to your database associated with the user
    await pool.query("UPDATE users SET push_token = ? WHERE userID = ?", [
      pushToken,
      userId,
    ]);

    res.json({
      success: true,
      message: "Push token saved successfully",
    });
  } catch (error) {
    console.error("Error saving push token:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save push token",
    });
  }
});
// Get patient status by user ID
app.get("/api/patients/status/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Get patient's situationStatus from patients table
    const [patients] = await pool.query(
      `SELECT p.situationStatus 
       FROM patients p 
       WHERE p.userID = ?`,
      [userId]
    );

    if (patients.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    res.json({
      success: true,
      status: patients[0].situationStatus || "AtHome",
    });
  } catch (error) {
    console.error("Error fetching patient status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch patient status",
      error: error.message,
    });
  }
});

// Update patient status
app.put("/api/patients/status/:userId", async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;

  // Validate status
  const validStatuses = ["AtHome", "InEmergency", "WaitToResponse"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid status. Must be one of: AtHome, InEmergency, WaitToResponse",
    });
  }

  try {
    // Update patient's situationStatus
    const [result] = await pool.query(
      `UPDATE patients 
       SET situationStatus = ? 
       WHERE userID = ?`,
      [status, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    res.json({
      success: true,
      message: "Status updated successfully",
    });
  } catch (error) {
    console.error("Error updating patient status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update patient status",
      error: error.message,
    });
  }
});

// Check if all treatment balances are positive for a user
app.get("/api/treatments/balance/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Get treatments for the current month
    const [treatments] = await pool.query(
      `SELECT t.Balances, t.treatmentDate, t.TreatmentStatus
       FROM treatment t
       JOIN patients p ON t.patientID = p.patientID
       WHERE p.userID = ? 
         AND YEAR(t.treatmentDate) = YEAR(CURDATE())
         AND MONTH(t.treatmentDate) = MONTH(CURDATE())
         AND t.TreatmentStatus = 'completed'
       ORDER BY t.treatmentDate DESC`,
      [userId]
    );

    if (treatments.length === 0) {
      return res.json({
        success: true,
        allPositive: false,
        monthlyStats: {
          totalTreatments: 0,
          positiveBalanceCount: 0,
          negativeBalanceCount: 0,
          zeroBalanceCount: 0,
          averageBalance: 0,
          positivePercentage: 0,
        },
        message: "No treatments found for this month",
      });
    }

    // Calculate monthly statistics
    let positiveBalanceCount = 0;
    let negativeBalanceCount = 0;
    let zeroBalanceCount = 0;
    let totalBalance = 0;

    treatments.forEach((treatment) => {
      const balance = parseFloat(treatment.Balances);

      if (!isNaN(balance)) {
        totalBalance += balance;

        if (balance > 0) {
          positiveBalanceCount++;
        } else if (balance < 0) {
          negativeBalanceCount++;
        } else {
          zeroBalanceCount++;
        }
      }
    });

    const totalTreatments = treatments.length;
    const averageBalance =
      totalTreatments > 0 ? totalBalance / totalTreatments : 0;
    const positivePercentage =
      totalTreatments > 0 ? (positiveBalanceCount / totalTreatments) * 100 : 0;

    // Check if majority of treatments have positive balance (more than 50%)
    const majorityPositive = positivePercentage > 50;

    res.json({
      success: true,
      allPositive: majorityPositive,
      monthlyStats: {
        totalTreatments: totalTreatments,
        positiveBalanceCount: positiveBalanceCount,
        negativeBalanceCount: negativeBalanceCount,
        zeroBalanceCount: zeroBalanceCount,
        averageBalance: parseFloat(averageBalance.toFixed(2)),
        positivePercentage: parseFloat(positivePercentage.toFixed(2)),
      },
      treatments: treatments.slice(0, 10), // Return last 10 treatments for reference
    });
  } catch (error) {
    console.error("Error checking treatment balances:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check treatment balances",
      error: error.message,
    });
  }
});
// Save push token for notifications
app.post("/api/users/push-token", async (req, res) => {
  const { userId, pushToken } = req.body;

  try {
    await pool.query("UPDATE users SET push_token = ? WHERE userID = ?", [
      pushToken,
      userId,
    ]);

    res.json({
      success: true,
      message: "Push token saved successfully",
    });
  } catch (error) {
    console.error("Error saving push token:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save push token",
    });
  }
});

// Get today's treatment reminder information
app.get("/api/notifications/treatment-reminders/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Get today's date in Manila time
    const manilaTime = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Manila",
    });
    const today = new Date(manilaTime).toISOString().split("T")[0];

    // Get patient's latest prescription and today's completed treatments
    const [results] = await pool.query(
      `SELECT 
         p.patientID,
         pr.pd_total_exchanges,
         pr.pd_modality,
         pr.additional_instructions,
         COALESCE(completed_treatments.completed_count, 0) as completed_count,
         DATE(?) as today_date
       FROM patients p
       LEFT JOIN (
         SELECT patientID, created_at,
                ROW_NUMBER() OVER (PARTITION BY patientID ORDER BY created_at DESC) as rn
         FROM prescriptions
       ) latest_pr ON p.patientID = latest_pr.patientID AND latest_pr.rn = 1
       LEFT JOIN prescriptions pr ON latest_pr.patientID = pr.patientID AND latest_pr.created_at = pr.created_at
       LEFT JOIN (
         SELECT patientID, COUNT(*) as completed_count
         FROM treatment
         WHERE DATE(treatmentDate) = DATE(?)
         AND TreatmentStatus = 'completed'
         GROUP BY patientID
       ) completed_treatments ON p.patientID = completed_treatments.patientID
       WHERE p.userID = ?`,
      [today, today, userId]
    );

    if (results.length === 0) {
      return res.json({
        success: true,
        hasPrescription: false,
        message: "No prescription found for patient",
      });
    }

    const data = results[0];
    const totalExchanges = data.pd_total_exchanges || 0;
    const completedCount = data.completed_count || 0;
    const remainingExchanges = totalExchanges - completedCount;

    res.json({
      success: true,
      hasPrescription: true,
      patientID: data.patientID,
      totalExchanges: totalExchanges,
      completedCount: completedCount,
      remainingExchanges: remainingExchanges,
      modality: data.pd_modality,
      instructions: data.additional_instructions,
      todayDate: data.today_date,
    });
  } catch (error) {
    console.error("Error fetching treatment reminders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch treatment reminders",
      error: error.message,
    });
  }
});
// Get latest prescription by patient ID
app.get("/api/prescriptions/latest/:patientID", async (req, res) => {
  const { patientID } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT * FROM prescriptions 
       WHERE patientID = ? 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [patientID]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No prescription found for this patient",
      });
    }

    const prescription = rows[0];

    // Parse JSON fields if they exist
    if (prescription.pd_bag_percentages) {
      try {
        prescription.pd_bag_percentages = JSON.parse(
          prescription.pd_bag_percentages
        );
      } catch (e) {
        console.error("Error parsing pd_bag_percentages:", e);
      }
    }

    if (prescription.pd_bag_counts) {
      try {
        prescription.pd_bag_counts = JSON.parse(prescription.pd_bag_counts);
      } catch (e) {
        console.error("Error parsing pd_bag_counts:", e);
      }
    }

    if (prescription.pd_exchanges) {
      try {
        prescription.pd_exchanges = JSON.parse(prescription.pd_exchanges);
      } catch (e) {
        console.error("Error parsing pd_exchanges:", e);
      }
    }

    res.json({
      success: true,
      prescription: prescription,
    });
  } catch (error) {
    console.error("Prescription fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching prescription",
      error: error.message,
    });
  }
});
// Get latest prescription by user ID (through patient table)
app.get("/api/prescriptions/user/:userID", async (req, res) => {
  const { userID } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT pr.* 
       FROM prescriptions pr
       JOIN patients p ON pr.patientID = p.patientID
       WHERE p.userID = ? 
       ORDER BY pr.created_at DESC 
       LIMIT 1`,
      [userID]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No prescription found for this user",
      });
    }

    const prescription = rows[0];

    console.log("Raw prescription data:", {
      pd_bag_percentages: prescription.pd_bag_percentages,
      pd_bag_counts: prescription.pd_bag_counts,
    });

    // ✅ FIXED: Parse bag percentages properly
    if (prescription.pd_bag_percentages) {
      try {
        if (typeof prescription.pd_bag_percentages === "string") {
          // Remove OUTER quotes first if present
          const noOuterQuotes = prescription.pd_bag_percentages.replace(
            /^"|"$/g,
            ""
          );

          // Remove % symbols, split and parse
          prescription.pd_bag_percentages = noOuterQuotes
            .replace(/%/g, "")
            .trim()
            .split(",")
            .map((item) => parseFloat(item.trim()))
            .filter((num) => !isNaN(num));
        } else if (Array.isArray(prescription.pd_bag_percentages)) {
          prescription.pd_bag_percentages = prescription.pd_bag_percentages.map(
            (p) => parseFloat(p) || 0
          );
        }
      } catch (e) {
        console.error("Error parsing pd_bag_percentages:", e);
        prescription.pd_bag_percentages = [];
      }
    }

    // ✅ FIXED: Parse bag counts properly
    if (prescription.pd_bag_counts) {
      try {
        if (typeof prescription.pd_bag_counts === "string") {
          // Remove OUTER quotes first if present
          const noOuterQuotes = prescription.pd_bag_counts.replace(
            /^"|"$/g,
            ""
          );

          prescription.pd_bag_counts = noOuterQuotes
            .trim()
            .split(",")
            .map((item) => parseInt(item.trim()))
            .filter((num) => !isNaN(num));
        } else if (Array.isArray(prescription.pd_bag_counts)) {
          prescription.pd_bag_counts = prescription.pd_bag_counts.map(
            (c) => parseInt(c) || 0
          );
        }
      } catch (e) {
        console.error("Error parsing pd_bag_counts:", e);
        prescription.pd_bag_counts = [];
      }
    }

    console.log("✅ Parsed prescription:", {
      percentages: prescription.pd_bag_percentages,
      counts: prescription.pd_bag_counts,
    });

    res.json({
      success: true,
      prescription: prescription,
    });
  } catch (error) {
    console.error("Prescription fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching prescription",
      error: error.message,
    });
  }
});

// 🆕 UPDATE THE EXISTING SOLUTION IN ENDPOINT
app.post("/api/treatments/solution-in", async (req, res) => {
  const { patientID, dialysate, volumeIn, dwell, bagSerialNumber } = req.body;

  try {
    // First, create IN solution record with ONLY InStarted
    const [inResult] = await pool.query(
      `INSERT INTO insolution 
       (Dialysate, VolumeIn, Dwell, InStarted, InFinished, bagSerialNumber) 
       VALUES (?, ?, ?, NOW(), NULL, ?)`, // InFinished is NULL initially
      [dialysate, volumeIn, dwell, bagSerialNumber || ""]
    );

    const inId = inResult.insertId;

    // Then create treatment record
    const [treatmentResult] = await pool.query(
      `INSERT INTO treatment 
       (patientID, IN_ID, TreatmentStatus, treatmentDate, Balances, bagSerialNumber, created_at, updated_at) 
       VALUES (?, ?, 'in-progress', CURDATE(), 0, ?, NOW(), NOW())`,
      [patientID, inId, bagSerialNumber || ""]
    );

    res.json({
      success: true,
      message: "Solution In treatment started - waiting for completion",
      treatmentId: treatmentResult.insertId,
      inId: inId,
      // 🆕 Return the IN_ID for later completion update
      needsCompletion: true,
    });
  } catch (error) {
    console.error("Error submitting solution in:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit treatment data",
      error: error.message,
    });
  }
});

// 🆕 CRITICAL: Update InFinished when drainage completes
app.put("/api/treatments/complete-solution-in/:inId", async (req, res) => {
  const { inId } = req.params;
  const { actualVolume } = req.body;

  try {
    // Update InFinished timestamp and actual volume
    const [result] = await pool.query(
      `UPDATE insolution 
       SET InFinished = NOW(), 
           VolumeIn = ?
       WHERE IN_ID = ?`,
      [actualVolume, inId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Solution In record not found",
      });
    }

    console.log(
      `✅ Solution In completed - IN_ID: ${inId}, Volume: ${actualVolume}ml`
    );

    res.json({
      success: true,
      message: "Solution In completed successfully",
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error completing solution in:", error);
    res.status(500).json({
      success: false,
      message: "Failed to complete solution in",
      error: error.message,
    });
  }
});

// 🆕 ENHANCED DRAINAGE COMPLETION ENDPOINT
app.post("/api/iot/drainage-complete", async (req, res) => {
  const { volumeDrained, targetVolume, duration, timestamp, inId } = req.body;

  try {
    console.log(
      `✅ Drainage completed - IN_ID: ${inId}, Volume: ${volumeDrained}ml, Target: ${targetVolume}ml`
    );

    // 🆕 CRITICAL: Update the insolution record with completion data
    if (inId) {
      const [updateResult] = await pool.query(
        `UPDATE insolution 
         SET InFinished = NOW(), 
             VolumeIn = ?
         WHERE IN_ID = ?`,
        [targetVolume, inId] // Use targetVolume as the actual filled volume
      );

      if (updateResult.affectedRows > 0) {
        console.log(`✅ Updated insolution record IN_ID: ${inId}`);
      }
    }

    // Also store in drainage completions for analytics
    await pool.query(
      `INSERT INTO drainage_completions 
       (volume_drained, target_volume, duration_seconds, in_id, completed_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [volumeDrained, targetVolume, duration, inId, timestamp || new Date()]
    );

    res.json({
      success: true,
      message: "Drainage completion recorded successfully",
      data: {
        inId,
        volumeDrained,
        targetVolume,
        duration,
        completionTime: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error recording drainage completion:", error);
    res.status(500).json({
      success: false,
      message: "Failed to record drainage completion",
      error: error.message,
    });
  }
});

// 🆕 Get active Solution In sessions (for real-time monitoring)
app.get("/api/treatments/active-solution-in/:patientID", async (req, res) => {
  const { patientID } = req.params;

  try {
    const [activeSessions] = await pool.query(
      `SELECT i.IN_ID, i.InStarted, i.Dialysate, i.Dwell, i.VolumeIn as targetVolume,
              t.Treatment_ID, t.TreatmentStatus
       FROM insolution i
       JOIN treatment t ON i.IN_ID = t.IN_ID
       WHERE t.patientID = ? 
         AND i.InFinished IS NULL 
         AND t.TreatmentStatus = 'in-progress'
       ORDER BY i.InStarted DESC 
       LIMIT 1`,
      [patientID]
    );

    res.json({
      success: true,
      activeSession: activeSessions.length > 0 ? activeSessions[0] : null,
    });
  } catch (error) {
    console.error("Error fetching active sessions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch active sessions",
    });
  }
});
// Get patient ID by user ID
app.get("/api/patients/user/:userID", async (req, res) => {
  const { userID } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT patientID, hospitalNumber, address, situationStatus 
       FROM patients 
       WHERE userID = ?`,
      [userID]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Patient not found for this user",
      });
    }

    res.json({
      success: true,
      patient: rows[0],
    });
  } catch (error) {
    console.error("Patient fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching patient data",
      error: error.message,
    });
  }
});
// Get monthly treatment statistics
app.get("/api/treatments/monthly-stats/:userID", async (req, res) => {
  const { userID } = req.params;

  try {
    // ✅ 1. Get prescription bag counts and percentages
    const [prescriptionRows] = await pool.query(
      `SELECT pr.pd_bag_counts, pr.pd_bag_percentages
       FROM prescriptions pr
       JOIN patients p ON pr.patientID = p.patientID
       WHERE p.userID = ?
       ORDER BY pr.created_at DESC
       LIMIT 1`,
      [userID]
    );

    let totalBags = { 1.5: 0, 2.5: 0, 4.25: 0 };
    let bagPercentages = [1.5, 2.5, 4.25]; // Default percentages

    if (prescriptionRows.length > 0) {
      const prescription = prescriptionRows[0];

      // Parse bag counts
      if (prescription.pd_bag_counts) {
        try {
          const bagCounts = parseBagCounts(prescription.pd_bag_counts);
          const percentages = parseBagPercentages(
            prescription.pd_bag_percentages
          );

          // Map counts to percentages
          bagPercentages = percentages;
          percentages.forEach((percentage, index) => {
            totalBags[percentage] = bagCounts[index] || 0;
          });
        } catch (e) {
          console.error("Error parsing prescription data:", e);
        }
      }
    }

    // ✅ 2. Get monthly taken counts grouped by Dialysate percentage - FIXED QUERY
    const [takenRows] = await pool.query(
      `SELECT 
         i.Dialysate,
         COUNT(*) AS taken
       FROM treatment t
       JOIN insolution i ON t.IN_ID = i.IN_ID
       JOIN patients p ON t.patientID = p.patientID
       WHERE p.userID = ?
         AND YEAR(t.treatmentDate) = YEAR(CURDATE())
         AND MONTH(t.treatmentDate) = MONTH(CURDATE())
         AND t.TreatmentStatus = 'completed'
       GROUP BY i.Dialysate`,
      [userID]
    );

    console.log("Raw taken rows:", takenRows);

    // ✅ 3. Prepare taken counts per percentage - DIRECT MAPPING
    let takenBags = { 1.5: 0, 2.5: 0, 4.25: 0 };

    takenRows.forEach((row) => {
      const dialysate = row.Dialysate;
      console.log("Processing dialysate:", dialysate);

      if (dialysate) {
        // Convert to number and handle different formats
        const dialysateNum = parseFloat(dialysate);

        if ([1.5, 2.5, 4.25].includes(dialysateNum)) {
          takenBags[dialysateNum] += parseInt(row.taken);
        }
      }
    });

    console.log("Taken bags after processing:", takenBags);

    // ✅ 4. Compute remaining per percentage
    const remainingBags = {
      1.5: Math.max(0, totalBags[1.5] - takenBags[1.5]),
      2.5: Math.max(0, totalBags[2.5] - takenBags[2.5]),
      4.25: Math.max(0, totalBags[4.25] - takenBags[4.25]),
    };

    // ✅ 5. Totals
    const totalTaken = takenBags[1.5] + takenBags[2.5] + takenBags[4.25];
    const totalRemaining =
      remainingBags[1.5] + remainingBags[2.5] + remainingBags[4.25];
    const totalPrescribed = totalBags[1.5] + totalBags[2.5] + totalBags[4.25];

    res.json({
      success: true,
      total: {
        prescribed: totalPrescribed,
        taken: totalTaken,
        remaining: totalRemaining,
      },
      details: {
        1.5: {
          prescribed: totalBags[1.5],
          taken: takenBags[1.5],
          remaining: remainingBags[1.5],
        },
        2.5: {
          prescribed: totalBags[2.5],
          taken: takenBags[2.5],
          remaining: remainingBags[2.5],
        },
        4.25: {
          prescribed: totalBags[4.25],
          taken: takenBags[4.25],
          remaining: remainingBags[4.25],
        },
      },
    });
  } catch (error) {
    console.error("Error fetching monthly stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch monthly statistics",
      error: error.message,
    });
  }
});

// Add these helper functions to parse the data consistently
function parseBagCounts(bagCounts) {
  if (!bagCounts) return [];

  try {
    if (typeof bagCounts === "string") {
      const cleanString = bagCounts.replace(/^"|"$/g, "");
      return cleanString
        .split(",")
        .map((item) => parseInt(item.trim()))
        .filter((num) => !isNaN(num));
    } else if (Array.isArray(bagCounts)) {
      return bagCounts.map((count) => parseInt(count) || 0);
    }
    return [];
  } catch (error) {
    console.error("Error parsing bag counts:", error);
    return [];
  }
}

function parseBagPercentages(bagPercentages) {
  if (!bagPercentages) return [];

  try {
    if (typeof bagPercentages === "string") {
      const cleanString = bagPercentages
        .replace(/^"|"$/g, "")
        .replace(/%/g, "");
      return cleanString
        .split(",")
        .map((item) => parseFloat(item.trim()))
        .filter((num) => !isNaN(num));
    } else if (Array.isArray(bagPercentages)) {
      return bagPercentages.map((p) => parseFloat(p) || 0);
    }
    return [];
  } catch (error) {
    console.error("Error parsing bag percentages:", error);
    return [];
  }
}
// Add this temporary debug endpoint
app.get("/api/debug/prescription-data/:userID", async (req, res) => {
  const { userID } = req.params;

  try {
    // Get prescription data
    const [prescriptionRows] = await pool.query(
      `SELECT pr.*, p.*
       FROM prescriptions pr
       JOIN patients p ON pr.patientID = p.patientID
       WHERE p.userID = ?
       ORDER BY pr.created_at DESC
       LIMIT 1`,
      [userID]
    );

    // Get treatment data
    const [treatmentRows] = await pool.query(
      `SELECT t.*, i.Dialysate
       FROM treatment t
       JOIN insolution i ON t.IN_ID = i.IN_ID
       JOIN patients p ON t.patientID = p.patientID
       WHERE p.userID = ?
         AND YEAR(t.treatmentDate) = YEAR(CURDATE())
         AND MONTH(t.treatmentDate) = MONTH(CURDATE())
         AND t.TreatmentStatus = 'completed'`,
      [userID]
    );

    res.json({
      success: true,
      prescription: prescriptionRows[0] || null,
      treatments: treatmentRows,
      prescriptionCount: prescriptionRows.length,
      treatmentCount: treatmentRows.length,
    });
  } catch (error) {
    console.error("Debug error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
app.use("/prescriptions", require("./routes/prescriptions"));
app.use("/api/iot", require("./routes/iotRoutes"));
app.use("/api/treatment", require("./routes/treatment"));

// 🆕 1. UPDATE IN-STARTED ENDPOINT
app.put("/api/treatments/update-in-started", async (req, res) => {
  const { inId, inStarted } = req.body;

  try {
    console.log(
      `Updating InStarted for IN_ID: ${inId} with time: ${inStarted}`
    );

    const [result] = await pool.query(
      `UPDATE insolution SET InStarted = ? WHERE IN_ID = ?`,
      [inStarted, inId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Solution In record not found",
      });
    }

    res.json({
      success: true,
      message: "InStarted timestamp updated successfully",
    });
  } catch (error) {
    console.error("Error updating InStarted:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update InStarted timestamp",
      error: error.message,
    });
  }
});

// 🆕 2. UPDATE IN-FINISHED ENDPOINT
app.put("/api/treatments/update-in-finished", async (req, res) => {
  const { inId, inFinished, volumeIn } = req.body;

  try {
    console.log(
      `Updating InFinished for IN_ID: ${inId} with time: ${inFinished}, volume: ${volumeIn}`
    );

    const [result] = await pool.query(
      `UPDATE insolution SET InFinished = ?, VolumeIn = ? WHERE IN_ID = ?`,
      [inFinished, volumeIn, inId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Solution In record not found",
      });
    }

    res.json({
      success: true,
      message: "InFinished timestamp and volume updated successfully",
    });
  } catch (error) {
    console.error("Error updating InFinished:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update InFinished timestamp",
      error: error.message,
    });
  }
});

// 🆕 BETTER WEIGHT SIMULATION FOR TESTING
let testCounter = 0;
const weightPattern = [
  0.5,
  0.8,
  1.2,
  1.6,
  2.0,
  2.2, // Rising to target
  2.0,
  1.6,
  1.2,
  0.8,
  0.5,
  0.3, // Installation drop
];

app.get("/api/iot/weight", async (req, res) => {
  try {
    const mockWeight = weightPattern[testCounter % weightPattern.length];
    testCounter++;

    const currentWeightML = Math.round(mockWeight * 1000);

    console.log(
      `⚖️ IoT Weight: ${mockWeight}kg (${currentWeightML}ml) | Step: ${testCounter}`
    );

    // Simulate realistic timing
    if (testCounter === 6) {
      console.log(
        "🎯 SIMULATION: Weight reached 2000ml - Timer should appear!"
      );
    }
    if (testCounter === 7) {
      console.log(
        "🚀 SIMULATION: Weight dropping - Filling timer should start!"
      );
    }

    // res.json({
    //   weight: mockWeight,
    //   unit: "kg",
    //   timestamp: new Date().toISOString()
    // });
    res.json({
      weight: mockWeight,
      unit: "kg",
      timestamp: new Date().toISOString(),
      trigger: currentWeightML <= 2000, // boolean
    });
  } catch (error) {
    console.error("IoT weight error:", error);
    res.status(500).json({
      error: error.message,
    });
  }
});

// 🆕 GET LATEST IN-SOLUTION BY PATIENT ID (IF YOU ADD patientID COLUMN)
app.get("/api/insolution/latest/:patientID", async (req, res) => {
  const { patientID } = req.params;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM insolution WHERE patientID = ? ORDER BY IN_ID DESC LIMIT 1",
      [patientID]
    );

    if (rows.length === 0) {
      return res.json({
        success: true,
        insolution: null,
        message: "No in-solution data found for this patient",
      });
    }

    res.json({
      success: true,
      insolution: rows[0],
    });
  } catch (error) {
    console.error("Error fetching latest in-solution by patient:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch in-solution data",
      error: error.message,
    });
  }
});

// 🆕 UPDATE INSOLUTION ENDPOINT TO INCLUDE PATIENT ID
// 🆕 UPDATE INSOLUTION ENDPOINT TO INCLUDE PATIENT ID (REMOVE DUPLICATE)
app.post("/api/insolution", async (req, res) => {
  const { InStarted, InFinished, VolumeIn, Dialysate, Dwell, patientID } =
    req.body;

  try {
    const [result] = await pool.query(
      "INSERT INTO insolution (InStarted, InFinished, VolumeIn, Dialysate, Dwell, patientID) VALUES (?, ?, ?, ?, ?, ?)",
      [
        InStarted,
        InFinished,
        VolumeIn,
        Dialysate || null,
        Dwell || null,
        patientID || null,
      ]
    );

    res.status(200).json({
      success: true,
      id: result.insertId,
      message: "In-solution record created successfully",
    });
  } catch (err) {
    console.error("❌ Database insert failed:", err);
    res.status(500).json({ success: false, error: "Database insert failed" });
  }
});

// 🆕 ADD THIS ENDPOINT TO YOUR BACKEND - GET IN-SOLUTION BY ID
app.get("/api/insolution/:IN_ID", async (req, res) => {
  const { IN_ID } = req.params;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM insolution WHERE IN_ID = ?",
      [IN_ID]
    );

    if (rows.length === 0) {
      return res.json({
        success: true,
        insolution: null,
        message: "No in-solution data found for this ID",
      });
    }

    res.json({
      success: true,
      insolution: rows[0],
    });
  } catch (error) {
    console.error("Error fetching in-solution by ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch in-solution data",
      error: error.message,
    });
  }
});

// 🆕 CREATE OUTSOLUTION RECORD - DYNAMIC COLUMNS
app.post("/api/outsolution", async (req, res) => {
  const {
    DrainStarted,
    DrainFinished,
    VolumeOut,
    Color, // 🆕 ADD COLOR FIELD
    Notes,
    ExitSiteImage,
    patientID,
  } = req.body;

  if (!patientID) {
    return res.status(400).json({
      success: false,
      message: "patientID is required",
    });
  }

  try {
    // ✅ DYNAMIC COLUMNS BASED ON WHAT'S PROVIDED
    let columns = [
      "DrainStarted",
      "DrainFinished",
      "VolumeOut",
      "Color", // 🆕 ADD COLOR FIELD
      "Notes",
      "patientID",
    ];
    let placeholders = ["?", "?", "?", "?", "?", "?"];
    let values = [
      DrainStarted,
      DrainFinished,
      VolumeOut,
      Color || "", // 🆕 ADD COLOR VALUE (default to empty string)
      Notes,
      patientID || "",
    ];

    // ✅ ADD ExitSiteImage ONLY if provided and column exists
    if (ExitSiteImage) {
      columns.push("ExitSiteImage");
      placeholders.push("?");
      values.push(ExitSiteImage);
    }

    const query = `INSERT INTO outsolution (${columns.join(
      ", "
    )}) VALUES (${placeholders.join(", ")})`;

    console.log("📝 Executing query:", query);
    console.log("📦 With values:", values);

    const [result] = await pool.query(query, values);

    console.log(
      `✅ Out-solution created: OUT_ID ${result.insertId} for patient ${patientID}`
    );

    res.json({
      success: true,
      outId: result.insertId,
      message: "Out-solution record created successfully",
    });
  } catch (error) {
    console.error("❌ Error creating out-solution:", error);

    // ✅ SPECIFIC ERROR FOR MISSING COLUMN
    if (error.code === "ER_BAD_FIELD_ERROR") {
      return res.status(500).json({
        success: false,
        message:
          "Database column missing. Please add missing column to outsolution table.",
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create out-solution record",
      error: error.message,
    });
  }
});
// 🆕 CREATE TREATMENT RECORD - IMPROVED VALIDATION
app.post("/api/treatments", async (req, res) => {
  const {
    patientID,
    IN_ID,
    OUT_ID,
    TreatmentStatus,
    Balances,
    treatmentDate,
    bagSerialNumber,
    solutionImage,
    dry_night,
  } = req.body;

  // ✅ ADD VALIDATION
  if (!patientID) {
    return res.status(400).json({
      success: false,
      message: "patientID is required",
    });
  }

  try {
    let finalBalance = Balances;

    // ✅ AUTO-CALCULATE BALANCE if both IN_ID and OUT_ID exist
    if (IN_ID && OUT_ID) {
      // Get VolumeIn and VolumeOut to calculate balance
      const [inData] = await pool.query(
        "SELECT VolumeIn FROM insolution WHERE IN_ID = ?",
        [IN_ID]
      );
      const [outData] = await pool.query(
        "SELECT VolumeOut FROM outsolution WHERE OUT_ID = ?",
        [OUT_ID]
      );

      const volumeIn = inData.length > 0 ? inData[0].VolumeIn : 0;
      const volumeOut = outData.length > 0 ? outData[0].VolumeOut : 0;

      // CORRECTED: VolumeOut - VolumeIn = Balances
      finalBalance = volumeOut - volumeIn;

      console.log(
        `💰 Balance Calculation: ${volumeIn}ml (Out) - ${volumeOut}ml (In) = ${finalBalance}ml`
      );
    }

    const [result] = await pool.query(
      `INSERT INTO treatment 
       (patientID, IN_ID, OUT_ID, TreatmentStatus, Balances, treatmentDate, bagSerialNumber, solutionImage, dry_night, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        patientID,
        IN_ID || null,
        OUT_ID || null,
        TreatmentStatus || "completed",
        finalBalance !== undefined ? finalBalance : 0,
        treatmentDate || new Date().toISOString().split("T")[0],
        bagSerialNumber || `BAG-${Date.now()}`,
        solutionImage || null,
        dry_night || 0,
      ]
    );

    console.log(
      `✅ Treatment created: ID ${result.insertId} for patient ${patientID}`
    );

    res.json({
      success: true,
      treatmentId: result.insertId,
      message: "Treatment record created successfully",
      calculatedBalance: finalBalance,
      formula: "VolumeIn - VolumeOut = Balances",
    });
  } catch (error) {
    console.error("❌ Error creating treatment record:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create treatment record",
      error: error.message,
    });
  }
});

// 🆕 GET TREATMENT BALANCE ANALYSIS - CORRECTED FORMULA
app.get("/api/treatments/balance-analysis/:patientID", async (req, res) => {
  const { patientID } = req.params;

  try {
    const [treatments] = await pool.query(
      `SELECT t.Treatment_ID, t.Balances, t.treatmentDate,
              i.VolumeIn, o.VolumeOut,
              (o.VolumeOut - i.VolumeIn) as calculatedBalance
       FROM treatment t
       LEFT JOIN insolution i ON t.IN_ID = i.IN_ID
       LEFT JOIN outsolution o ON t.OUT_ID = o.OUT_ID
       WHERE t.patientID = ?
         AND i.VolumeIn IS NOT NULL 
         AND o.VolumeOut IS NOT NULL
       ORDER BY t.treatmentDate DESC
       LIMIT 10`,
      [patientID]
    );

    // Add balance interpretation
    const treatmentsWithAnalysis = treatments.map((treatment) => {
      const balance = parseFloat(treatment.Balances);
      let interpretation = "";

      if (balance < 0) {
        interpretation = "Positive balance - Good fluid removal";
      } else if (balance > 0) {
        interpretation = "Negative balance - Possible fluid retention";
      } else {
        interpretation = "Neutral balance - Ideal";
      }

      return {
        ...treatment,
        interpretation,
        formulaUsed: "VolumeIn - VolumeOut = Balances",
      };
    });

    res.json({
      success: true,
      treatments: treatmentsWithAnalysis,
      formula: "Balances = VolumeIn - VolumeOut",
    });
  } catch (error) {
    console.error("Error fetching balance analysis:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch balance analysis",
      error: error.message,
    });
  }
});
// Enhanced prescription medicines endpoint with better error handling
// Enhanced API endpoint to get prescription medicines with details
app.get("/api/prescription-medicines/patient/:patientID", async (req, res) => {
  try {
    const { patientID } = req.params;

    console.log(
      `📋 Fetching prescription medicines for patient ID: ${patientID}`
    );

    // Check if patient exists
    const [patientCheck] = await pool.query(
      "SELECT patientID FROM patients WHERE patientID = ?",
      [patientID]
    );

    if (patientCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Patient not found",
      });
    }

    // Enhanced query with joins for medicine and doctor details
    const query = `
      SELECT 
        pm.id,
        pm.prescription_id,
        pm.patientID,
        pm.userID as doctor_id,
        pm.medicine_id,
        pm.dosage,
        pm.frequency,
        pm.duration,
        pm.instructions,
        pm.created_at,
        pm.updated_at,
        -- Medicine details
        m.name as medicine_name,
        m.form as medicine_form,
        m.category as medicine_category,
        -- Doctor details
        u.first_name as doctor_first_name,
        u.middle_name as doctor_middle_name,
        u.last_name as doctor_last_name,
        u.specialization as doctor_specialization
      FROM prescription_medicine pm
      LEFT JOIN medicines m ON pm.medicine_id = m.medicine_id
      LEFT JOIN users u ON pm.userID = u.userID
      WHERE pm.patientID = ?
      ORDER BY pm.created_at DESC
    `;

    const [results] = await pool.execute(query, [patientID]);

    console.log(`✅ Found ${results.length} prescription medicines`);

    res.json(results);
  } catch (error) {
    console.error("❌ Error fetching prescription medicines:", error);

    // Fallback to basic query if joins fail
    if (error.code === "ER_NO_SUCH_TABLE") {
      try {
        console.log("⚠️ Using fallback query without joins");
        const fallbackQuery = `
          SELECT * FROM prescription_medicine 
          WHERE patientID = ? 
          ORDER BY created_at DESC
        `;
        const [fallbackResults] = await pool.execute(fallbackQuery, [
          patientID,
        ]);
        return res.json(fallbackResults);
      } catch (fallbackError) {
        console.error("❌ Fallback query also failed:", fallbackError);
      }
    }

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
// Corrected endpoint for fluid balance analysis
app.get("/api/treatments/fluid-balance-analysis/:userID", async (req, res) => {
  const { userID } = req.params;

  try {
    // First get the patient ID
    const [patientRows] = await pool.query(
      `SELECT patientID FROM patients WHERE userID = ?`,
      [userID]
    );

    if (patientRows.length === 0) {
      return res.json({
        success: true,
        treatments: [],
        message: "No patient found for this user",
      });
    }

    const patientID = patientRows[0].patientID;

    // Get treatments with fluid balance data
    const [treatments] = await pool.query(
      `SELECT 
  t.Treatment_ID, 
  t.Balances, 
  t.treatmentDate,
  t.TreatmentStatus,
  i.VolumeIn, 
  o.VolumeOut,
  o.Color,
  o.Notes,
  (i.VolumeIn - o.VolumeOut) as calculatedBalance,
  -- Normalize color values in the query
  CASE 
    WHEN LOWER(o.Color) LIKE '%red%' OR LOWER(o.Color) LIKE '%hugas isda%' THEN 'red'
    WHEN LOWER(o.Color) LIKE '%yellow%' OR LOWER(o.Color) LIKE '%pineapple%' THEN 'yellow'
    WHEN LOWER(o.Color) LIKE '%cloudy%' OR LOWER(o.Color) LIKE '%hugas bigas%' THEN 'cloudy'
    WHEN LOWER(o.Color) LIKE '%clear%' THEN 'clear'
    ELSE LOWER(o.Color)
  END as normalizedColor
 FROM treatment t
 LEFT JOIN insolution i ON t.IN_ID = i.IN_ID
 LEFT JOIN outsolution o ON t.OUT_ID = o.OUT_ID
 WHERE t.patientID = ?
   AND t.treatmentDate IS NOT NULL
   AND i.VolumeIn IS NOT NULL
   AND o.VolumeOut IS NOT NULL
 ORDER BY t.treatmentDate DESC
 LIMIT 30`,
      [patientID]
    );

    console.log(
      `Found ${treatments.length} treatments with fluid data for patient ${patientID}`
    );

    // Color analysis configuration
    const colorAnalysis = {
      clear: {
        riskLevel: "low",
        description: "Normal - No signs of infection",
        recommendation: "Continue current care routine",
        severity: 1,
      },
      cloudy: {
        riskLevel: "medium-low",
        description: "Fibrins - Cloudy fluid may indicate fibrins",
        recommendation: "Continue current routine",
        severity: 2,
      },
      red: {
        riskLevel: "high",
        description: "Blood-tinged - May indicate bleeding or infection",
        recommendation:
          "Monitor closely and if persists go to the emergency department immediately",
        severity: 4,
      },
      yellow: {
        riskLevel: "medium-high",
        description: "Abnormal color - Possible infection or other issues",
        recommendation: "Consider getting laboratory for evaluation",
        severity: 3,
      },
    };

    // Add balance interpretation AND color analysis
    const treatmentsWithAnalysis = treatments.map((treatment) => {
      // Use calculated balance: VolumeIn - VolumeOut
      const balance = parseFloat(treatment.calculatedBalance) || 0;

      let interpretation = "";
      let status = "unknown";

      if (balance > 0) {
        interpretation = "Positive balance - Possible fluid retention";
        status = "warning";
      } else if (balance < 0) {
        interpretation = "Negative balance - Good fluid removal";
        status = "good";
      } else if (balance === 0) {
        interpretation = "Neutral balance - Ideal";
        status = "good";
      } else {
        interpretation = "Insufficient data";
        status = "unknown";
      }

      // Color analysis
      const fluidColor = (treatment.Color || "").toLowerCase().trim();
      const colorInfo = colorAnalysis[fluidColor] || {
        riskLevel: "unknown",
        description: "Color not recognized",
        recommendation: "Consult healthcare provider",
        severity: 2,
      };

      return {
        ...treatment,
        balance: balance,
        interpretation,
        status,
        formulaUsed: "Balance = VolumeIn - VolumeOut",
        calculation: `${treatment.VolumeIn} - ${treatment.VolumeOut} = ${balance}`,

        // Color analysis data
        colorAnalysis: {
          color: fluidColor,
          riskLevel: colorInfo.riskLevel,
          description: colorInfo.description,
          recommendation: colorInfo.recommendation,
          severity: colorInfo.severity,
          hasInfectionRisk: colorInfo.riskLevel !== "low",
        },
      };
    });

    // Calculate monthly statistics for BOTH fluid balance AND color analysis
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const currentMonthTreatments = treatmentsWithAnalysis.filter(
      (treatment) => {
        if (!treatment.treatmentDate) return false;
        const treatmentDate = new Date(treatment.treatmentDate);
        return (
          treatmentDate.getMonth() === currentMonth &&
          treatmentDate.getFullYear() === currentYear
        );
      }
    );

    // Count treatments with fluid retention (POSITIVE balance)
    const treatmentsWithFluidRetention = currentMonthTreatments.filter(
      (treatment) => treatment.balance > 0
    );

    // Count treatments with infection risk based on color
    const treatmentsWithInfectionRisk = currentMonthTreatments.filter(
      (treatment) => treatment.colorAnalysis.hasInfectionRisk
    );

    // Count by color type
    const colorCounts = {
      clear: 0,
      cloudy: 0,
      red: 0,
      yellow: 0,
      unknown: 0,
    };

    currentMonthTreatments.forEach((treatment) => {
      const color = treatment.colorAnalysis.color;
      if (colorCounts.hasOwnProperty(color)) {
        colorCounts[color]++;
      } else {
        colorCounts.unknown++;
      }
    });

    const totalTreatments = currentMonthTreatments.length;
    const fluidRetentionCount = treatmentsWithFluidRetention.length;
    const fluidRetentionPercentage =
      totalTreatments > 0
        ? Math.round((fluidRetentionCount / totalTreatments) * 100)
        : 0;

    const infectionRiskCount = treatmentsWithInfectionRisk.length;
    const infectionRiskPercentage =
      totalTreatments > 0
        ? Math.round((infectionRiskCount / totalTreatments) * 100)
        : 0;

    res.json({
      success: true,
      treatments: treatmentsWithAnalysis,
      currentMonthAnalysis: {
        totalTreatments,
        fluidRetentionCount,
        fluidRetentionPercentage,
        infectionRiskCount,
        infectionRiskPercentage,
        colorCounts,
        treatments: currentMonthTreatments,
      },
      formula: "Balance = VolumeIn - VolumeOut",
      interpretation: {
        positive: "Fluid retention (VolumeIn > VolumeOut)",
        negative: "Good fluid removal (VolumeIn < VolumeOut)",
        zero: "Balanced (VolumeIn = VolumeOut)",
      },
      colorInterpretation: colorAnalysis,
      summary: {
        totalTreatmentsFound: treatments.length,
        currentMonthTreatments: totalTreatments,
        treatmentsWithFluidRetention: fluidRetentionCount,
        treatmentsWithInfectionRisk: infectionRiskCount,
        colorDistribution: colorCounts,
      },
    });
  } catch (error) {
    console.error("Error fetching fluid balance analysis:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch fluid balance analysis",
      error: error.message,
    });
  }
});
app.get("/api/prescription-medicines/latest/:patientId", async (req, res) => {
  let connection;
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "Patient ID is required",
      });
    }

    console.log(`Fetching latest prescription for patient: ${patientId}`);

    // Get connection from pool
    connection = await pool.getConnection();

    // First, get the latest prescription date for this patient
    // Using the correct column names from your table
    const latestPrescriptionQuery = `
      SELECT MAX(created_at) as latest_date 
      FROM prescription_medicine 
      WHERE patientID = ? OR patient_userID = ?
    `;

    console.log('Executing latest prescription query...');
    const [latestResults] = await connection.execute(latestPrescriptionQuery, [
      patientId,
      patientId,
    ]);

    console.log('Latest results:', latestResults);

    if (!latestResults[0] || !latestResults[0].latest_date) {
      console.log('No prescriptions found for patient:', patientId);
      return res.json({
        success: true,
        medicines: [],
        latestDate: null,
        message: "No prescriptions found for this patient",
      });
    }

    const latestDate = latestResults[0].latest_date;
    console.log('Latest prescription date:', latestDate);

    // Then get all medicines from the latest prescription
    // Using the correct column names
    const medicinesQuery = `
      SELECT 
        pm.prescription_id,
        pm.patientID,
        pm.patient_userID,
        pm.doctor_userID,
        pm.medicine_id,
        pm.dosage,
        pm.frequency,
        pm.duration,
        pm.instructions,
        pm.created_at,
        pm.updated_at,
        COALESCE(m.name, 'Unknown Medicine') as medicine_name,
        COALESCE(m.generic_name, '') as generic_name,
        COALESCE(m.category, '') as category
      FROM prescription_medicine pm
      LEFT JOIN medicines m ON pm.medicine_id = m.id
      WHERE (pm.patientID = ? OR pm.patient_userID = ?) 
        AND DATE(pm.created_at) = DATE(?)
      ORDER BY COALESCE(m.name, pm.medicine_id)
    `;

    console.log('Executing medicines query...');
    const [medicines] = await connection.execute(medicinesQuery, [
      patientId,
      patientId,
      latestDate,
    ]);

    console.log(`Found ${medicines.length} medicines`);

    res.json({
      success: true,
      medicines: medicines,
      latestDate: latestDate,
      message: `Found ${medicines.length} medicines in latest prescription`,
    });

  } catch (error) {
    console.error("Error fetching latest prescription medicines:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error: " + error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    // Release connection back to pool
    if (connection) {
      connection.release();
      console.log('Database connection released');
    }
  }
});
app.get("/api/prescription-medicines/patient/:patientId", async (req, res) => {
  let connection;
  try {
    const { patientId } = req.params;
    const { limit = 50 } = req.query;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "Patient ID is required",
      });
    }

    connection = await pool.getConnection();

    const query = `
      SELECT 
        prescription_id,
        patientID,
        patient_userID,
        doctor_userID,
        medicine_id,
        dosage,
        frequency,
        duration,
        instructions,
        created_at,
        updated_at
      FROM prescription_medicine 
      WHERE patientID = ? OR patient_userID = ?
      ORDER BY created_at DESC
      LIMIT ?
    `;

    const [medicines] = await connection.execute(query, [
      patientId,
      patientId,
      parseInt(limit),
    ]);

    res.json({
      success: true,
      medicines: medicines,
      total: medicines.length,
    });
  } catch (error) {
    console.error("Error fetching patient prescription medicines:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});
// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
  console.log(`✅Connected to Cloud SQL`);
});





