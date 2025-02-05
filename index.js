const express = require("express");
const app = express();
const cors = require("cors");
const connectToDB = require("./db");
require("dotenv").config();
const PORT = process.env.PORT||3000;
const Faculty = require("./models/Faculty");
const Record = require("./models/Record");

const { hashPassword } = require("./utils");
app.use(express.json());
app.use(cors());
connectToDB(); //connecting to the mongoDB database
app.get("/", (req, res) => {
  console.log("'/' requested!");
  res.send("Hello World!");
});

app.post("/register", async (req, res) => {
  const { name, password, number, email, rfid } = req.body;
  const userExists = await Faculty.findOne({
    $or: [{ email }, { number }, { rfid }],
  });
  // console.log(`UserExists: ${userExists}`);
  if (userExists) {
    return res.status(400).json({ message: "Faculty already Exists" });
  }

  const hashedPassword = await hashPassword(password);
  try {
    const FacultyDoc = new Faculty({
      name,
      password: hashedPassword,
      number,
      email,
      rfid,
    });
    savedDoc = await FacultyDoc.save();
    console.log(`Faculty Registered : ${savedDoc}`);
    return res.status(201).json({ message: "Success", faculty: savedDoc });
  } catch (error) {
    console.log(`Error in registering the faculty : ${error}`);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/scan", async (req, res) => {
  const { rfid } = req.body;
  const user = await Faculty.findOne({ rfid }).populate("records");
  // console.log(user);
  // console.log(JSON.stringify(user));
  if (!user) {
    return res
      .status(400)
      .json({ message: "Faculty Doesn't Exist, Register First!" });
  }
  try {
    const lastRecord = await Record.findOne({ rfid })
      .sort({ timestamp: -1,_id:-1 })
      .limit(1);

    console.log("Last record is : ",lastRecord);
    let recordType;
    if (!lastRecord) {
      recordType = "check-in";
    } else {
      recordType =
        lastRecord.recordType === "check-in" ? "check-out" : "check-in";
    }

    if(recordType=="check-out" && lastRecord.recordType=="check-in"){
      let duration = Date.now() - lastRecord.timestamp;
      // console.log(`Duration : ${duration}`);
      user.workingDuration+=duration;
      let durationLeft = (40*60*60*1000) - user.workingDuration; //pending hours
      let durationLeftInHours = durationLeft/(1000*60*60);
      console.log(`Duration Left : ${durationLeftInHours}`)
    }
    const newRecord = new Record({
      rfid,
      recordType: recordType,
      faculty: user._id,
    });
    const savedRecord = await newRecord.save();
    user.records.push(savedRecord._id);
    const savedUser = await user.save();
    // console.log(savedUser);
    return res
      .status(200)
      .json({ message: "Record Added Successfully!", record: savedRecord });
  } catch (e) {
    return res.status(500).json({ message: "Internal Server Error", error: e });
  }
});

app.post("/deleteAll",async(req,res)=>{
  try{
    await Record.deleteMany({});
    await Faculty.updateMany({},{$set:{records:[]}});
    return res.status(500).json({ message: "All RFID records deleted succesfully! "});
  }catch(e){
    return res.status(500).json({ message: "Internal Server Error", error: e });
  }  
})

app.get("/hello", (req, res) => {
  res.send("Hello Route Requested!");
});

app.listen(PORT, () => {
  console.log(`App Listening at PORT ${PORT} 🚀`);
});
