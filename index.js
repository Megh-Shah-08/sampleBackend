const express = require("express");
const app = express();
const cors = require("cors");
const PORT = 3000;

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  console.log("'/' requested!");
  res.send("Hello World!");
});

app.post("/register",(req,res)=>{
  const {name,password,number,email,rfid} = req.body;
  
  console.log("User Registered")
})

// app.get("/hello",(req,res)=>{
//   res.send("Hello Route Requested!")
// })

app.listen(PORT, () => {
  console.log(`App Listening at PORT ${PORT} `);
});
