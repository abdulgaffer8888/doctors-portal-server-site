const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { MongoClient } = require("mongodb");
const port = process.env.PORT || 5000;

var admin = require("firebase-admin");

var serviceAccount = require("./doctor-portal-7ea55-firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function varifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];
  }
  try {
    const decodedUser = await admin.auth().verifyIdToken(token);
    req.decodedEmail = decodedUser.email;
  } catch {}
  next();
}

// Middleware

app.use(cors());
app.use(express.json());

// Database connection

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.td49h.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    await client.connect();

    const database = client.db("DoctorPortal");
    const appointmentCollection = database.collection("appoinments");
    const usersCollection = database.collection("users");

    app.get("/appointments", async (req, res) => {
      const email = req.query.email;
      const date = req.query.date;
      const query = { email: email, date: date };

      const cursor = appointmentCollection.find(query);
      const appoinments = await cursor.toArray();
      res.json(appoinments);
    });

    app.post("/appointments", async (req, res) => {
      const appoinment = req.body;
      const result = await appointmentCollection.insertOne(appoinment);

      res.json(result);
    });

    app.post("/users", async (req, res) => {
      const users = req.body;
      const result = await usersCollection.insertOne(users);
      res.json(result);
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      let isAdmin = false;

      if (result?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });

    app.put("/users", async (req, res) => {
      const users = req.body;
      const filter = { email: users.email };
      const options = { upsert: true };
      const updateDoc = { $set: users };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );

      res.json(result);
    });

    app.put("/users/admin", varifyToken, async (req, res) => {
      const user = req.body.admin;
      console.log(req.decodedEmail);
      const filter = { email: user };
      const updateDoc = { $set: { role: "admin" } };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.json(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello doctors portal");
});

app.listen(port, () => {
  console.log(`Listening to port ${port}`);
});
