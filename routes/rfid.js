const express = require("express");
const nodemailer = require("nodemailer");
const cron = require("node-cron");
const Faculty = require("../models/Faculty");
const Record = require("../models/Record");
const { hashPassword } = require("../utils");
const moment = require("moment-timezone");
const router = express.Router();
// Create a transport object using your email provider details
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "shahmegh810@gmail.com", // Your email
    pass: "rqaawvnrvkhzdoha", // Your email password or app-specific password
  },
});

router.post("/register", async (req, res) => {
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
    return res.status(500).json({ message: "Internal Server Error", error: e });
  }
});

router.post("/scan", async (req, res) => {
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
      let checkInTime = new Date(lastRecord.timestamp);
      let checkOutTime = new Date(moment().tz("Asia/Kolkata").format());
      let duration = checkOutTime - checkInTime;
      let durationInHours = duration / (1000 * 60 * 60);
      // console.log(`Duration : ${duration}`);
      user.workingDuration += duration;
      let durationLeft = 40 * 60 * 60 * 1000 - user.workingDuration; //pending hours
      let durationLeftInHours = durationLeft / (1000 * 60 * 60);
      console.log(`Duration Left : ${durationLeftInHours}`);

      mailBody = `
        <h4>Dear ${user.name}</h4>
        <p><b>Check-In Today </b>: ${checkInTime.toLocaleTimeString()}</p>
        <p><b>Check-Out Today </b>: ${checkOutTime.toLocaleTimeString()}</p>
        <p><b>Today's Work Duration </b>: ${durationInHours.toFixed(3)} </p>
        <p><b>Week's Working Hour Left </b>: ${durationLeftInHours.toFixed(
          3
        )} </p>
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
    console.log("Using the lib : ", moment().tz("Asia/Kolkata").format());
    const newRecord = new Record({
      rfid,
      timestamp: moment().tz("Asia/Kolkata").format(),
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

router.post("/deleteAll", async (req, res) => {
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

//This function schedules resetting of faculty's working duration to 0 on each monday midnight
cron.schedule("0 0 * * 1", async () => {
  try {
    await Faculty.updateMany({}, { workingDuration: 0 });
    console.log("Fcaulty working duration reset to zero!");
  } catch (e) {
    console.log(`Error resetting working hours: ${e}`);
  }
});

module.exports = router;
