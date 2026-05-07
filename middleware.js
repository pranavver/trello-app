const jwt = require("jsonwebtoken");

function authMiddleware(req,res,next){//Middleware to decode token
 const token = req.headers.token;
 if(!token){//check if request has token
   res.status(403).json({message:"You are not logged in !!!"});
   return;
 }
 
 const secret = "Secret@5647";
 const decoded = jwt.verify(token,secret);
 
  if(!decoded.userId){//check if token has id
    res.status(403).json({message: "Malfored Token"});
    return;
  }
  req.userId = decoded.userId;
  next();
}

module.exports ={
  authMiddleware
}