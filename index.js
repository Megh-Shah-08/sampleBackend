const express = require("express");
const app = express();

const cors = require("cors");
const connectToDB = require("./db");
require("dotenv").config();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(cors());

connectToDB(); //connecting to the mongoDB database

//HOME ROUTE
app.get("/", (req, res) => {
  console.log("'/' requested!");
  res.send("Hello World!");
});

//A DEMO HELLO ROUTE
app.get("/hello", (req, res) => {
  res.send("Hello Route Requested!");
});

app.use("/api/rfid", require("./routes/rfid"));
app.use("/api/dht22", require("./routes/dht22"));

app.listen(PORT, () => {
  console.log(`App Listening at PORT ${PORT} 🚀`);
});
