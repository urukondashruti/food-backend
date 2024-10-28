const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
const dbpath = path.join(__dirname, "database.db");
let db = null;

app.use(express.json());
app.use(cors());

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(8000, () => {
      console.log("Server running at http://localhost:8000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
  }
};

initializeDBAndServer();

/* Register API */
app.post('/api/register/', async (request, response) => {
  const { username, email, password } = request.body;

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  const selectUserQuery = `SELECT * FROM users_lists WHERE username = ?`;
  const dbuser = await db.get(selectUserQuery, username);

  if (dbuser === undefined) {
    const createUserQuery = `INSERT INTO users_lists (username, email, password) VALUES (?, ?, ?)`;
    const dbresponse = await db.run(createUserQuery, username, email, hashedPassword);
    const newUserId = dbresponse.lastID;
    response.send({ register_id: `Created new user with ID: ${newUserId}`, register_msg: "User created successfully" });
  } else {
    response.status(400).send({ register_msg: "User already exists" });
  }
});

/* Login API */
app.post('/api/login/', async (request, response) => {
  const { username, password } = request.body;

  // Use parameterized query to avoid SQL injection
  const selectUserQuery = `SELECT * FROM users_lists WHERE username = ?`;
  const dbuser = await db.get(selectUserQuery, username);

  if (dbuser === undefined) {
    response.status(400).send({ login_msg: "Invalid user" });
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbuser.password);
    if (isPasswordMatched === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "my_secret");
      response.send({ jwt_token: jwtToken });
    } else {
      // Correct way to set status
      response.status(400).send({ login_msg: "Invalid password" });
    }
  }
});
