const express = require("express");
const app = express();
const cors = require("cors");
const connectToDB = require("./db");
require("dotenv").config();
const PORT = process.env.PORT || 3000;
const Faculty = require("./models/Faculty");
const Record = require("./models/Record");
const nodemailer = require("nodemailer");
const cron = require("node-cron");
// Create a transport object using your email provider details
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "shahmegh810@gmail.com", // Your email
    pass: "rqaawvnrvkhzdoha", // Your email password or app-specific password
  },
});

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

    mailBody = `
    <h4>Dear ${savedDoc.name},</h4>
    <p>Thanks for registering at the Faculty Work Hour Tracker.</p><br>
    <p>Your details are as given below : </p>
    <p><b>Phone Number </b>: ${savedDoc.number} </p>
    <p><b>Email ID </b>: ${savedDoc.email} </p>
    <p><b>RFID </b>: ${savedDoc.rfid} </p>
    <br>
    <p>Regards,<br>Team SBMP</p>`;
    const mailOptions = {
      from: "shahmegh810@gmail.com", // Your email
      to: savedDoc.email, // Recipient's email
      subject: "Registered for Faculty Work Hour Tracker!", // Email subject
      html: mailBody, // Email body
    };

    await transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).send("Error occurred: " + error.message);
      }
      console.log("Email sent: " + info.response);
    });
    return res.status(201).json({ message: "Success", faculty: savedDoc });
  } catch (e) {
    console.log(`Error in registering the faculty : ${e}`);
    return res.status(500).json({ message: "Internal Server Error" ,error:e});
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
      .sort({ timestamp: -1, _id: -1 })
      .limit(1);

    console.log("Last record is : ", lastRecord);
    let recordType;
    if (!lastRecord) {
      recordType = "check-in";
    } else {
      recordType =
        lastRecord.recordType === "check-in" ? "check-out" : "check-in";
    }

    if (recordType == "check-out" && lastRecord.recordType == "check-in") {
      let duration = Date.now() - lastRecord.timestamp;
      let durationInHours = duration / (1000 * 60 * 60);
      // console.log(`Duration : ${duration}`);
      user.workingDuration += duration;
      let durationLeft = 40 * 60 * 60 * 1000 - user.workingDuration; //pending hours
      let durationLeftInHours = durationLeft / (1000 * 60 * 60);
      console.log(`Duration Left : ${durationLeftInHours}`);

      let lastRecordTimestamp = new Date(lastRecord.timestamp);
      let checkInTime = lastRecordTimestamp.toLocaleTimeString();
      let currentRecordTimestamp = new Date(Date.now());
      let checkOutTime = currentRecordTimestamp.toLocaleTimeString(); 
      mailBody = `
      <h4>Dear ${user.name}</h4>
      <p><b>Check-In Today </b>: ${checkInTime}</p>
      <p><b>Check-Out Today </b>: ${checkOutTime}<p>
      <p><b>Today's Work Duration </b>: ${durationInHours.toFixed(7)} <p>
      <p><b>Week's Working Hour Left </b>: ${durationLeftInHours.toFixed(7)} <p>
      <br>
      <p>Regards,<br>Team SBMP</p>`;
      const mailOptions = {
        from: "shahmegh810@gmail.com", // Your email
        to: user.email, // Recipient's email
        subject: "DAILY WORK HOUR REPORT", // Email subject
        html: mailBody, // Email body
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          return res.status(500).send("Error occurred: " + error.message);
        }
        console.log("Email sent: " + info.response);
      });
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

app.post("/deleteAll", async (req, res) => {
  try {
    await Record.deleteMany({});
    await Faculty.updateMany({}, { $set: { records: [] } });
    return res
      .status(500)
      .json({ message: "All RFID records deleted succesfully! " });
  } catch (e) {
    return res.status(500).json({ message: "Internal Server Error", error: e });
  }
});

app.get("/hello", (req, res) => {
  res.send("Hello Route Requested!");
});


//This function schedules resetting of faculty's working duration to 0 on each monday midnight
cron.schedule("0 0 * * 1",async()=>{
  try{
    await Faculty.updateMany({},{workingDuration:0});
    console.log("Fcaulty working duration reset to zero!");
  }catch(e){
    console.log(`Error resetting working hours: ${e}`);
  }
})

app.listen(PORT, () => {
  console.log(`App Listening at PORT ${PORT} 🚀`);
});
