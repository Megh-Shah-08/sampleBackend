const express = require("express");
const Reading = require("../models/Reading");
const router = express.Router();

router.post("/readings", async (req, res) => {
  const { place, temperature, humidity } = req.body;
  try {
    const newReading = new Reading({
      place,
      temperature,
      humidity,
    });
    const savedReading = await newReading.save();
    console.log(savedReading)
    res
      .status(201)
      .json({ message: "Reading Added Successfully", Reading: savedReading });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error!",error:error });
  }
});

router.get("/readings", async (req, res) => {
  const { place, duration } = req.query;

  if (!place) {
    return res.status(400).json({ message: "Place not mentioned!" });
  }
  const filter = { place };
  const now = new Date();

  if (duration == "hour") {
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    filter.timestamp = { $gte: oneHourAgo };
  } else if (duration == "day") {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    filter.timestamp = { $gte: startOfDay };
  }

  const readings = await Reading.find(filter).sort({ timestamp: -1 });

  res.status(200).json({
    message: "Readings fetched Succesfully!",
    readings: readings,
    count: readings.length,
  });
});
module.exports = router;
