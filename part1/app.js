const express = require("express");
const mysql = require("mysql2/promise");
const fs = require("fs");

const app = express();
const port = 3000;

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "root",
  database: "DogWalkService",
};

async function initializeDatabase() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log("Connected to the database.");

    const sqlSchema = fs.readFileSync("dogwalks.sql").toString();
    const schemaStatements = sqlSchema.split(";").filter(s => s.trim().length > 0);
    for (const statement of schemaStatements) {
      await connection.query(statement);
    }
    console.log("Database schema initialized.");

    const sqlData = fs.readFileSync("insert_data.sql").toString();
    const dataStatements = sqlData.split(";").filter(s => s.trim().length > 0);
    for (const statement of dataStatements) {
      await connection.query(statement);
    }
    console.log("Data inserted into the database.");

    connection.end();
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

initializeDatabase();

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

app.get("/api/dogs", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT d.name AS dog_name, d.size, u.username AS owner_username FROM Dogs d JOIN Users u ON d.owner_id = u.user_id"
    );
    res.json(rows);
    connection.end();
  } catch (error) {
    console.error("Error fetching dogs:", error);
    res.status(500).json({ error: "Failed to retrieve dogs." });
  }
});

app.get("/api/walkrequests/open", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT wr.request_id, d.name AS dog_name, wr.requested_time, wr.duration_minutes, wr.location, u.username AS owner_username FROM WalkRequests wr JOIN Dogs d ON wr.dog_id = d.dog_id JOIN Users u ON d.owner_id = u.user_id WHERE wr.status = 'open'"
    );
    res.json(rows);
    connection.end();
  } catch (error) {
    console.error("Error fetching open walk requests:", error);
    res.status(500).json({ error: "Failed to retrieve open walk requests." });
  }
});

app.get("/api/walkers/summary", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      `SELECT
        u.username AS walker_username,
        COUNT(wr.rating_id) AS total_ratings,
        AVG(wr.rating) AS average_rating,
        COUNT(CASE WHEN wreq.status = 'completed' THEN 1 ELSE NULL END) AS completed_walks
      FROM Users u
      LEFT JOIN WalkRatings wr ON u.user_id = wr.walker_id
      LEFT JOIN WalkApplications wa ON u.user_id = wa.walker_id
      LEFT JOIN WalkRequests wreq ON wa.request_id = wreq.request_id
      WHERE u.role = 'walker'
      GROUP BY u.user_id
      ORDER BY u.username;`
    );
    res.json(rows);
    connection.end();
  } catch (error) {
    console.error("Error fetching walkers summary:", error);
    res.status(500).json({ error: "Failed to retrieve walkers summary." });
  }
});
