const mongoose = require("mongoose");
require("dotenv").config(); // or import "dotenv/config" in type ES module

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("MongoDB Connected...");
  } catch (err) {
    console.error("Connection failed:", err);
    process.exit(1); // Stop the app if it can't talk to the database
  }
};

connectDB();


const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const userSchema = new Schema({
  username: {type: String, unique: true},
  password: String
});

const orgSchema = new Schema({
  title:String,
  description:String,
  admin: { type: ObjectId, ref: 'users' },
  members:[{ type: ObjectId, ref: 'users' }]
});
  
const boardSchema = new Schema({
  title: {type: String, unique: true},
  organizationId: { type: ObjectId, ref: "organizations" }
},{
  timestamps: true
});

const issueSchema = new Schema({
  title: {type: String, unique: true},
  boardId: { type: ObjectId, ref: "boards" }
},{ 
  timestamps: true
});

const userModel = mongoose.model("users",userSchema); //Here "users" is the collection/table name in Database
const orgModel = mongoose.model("organizations",orgSchema);
const boardModel = mongoose.model("boards", boardSchema);
const issueModel = mongoose.model("issues", issueSchema);

module.exports = {
  userModel,
  orgModel,
  boardModel,
  issueModel
}