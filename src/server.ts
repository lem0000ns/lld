import express from "express";
import path from "path";
import cors from "cors";
import passport from "passport";
import session from "express-session";
import { Strategy as LocalStrategy } from "passport-local";
import { fileURLToPath } from "url";
import mysql, { RowDataPacket } from "mysql2/promise";
import crypto from "crypto";

// configuration variables
const lld_pw = process.env.LLD_PW;
const lld_pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: lld_pw,
  database: "lld",
});
const usr_pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: lld_pw,
  database: "lld_usrs",
});
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(session({ secret: "secret", resave: false, saveUnitialized: true })); // middleware
app.use(passport.initialize());
app.use(passport.session());
app.use(cors());
app.use(express.json());

passport.use(
  new LocalStrategy(async function verify(username, password, done) {
    try {
      const result = await usr_pool.query(
        `SELECT * FROM usrs WHERE username = '${username}'`
      );
      if ((<any>result[0]).length == 0) {
        console.log("Incorrect username");
        return done(null, false, { message: "Incorrect username" });
      }
      const user = result[0];
      if ((user as any)[0].password != password) {
        console.log("Incorrect password");
        return done(null, false, { message: "Incorrect password" });
      }
      return done(null, user);
    } catch (err) {
      console.error(`Error: ${err}`);
      return done(null, false, { message: err.message });
    }
  })
);

// called after successful authentication
passport.serializeUser((user, done) => {
  console.log("Serializing user");
  done(null, user[0].id);
});

// used when user makes request
passport.deserializeUser(async (id, done) => {
  console.log("Deserializing user");
  try {
    // find user in database with corresponding id
    const result = await usr_pool.query(
      `SELECT * FROM usrs WHERE id = ${id} LIMIT 1`
    );
    if ((<any>result[0]).length == 0) {
      return done(null, false);
    }
    const user = result[0];
    done(null, user);
  } catch (err) {
    done(err);
  }
});

app.post("/login", passport.authenticate("local"), (req, res) => {
  res.json({ message: "Successful login" });
});

app.post("/register", async (req, res) => {
  console.log("Received a POST request to /register");
  try {
    const { username, password } = req.body;
    const query = `INSERT INTO usrs (username, password, highscore) VALUES ('${username}', '${password}', 0)`;
    await usr_pool.query(query);
    res.status(200).json({ message: "User registered into database" });
  } catch (e) {
    console.error("Error:", e.message);
    res.status(500).json({ message: "Error registering user" });
  }
});

interface Word extends RowDataPacket {
  english: string;
}

app.get("/", (req, res) => {
  console.log("HI");
});

const getAPIword = async (diff: string, res) => {
  try {
    let query = "";
    if (diff != "") {
      query = `SELECT * FROM words WHERE diff = '${diff}' ORDER BY RAND() LIMIT 1`;
    } else {
      query = `SELECT * FROM words ORDER BY RAND() LIMIT 1`;
    }
    const [results] = await lld_pool.query<Word[]>(query);
    const words = results.map((result) => ({
      english: result.english,
      spanish: result.spanish,
      korean: result.korean,
      freq: result.freq,
      diff: result.diff,
      pronunciation: result.pronunciation,
      def: result.def,
    }));
    res.json(words);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: { error } });
  }
};

const getAnswers = async (diff: string, res) => {
  try {
    const query = `SELECT * FROM words WHERE diff = '${diff}' ORDER BY RAND() LIMIT 3`;
    const [results] = await lld_pool.query<Word[]>(query);
    const words = results.map((result) => ({
      english: result.english,
    }));
    res.json(words);
  } catch (error) {
    res.status(500).json({ error: { error } });
  }
};

app.get("/api/word/easy", (req, res) => getAPIword("easy", res));
app.get("/api/word/med", (req, res) => getAPIword("med", res));
app.get("/api/word/hard", (req, res) => getAPIword("hard", res));
app.get("/api/answers/easy", (req, res) => getAnswers("easy", res));
app.get("/api/answers/med", (req, res) => getAnswers("med", res));
app.get("/api/answers/hard", (req, res) => getAnswers("hard", res));
app.get("/api/word", (req, res) => getAPIword("", res));

app.listen(8080, () => {
  console.log("Server is listening on port 8080");
});
