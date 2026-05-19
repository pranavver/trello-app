const jwt = require("jsonwebtoken");
require("dotenv").config();

function authMiddleware(req,res,next){//Middleware to decode token
try{
 const token = req.headers.token;
 if(!token){//check if request has token
   res.status(403).json({message:"You are not logged in !!!"});
   return;
 }
 
 const secret = process.env.JWT_SECRET;
 const decoded = jwt.verify(token,secret);
 
  if(!decoded.userId){//check if token has id
    res.status(403).json({message: "Malfored Token"});
    return;
  }
  req.userId = decoded.userId;
  next();
}
catch(error)  {
  console.error(error);
}
}

module.exports ={
  authMiddleware
}