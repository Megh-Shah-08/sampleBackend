const mongoose = require("mongoose");
const Faculty = require("./Faculty")
const recordSchema = new mongoose.Schema({
  rfid: {
    type: String,
    required: true,
  },
  timestamp:{
    type:Date,
    default :Date.now,
    required:true,
  },
  recordType:{
    type:String,
    enum:["check-in","check-out"],
    required:true,
  },
  faculty:{
    type: mongoose.Schema.Types.ObjectId,
    ref :"Faculty",
    required:true,
  }
});

const Record = mongoose.model("Record",recordSchema);
module.exports = Record;