const mongoose = require("mongoose");

const readingSchema = new mongoose.Schema({
  place: {
    type: String,
    required: true,
  },
  temperature: {
    type: Number,
    required: true,
  },
  humidity: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

const Reading = mongoose.model("Reading", readingSchema);
module.exports = Reading;
