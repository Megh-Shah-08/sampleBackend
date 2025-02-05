const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI=process.env.MONGO_URI;

const connectToDB = async () => {
    try {
        mongoose.connect(MONGO_URI);
        console.log("MongoDB connected Successfully!✅");
    } catch (error) {
        console.log("Error in connecting to MongoDB!❌");
    }
}

module.exports = connectToDB;