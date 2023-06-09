import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

let CLIENT_ID = "493157086685-icbmcv4iuv0daij5kmnhv80kipr35bq1.apps.googleusercontent.com";
let JWT_SECRET = "DVUU2T/P9DXzCo7+AIFB9lLUgECmfMxIiWhua3JAy84=";

/* Be sure to use DATABASE_NAME in your call to .db(), so we can change the constant while grading. */
let DATABASE_NAME = "monster_hatchery_db";

// initializing constants here
let HATCH_DATE_MIN = 5;
let HATCH_DATE_MAX = 30;
let EVOLVE_DATE_1_MIN = 15;
let EVOLVE_DATE_1_MAX = 60;
let EVOLVE_DATE_2_MIN = 240;
let EVOLVE_DATE_2_MAX = 720;

let api = express.Router();
let Users;
let Monsters;

// helper function that prints out error messages from api to console
const error = (message, res) => {
  res.status(403).json({ error: message });
};

// helper function for calculating hatchDate and evolveDates
let getRandomNumber = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const initApi = async (app) => {
  app.set("json spaces", 2);
  app.use("/api", api);

  // Set up database connection
  let conn = await MongoClient.connect("mongodb://127.0.0.1");
  let db = conn.db(DATABASE_NAME);

  // Set up collection variables
  Users = db.collection("users");
  Monsters = db.collection("monsters");
};

api.use(bodyParser.json());
api.use(cors());

api.get("/", (req, res) => {
  res.json({ message: "Hello, world!" });
});

/*
User JSON format:
{
  "username": "binky"
}

Monster JSON format:
{
  "owner" : "username"
  "name" : "binky",
  "flavor" : ["baby flavor", "juvenile flavor", "adult flavor"],
  "age" : a number
}

Below are all the functions handling endpoints for the monster hatchery.
The list of endpoints:
  - Middleware: /users/:username
  - GET /users/:username
    - Logs a player into the Hatchery.
    - Returns JSON user object.
  - POST /users
    - Creates a new player account.
    - Expects body.
    - Returns JSON user object.
  - PATCH /users/:username
    - Changes user's name / meat count.
    - Expects body.
  - GET /users/:username/roster
    - Gathers all Monsters owned by the player.
    - Returns JSON object: array containing all Monsters as monster objects.
  - PATCH /monsters/:id
    - Updates the age/satiety/halt status of a monster.
    - Expects body.
    - Returns JSON monster object.
  - POST /users/:username/roster
    - Adds a new Monster to the player's hatchery.
    - Expects body.
    - Returns JSON monster object.
  - DELETE /monsters/:id
    - Removes a Monster from the player's hatchery.
    - Expects body.
    - Returns {success: true} if no error.

Google authentication endpoints:
  - POST /login
    - Creates apiKey
  - Middleware: /protected
    - Sets res.locals.user
  - GET /protected/user
    - Returns user
  - GET /protected/roster
    - Get the user's monster roster
  - POST /protected/roster
    - Expects body
    - Adds to the user's monster roster
  - PATCH /protected/user
    - Changes user's name /meat count.
    - Expects body.
*/

// Middleware for /users/:username
api.use("/users/:username", async (req, res, next) => {
  let username = req.params.username;
  let user = null;
  try {
    user = await Users.findOne({ username: username });
  } catch (e) {
    error(e, res);
  }

  // If the user isn't found, return a 400 error
  if (!user) {
    res.status(404).json({ error: `No player with username ${username}` });
    return;
  }

  // store the User in res.locals
  res.locals.user = user;
  delete res.locals.user._id;
  next();
});

// GET /users/:username
api.get("/users/:username", (req, res) => {
  let user = res.locals.user;
  res.json(user);
});

// POST /users
// expects body
api.post("/users", async (req, res) => {
  let username = req.body.username;
  let name = req.body.name;

  // Check if id is empty or missing
  if (username === undefined || username === "") {
    res.status(400).json({ error: "Missing username" });
    return;
  }

  // Check for duplicate
  let dupCheck = null;
  try {
    dupCheck = await Users.findOne({ username: username });
  } catch (e) {
    error(e, res);
  }
  if (dupCheck) {
    res.status(400).json({ error: `${username} already exists` });
    return;
  }

  // Create new user
  let newUser = { username: username, name: name, meat: 0, google: false };
  // Update database
  try {
    await Users.insertOne(newUser);
  } catch (e) {
    error(e, res);
  }

  delete newUser._id;
  res.json(newUser);
});

// PATCH /users/:username
api.patch("/users/:username", async (req, res) => {
  let user = res.locals.user;
  let newName = req.body.name;
  let newMeat = req.body.meat;

  let apiUser = null;
  try {
    apiUser = await Users.findOne({ username: user.username });
  } catch (e) {
    error(e, res);
  }

  if (newName !== undefined) {
    user.name = newName;
    apiUser.name = newName;
  }
  if (newMeat !== undefined) {
    user.meat = newMeat;
    apiUser.meat = newMeat;
  }

  try {
    await Users.replaceOne({ username: user.username }, apiUser);
  } catch (e) {
    error(e, res);
  }

  res.json({ success: true });
});

// GET /users/:username/roster
api.get("/users/:username/roster", async (req, res) => {
  let user = res.locals.user;
  let roster = [];

  // iterate through all monsters in Monsters
  let allMonsters = null;
  try {
    allMonsters = await Monsters.find().toArray();
  } catch (e) {
    return error(e, res);
  }
  for (let monster of allMonsters) {
    let ownerName = monster.owner;
    // if the owner is the user
    if (ownerName === user.username) {
      // create a monster object with the proper fields
      let newMonster = {
        _id: monster._id,
        owner: ownerName,
        eggName: monster.eggName,
        hatchDate: monster.hatchDate,
        hatched: monster.hatched,
        name: monster.name,
        flavor: monster.flavor,
        age: monster.age,
        halt: monster.halt,
        evolveDate: monster.evolveDate,
        satiety: monster.satiety,
        satietyInterval: monster.satietyInterval,
        lastFed: monster.lastFed
      };
      // add the monster object onto the roster array
      roster.push(newMonster);
    }
  }

  res.json({ roster: roster });
});

// PATCH /monsters/:id
// expects body
api.patch("/monsters/:id", async (req, res) => {
  let monsterId = req.params.id;
  let newHatch = req.body.hatched;
  let newAge = req.body.age;
  let newHalt = req.body.halt;
  let newSatiety = req.body.satiety;
  let response = { success: true };

  // Update information
  let monster = null;
  try {
    monster = await Monsters.findOne({ _id: new ObjectId(monsterId) });
  } catch (e) {
    error(e, res);
  }
  if (!monster) return;
  if (newHatch !== undefined) {
    monster.hatched = newHatch;
    monster.evolveDate = new Date();
    monster.evolveDate.setMinutes(monster.evolveDate.getMinutes() + getRandomNumber(EVOLVE_DATE_1_MIN, EVOLVE_DATE_1_MAX));
    response.evolveDate = monster.evolveDate;
  }
  if (newAge !== undefined) {
    monster.age = newAge;
    if (newAge === 1) {
      // the monster has just evolved to an adolescent, so we want a new evolve time
      monster.evolveDate = new Date();
      monster.evolveDate = monster.evolveDate.setMinutes(monster.evolveDate.getMinutes() + getRandomNumber(EVOLVE_DATE_2_MIN, EVOLVE_DATE_2_MAX));
      response.evolveDate = monster.evolveDate;
    }
  }
  if (newHalt !== undefined) monster.halt = newHalt;
  if (newSatiety !== undefined) {
    monster.satiety = newSatiety;
    monster.lastFed = new Date();
  }
  // Update database
  try {
    await Monsters.replaceOne({ _id: monster._id }, monster);
  } catch (e) {
    error(e, res);
  }

  res.json(response);
});

// POST /users/:username/roster
// expects body
api.post("/users/:username/roster", async (req, res) => {
  let user = res.locals.user;
  let eggName = req.body.eggName;
  let hatched = req.body.hatched;
  let name = req.body.name;
  let flavor = req.body.flavor;
  let age = req.body.age;
  let halt = req.body.halt;
  let satiety = req.body.satiety;
  let satietyInterval = req.body.satietyInterval;

  // Create new monster
  let newMonster = {
    owner: user.username,
    eggName: eggName,
    hatchDate: new Date(),
    hatched: hatched,
    name: name,
    flavor: flavor,
    age: age,
    halt: halt,
    evolveDate: new Date(),
    satiety: satiety,
    satietyInterval: satietyInterval,
    lastFed: new Date()
  };
  newMonster.hatchDate.setMinutes(newMonster.hatchDate.getMinutes() + getRandomNumber(HATCH_DATE_MIN, HATCH_DATE_MAX));
  let apiMonster = null;
  try {
    // Update database
    apiMonster = await Monsters.insertOne(newMonster);
  } catch (e) {
    return error(e, res);
  }

  res.json({
    _id: apiMonster.insertedId,
    hatchDate: newMonster.hatchDate,
    evolveDate: newMonster.evolveDate,
    lastFed: newMonster.lastFed
  });
});

// DELETE /monsters/:id
api.delete("/monsters/:id", async (req, res) => {
  let monsterId = req.params.id;

  // remove the monster
  try {
    await Monsters.deleteOne({ _id: new ObjectId(monsterId) });
  } catch (e) {
    error(e, res);
  }

  res.json({ success: true });
});

// GOOGLE AUTHENTICATION ENDPOINTS

// POST /login
api.post("/login", async (req, res) => {
  let idToken = req.body.idToken;
  let client = new OAuth2Client();
  let data;
  try {
    /* "audience" is the client ID the token was created for. A mismatch would mean the user is
       trying to use an ID token from a different app */
    let login = await client.verifyIdToken({ idToken, audience: CLIENT_ID });
    data = login.getPayload();
  } catch (e) {
    /* Something when wrong when verifying the token. */
    console.error(e);
    res.status(403).json({ error: "Invalid ID token" });
  }

  /* data contains information about the logged in user. */
  let email = data.email;
  let name = data.name;

  /* Do whatever work you'd like here, such as ensuring the user exists in the database */
  /* You can include additional information in the key if you want, as well. */
  // Check for duplicate
  let dupCheck = await Users.findOne({ username: email });
  if (!dupCheck) {
    // Create new user
    let newUser = { username: email, name: name, meat: 0, google: true };
    // Update database
    await Users.insertOne(newUser);
  }

  let apiKey = jwt.sign({ email }, JWT_SECRET, { expiresIn: "1d" });
  res.json({ apiKey: apiKey, username: email, name: name });
});

// Middleware: /protected
api.use("/protected", async (req, res, next) => {
  /* Return an authentication error. */
  const autherror = (i) => {
    res.status(403).json({ error: "Access denied " + i });
  };
  let header = req.header("Authorization");
  /* `return error()` is a bit cheesy when error() doesn't return anything, but it works (returns undefined) and is convenient. */
  if (!header) return autherror(1);
  let [type, value] = header.split(" ");
  if (type !== "Bearer") return autherror(2);
  try {
    let verified = jwt.verify(value, JWT_SECRET);
    // verified contains whatever object you signed, e.g. the user's email address.
    // Use this to look up the user and set res.locals accordingly
    let email = verified.email;
    let user = await Users.findOne({ username: email });
    // If the user isn't found, return a 400 error
    if (!user) {
      res.status(404).json({ error: `No player with username ${email}` });
      return;
    }
    // store the User in res.locals
    res.locals.user = user;
    delete res.locals.user._id;
    next();
  } catch (e) {
    autherror(3 + e);
  }
});

// GET /protected/user
api.get("/protected/user", (req, res) => {
  let user = res.locals.user;
  res.json(user);
});

// GET /protected/roster
api.get("/protected/roster", async (req, res) => {
  let user = res.locals.user;
  let roster = [];

  // iterate through all monsters in Monsters
  let allMonsters = null;
  try {
    allMonsters = await Monsters.find().toArray();
  } catch (e) {
    error(e, res);
  }
  for (let monster of allMonsters) {
    let ownerName = monster.owner;
    // if the owner is the user
    if (ownerName === user.username) {
      // create a monster object with the proper fields
      let newMonster = {
        _id: monster._id,
        owner: ownerName,
        eggName: monster.eggName,
        hatchDate: monster.hatchDate,
        hatched: monster.hatched,
        name: monster.name,
        flavor: monster.flavor,
        age: monster.age,
        halt: monster.halt,
        evolveDate: monster.evolveDate,
        satiety: monster.satiety,
        satietyInterval: monster.satietyInterval,
        lastFed: monster.lastFed
      };
      // add the monster object onto the roster array
      roster.push(newMonster);
    }
  }

  res.json({ roster: roster });
});

// POST /protected/roster
// expects body
api.post("/protected/roster", async (req, res) => {
  let user = res.locals.user;
  let eggName = req.body.eggName;
  let hatched = req.body.hatched;
  let name = req.body.name;
  let flavor = req.body.flavor;
  let age = req.body.age;
  let halt = req.body.halt;
  let satiety = req.body.satiety;
  let satietyInterval = req.body.satietyInterval;

  // Create new monster
  let newMonster = {
    owner: user.username,
    eggName: eggName,
    hatchDate: new Date(),
    hatched: hatched,
    name: name,
    flavor: flavor,
    age: age,
    halt: halt,
    evolveDate: new Date(),
    satiety: satiety,
    satietyInterval: satietyInterval,
    lastFed: new Date()
  };
  newMonster.hatchDate.setMinutes(newMonster.hatchDate.getMinutes() + getRandomNumber(HATCH_DATE_MIN, HATCH_DATE_MAX));
  let apiMonster = null;
  try {
    // Update database
    apiMonster = await Monsters.insertOne(newMonster);
  } catch (e) {
    return error(e, res);
  }

  res.json({
    _id: apiMonster.insertedId,
    hatchDate: newMonster.hatchDate,
    evolveDate: newMonster.evolveDate,
    lastFed: newMonster.lastFed
  });
});

// PATCH /protected/user
api.patch("/protected/user", async (req, res) => {
  let user = res.locals.user;
  let newName = req.body.name;
  let newMeat = req.body.meat;

  let apiUser = null;
  try {
    apiUser = await Users.findOne({ username: user.username });
  } catch (e) {
    error(e, res);
  }

  if (newName !== undefined) {
    user.name = newName;
    apiUser.name = newName;
  }
  if (newMeat !== undefined) {
    user.meat = newMeat;
    apiUser.meat = newMeat;
  }

  try {
    await Users.replaceOne({ username: user.username }, apiUser);
  } catch (e) {
    error(e, res);
  }

  res.json({ success: true });
});

/* Catch-all route to return a JSON error if endpoint not defined.
   Be sure to put all of your endpoints above this one, or they will not be called. */
api.all("/*", (req, res) => {
  res.status(404).json({ error: `Endpoint not found: ${req.method} ${req.url}` });
});

export default initApi;
