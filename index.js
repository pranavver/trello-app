const express = require("express");
const jwt = require("jsonwebtoken");
const { authMiddleware } = require("./middleware")
const { userModel, orgModel, boardModel, issueModel } = require("./db")
require("dotenv").config();//importing and running config() simultaniously
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

// let USER_ID = 1;
// let ORG_ID = 1;
// let BOARD_ID = 1;
// let ISSUE_ID = 1;


// const USERS = [];
// /*{id:1,
//   username:"pranav",
//   password:"pranav123"}*/
// const ORGANIZATIONS = [];
// /*{id:1,
//   title:"100xdevs",
//   description:"learn coding online",
//   admin:1,
//   members:[2]} //Member Id inside array*/
// const BOARDS = [];
// /*{id:1,
//   title:"",
//   organizationId:1}*/
// const ISSUES = [];
/*{id:1,
  title:"",
  boardId:1}*/

//CURD Routes
//CREATE - Populate data
app.post("/signup", async (req,res)=>{
  try{
    const username = req.body.username;
    const password = req.body.password;
    
    // const userExists = USERS.find(user => user.username === username)
    const userExists = await userModel.findOne({ username: username });
    //or use .exists({ username }), which is slightly more performant as it returns only the ID if found!
    if(userExists){
      res.status(403).json({message: "User already exists !!!"})
      return;
    }
    // USERS.push({id: USER_ID++, username, password});
    const newUser = await userModel.create({
      username: username,
      password: await bcrypt.hash(password, 10)//saltRounds = 10
    })
    
    res.json({ 
      id: newUser._id,
      message: "You have signed up successfully..."})
  }
  catch(error){
    console.error(error);
    res.status(500).json({message: "Internal Server Error"});
    return;
  }
});

app.post("/login", async (req,res)=>{
  try{
    const username = req.body.username;
    const password = req.body.password;
    
    // const userExists = USERS.find(user => user.username === username && user.password === password)
    const userExists = await userModel.findOne({username});// return whole object
    // const userExists = userModel.exists({username});//return _id only
    if(!userExists){
      res.status(403).json({message: "User not exists"});
      return;
    }
    const passwordMatch = await bcrypt.compare(password, userExists.password);
    //bcrypt.compare(plainPassword, EncryptedPassword)
    if(!passwordMatch){
      res.status(403).json({message: "Wrong user credentials !!!"});
      return;
    }
    
    const payload = {userId: userExists.id};// mongoose will automatically return _id.toString()
    const secret = process.env.JWT_SECRET;
    
    const token = jwt.sign(payload,secret);
    
    res.json({token});//means token: token
  }
  catch(error){
    console.error(error);
    res.status(500).json({message: "Internal Server Error"});
    return;
  }
});

app.post("/organization",authMiddleware, async (req,res)=>{
  try{
    const userId = req.userId;//for 1st admin
    const title = req.body.title;
    const desc = req.body.description;
    
    // const orgExistsDb = ORGANIZATIONS.find(org => org.title === title);
    const orgExistsDb = await orgModel.findOne({title});
    if(orgExistsDb) {
      res.status(401).json({message:"Organization title already exists"});
      return;
    }
    // if(!userId){
    //   res.status(403).json({message: "User not signed in !!!"})
    // }
    
    // ORGANIZATIONS.push({
    //   id: ORG_ID++,
    //   title: title,
    //   description: desc,
    //   admin: userId,
    //   members: []
    // })
    
    const newOrg = await orgModel.create({
      title: title,
      description: desc,
      admin: userId,
      members: []
    })
    
    // res.json({
    //   id: ORG_ID - 1,
    //   message: "Organization created successfully..."
    // })
    
    res.json({
      id: newOrg._id,
      message: "Organization created successfully..."
    })
  }
  catch(error){
    console.error(error);
    res.status(500).json({message: "Internal Server Error"});
    return;
  }
});

app.post("/add-member-to-org",authMiddleware, async (req,res)=>{
  try{
    const userId = req.userId;//admin user id
    // const orgId = parseInt(req.body.organizationId)// org id in which member to be added
    const orgId = req.body.organizationId;
    const userUsername = req.body.memberUsername;//username of user which will to added to org
    
    // const orgExists = ORGANIZATIONS.find(o => o.id === orgId);
    const orgExists = await orgModel.findOne({ _id: orgId });
    if(!orgExists || orgExists.admin.toString() !== userId){
      res.status(403).json({
        message: "Either the org not exists or you are not an admin of this org !!!"
      })
      return;
    }
  // console.log("Searching for username:", userUsername);
  // console.log("Type of userUsername:", typeof userUsername);
  // console.log("All users currently in memory:", JSON.stringify(USERS));
  
  // console.log("Result of find:", memberExists);
  
  // const memberExists = USERS.find(u => u.username === userUsername);
  const memberExists = await userModel.findOne({username:userUsername});
    if(!memberExists)
    {
      res.status(403).json({
        message: "User not exists !!!"
      })
      return;
    }
    
    // Prevent duplicate members (already member)
    //orgExists.members.includes(memberExists.id)
    if (orgExists.members.some(id => id.toString() === memberExists._id.toString())) {//or use OrgExists.members.m => m.id === memberExists.id) inside if, but it return compleate object not yes or no
      return res.status(400).json({ message: "User is already a member !!!" });
    }
    
    // orgExists.members.push(memberExists.id);
    orgExists.members.push(memberExists._id);
    await orgExists.save();
    res.json({message: "New member added..."})
  }
  catch(error){
    console.error(error);
    res.status(500).json({message: "Internal Server Error"});
    return;
  }
});

app.post("/board",authMiddleware, async (req,res)=>{
  try{
    const userId = req.userId;
    const title = req.body.title;
    // const orgId = parseInt(req.body.organizationId);
    const orgId = req.body.organizationId;
    
    // const orgExists = ORGANIZATIONS.find(o => o.id === orgId);
    const orgExists = await orgModel.findOne({ _id: orgId });
    if(!orgExists || orgExists.admin.toString() !== userId){
      res.status(403).json({
        message: "Either the org not exists or you are not an admin of this org !!!"
      })
      return;
    }
    
    // const orgBoards = BOARDS.filter(b => b.organizationId === orgId);// get all BOARD of current organization id
    
    // if(orgBoards.some(b => b.title === title))// (check duplicate title) in any board of org //can use if(orgBoards.s=>s.title === title))
    // {
    //   res.status(401).json({message: "Title alread exist in organization !!!"});
    //   return;
    // }
    
    // Check for duplicate board title within the organization
    const boardExists = await boardModel.findOne({
      organizationId: orgId,
      title: title
    })
    if(boardExists)
    {
      res.status(401).json({message: "Title alread exist in organization !!!"});
      return;
    }
    
    // const newBoard ={
    //   id: BOARD_ID++,
    //   title: title,
    //   organizationId: orgId
    // }
    const newBoard = await boardModel.create({
      title: title,
      organizationId: orgId//automatically typecasted as ObjectId by mongoose
    });
    
    // BOARDS.push(newBoard);
    res.json({
      message: "Board created successfully...",
      board: newBoard
    })
  }
  catch(error){
    console.error(error);
    res.status(500).json({message: "Internal Server Error"});
    return;
  }
});

app.post("/issue",authMiddleware, async (req,res)=>{
  try{
    const userId = req.userId;
    const title = req.body.title;
    // const boardId = parseInt(req.body.boardId);
    const boardId = req.body.boardId;
    
    // const boardExists = BOARDS.find(b => b.id === boardId);
    const boardExists = await boardModel.findOne({_id:boardId});
    if(!boardExists){
      res.status(403).json({message: "Board not exists !!!"});
      return;
    }
    
    // const currentBoardIssues = ISSUES.filter(i=> i.boardId === boardExists.id);
    // const issueExists = currentBoardIssues.find(i=>i.title === title)
    // if(issueExists){
    //   res.status(403).json({message: "Issue title already exists !!!"});
    //   return;
    // }
    
    const issueExists = await issueModel.findOne({
      boardId:boardId,
      title: title
    })
    if(issueExists){
      res.status(403).json({message: "Issue title already exists !!!"});
      return;
    }
    
//     console.log("Board found:", boardExists);
// console.log("Looking for Org with ID:", boardExists.organizationId);


    
    // const findOrg = ORGANIZATIONS.find(org => org.id === boardExists.organizationId);
    const findOrg = await orgModel.findOne({_id: boardExists.organizationId})
    if(!findOrg) {
      res.status(401).json({message: "Organization of board's issue not exists !!!"});
      return;
    }
    
    const memberExists = findOrg.members.some(id => id.toString() === userId);
    if(findOrg.admin.toString() !== userId && !memberExists){// if you are member or admin then only can create issue
      res.status(403).json({
        message: "You are not the member of this org to raise issue"
      })
      return;
    }
    // const newIssue = {
    //   id: ISSUE_ID++,
    //   title: title,
    //   boardId: boardId
    // }
    
    const newIssue = await issueModel.create({
      title: title,
      boardId: boardId
    })
    
    // ISSUES.push(newIssue);
    res.json({
      message: "New issue created successfully...",
      issue: newIssue
    })
  }
  catch(error){
    console.error(error);
    res.status(500).json({message: "Internal Server Error"});
    return;
  }
}); //anymember

//READ - Get endpoints
app.get("/organization",authMiddleware, async (req,res)=>{
  try{
    const userId = req.userId;//org admin id
    // const orgId = parseInt(req.query.organizationId);
    const orgId = req.query.organizationId;
    
    // const orgExists = ORGANIZATIONS.org => org.id === orgId)
    const orgExists = await orgModel.findOne({_id: orgId}).populate("members","username");
    if(!orgExists || orgExists.admin.toString() !== userId)
    {
      res.status(403).json({
        message: "Either the org not exists or you are not an admin of this org !!!"
      })
      return;
    }
    
    // res.json({//Return 1 organition & its multiple members object
    //   organization:{
    //     ...orgExists,
    //     members:orgExists.members.map(memberId => {
    //       return {
    //         id: memberId,
    //         username: USERS.u => u.id === memberId).username
    //       }
    //     })
    //   }
    // })//transform an array of member IDs into an array of objects containing the id and username by looking them up in a USERS array
  
    // Fetch all matching users from the database at once using $in -> way 1 withod ref->reference
      // const memberDetails = await userModel.{
      //   _id: { $in: orgExists.members }
      // }, "username"); // Only retrieve the username field for performance
  
      // // 3. Map the retrieved users into your desired output format
      // return res.json({
      //   organization: {
      //     ...orgExists.toObject(), // Safe conversion to plain object
      //     members: memberDetails.map(user => ({
      //       id: user._id,
      //       username: user.username
      //     }))
      //   }
      // });
    
    //way 2
    // res.json({
    //   organization: {
    //     title: orgExists.title,
    //     description: orgExists.description,
    //     admin: orgExists.admin,
    //     members: orgExists.members.map(user => ({// use this after populate the orgExists
    //       id: user._id,
    //       username: user.username
    //     }))
    //   }
    // })
    
    const members = await userModel.find({_id: orgExists.members});// get id(s) of only organization members
    
    res.json({
      organization: {
        title: orgExists.title,
        description: orgExists.description,
        admin: orgExists.admin,
        members: members.map(m => ({
          id: m._id,
          username: m.username
        }))
      }
    })
  }
  catch(error){
    console.error(error);
    res.status(500).json({message: "Internal Server Error"});
    return;
  }
});

app.get("/boards",authMiddleware, async (req,res)=>{
  try{
    const userId = req.userId;
    // const orgId = parseInt(req.query.organizationId);
    const orgId = req.query.organizationId;
    
    // const orgExists = ORGANIZATIONS.org => org.id === orgId);
    const orgExists = await orgModel.findOne({_id:orgId});
    if(!orgExists) {
      res.status(403).json({message: "Organization not exist !!!"});
      return;
    }
    
    if(orgExists.admin.toString() !== userId){
      res.status(403).json({message: "User not authorized to access boards"});
      return;
    }
    
    // const boards = BOARDS.filter(b => b.organizationId === orgId)
    const boards = await boardModel.find({organizationId: orgExists._id})
    if(boards.length === 0){//if return empty [] array which is truthy
      res.json({message: "No boards found !!!"});
      return;
    }
    
    res.json(boards);
  }
  catch(error){
    console.error(error);
    res.status(500).json({message: "Internal Server Error"});
    return;
  }
});

app.get("/issues",authMiddleware, async (req,res)=>{
  try{
    const userId = req.userId;
    const boardId = req.query.boardId;
    // const boardId = parseInt(req.query.boardId);
    
    // const boardExists = BOARDS.find(b=> b.id === boardId);
    const boardExists = await boardModel.findOne({_id:boardId});
    if(!boardExists) {
      res.status(403).json({message: "Board not exists !!!"});
      return;
    }
    
    // const orgExists = ORGANIZATIONS.find(org => org.id === boardExists.organizationId)
    const orgExists = await orgModel.findOne({_id:boardExists.organizationId});
    
    if(!orgExists || (orgExists.admin.toString() !== userId && !orgExists.members.some(u=> u.toString() === userId))) {
      res.status(403).json({message: "Organization of boards's issues not exists or you are not the admin !!!"});
      return;
    }
    
    // const issues = ISSUES.filter(i=> i.boardId === boardId);//all issues of board
    const issues = await issueModel.find({boardId: boardId});
    
    if(issues.length === 0){
      res.json({message: "No issues exist of current board..."});
      return;
    }
    
    res.json(issues);
  }
  catch(error){
    console.error(error);
    res.status(500).json({message: "Internal Server Error"});
    return;
  }
}) //anymember

app.get("/members",authMiddleware, async (req,res)=>{
  try{
    const userId = req.userId;
    // const orgId = parseInt(req.query.organizationId);
    const orgId = req.query.organizationId;
    
    // const orgExists = ORGANIZATIONS.find( org => org.id === orgId);
    const orgExists = await orgModel.findOne({_id:orgId}).populate("members","username").lean();
    if(!orgExists || orgExists.admin.toString() !== userId){
      res.status(403).json({message: "Either organigation not exists or you are not the admin"});
      return;
    }
    
    res.json({
      members: orgExists.members.map(memberId=> ({
          id: memberId._id,
          // id: memberId,
          // username: USERS.find(u=> u.id === memberId).username
          username: memberId.username
      }))
    });
  }
  catch(error){
    console.error(error);
    res.status(500).json({message: "Internal Server Error"});
    return;
  }
});

//UPDATE
app.put("/issue",authMiddleware, async (req,res)=>{
  try{
    const userId = req.userId;
    // const issueId= parseInt(req.body.id); 
    const issueId= req.body.id;
    const title = req.body.newTitle;//can also use const { title } = req.body;
    const boardId = req.body.boardId;
    // const boardId = parseInt(req.body.boardId);
    
    // const boardExists = BOARDS.find(b=> b.id === boardId);
    const boardExists = await boardModel.findOne({_id: boardId});
    if(!boardExists) {
      res.status(403).json({message: "Board not exists !!!"});
      return;
    }
    
    // const orgExists = ORGANIZATIONS.find(org => org.id === boardExists.organizationId)
    const orgExists = await orgModel.findOne({_id: boardExists.organizationId});
    if(!orgExists || (orgExists.admin.toString() !== userId && !orgExists.members.some(u=> u.toString() === userId))) {
      res.status(403).json({message: "Organization of boards's issues not exists or you are not the admin or member !!!"});
      return;
    }
  
    // const currentBoardIssues = ISSUES.filter(i=>i.boardId === boardId);
    // const issueExists = currentBoardIssues.find(i=> i.id === issueId);
    const issueExists = await issueModel.findOne({_id: issueId, boardId: boardId});
    if(!issueExists){
      res.status(403).json({message: "Issue not exists in the board !!!"});
      return;
    }
    
    const previosTitle = issueExists.title;
    
    issueExists.title = title;
    await issueExists.save();
    
    res.json({
      message: `Issue title updated to ${title} from ${previosTitle}`
    });
  }
  catch(error){
    console.error(error);
    res.status(500).json({message: "Internal Server Error"});
    return;
  }
});//anymember

//DELETE
app.delete("/del-member-from-org",authMiddleware, async (req,res)=>{
  try{
    const userId = req.userId;
    const orgId = req.query.organizationId;//type string
    // const orgId = parseInt(req.query.organizationId);
    const memberUsername = req.query.memberUsername;
    
    // const orgExists = ORGANIZATIONS.find(o => o.id === orgId);
    // const memberExistsDB = USERS.find(u => u.username === memberUsername);
    // const memberExists = orgExists.members.includes(memberExistsDB.id);
    const orgExists = await orgModel.findOne({_id:orgId});
    
    if(!orgExists || orgExists.admin.toString() !== userId){
      res.status(403).json({
        message: "Either the org not exists or you are not an admin of this org !!!"
      })
      return;
    } 
    
    // if(!memberExistsDB)
    // {
    //   res.status(403).json({
    //     message: "User not exists in db!!!"
    //   })
    //   return;
    // }
    
    
    const memberExists = await userModel.findOne({username:memberUsername})
    if(!memberExists || !orgExists.members.some(id=> id.toString() === memberExists._id.toString()))
    {
      res.status(403).json({
        message: "User not exists in organization!!!"
      })
      return;
    }
    
    
    
    // console.log(orgExists.members)
    
    // orgExists.members = orgExists.members.filter(memId => memId !== memberExistsDB.id);//bug......
    
    //METHOD 1 -> 2 trips (Fetch, then Save)
    // orgExists.members = orgExists.members.filter(memId => memId.toString() !== memberExists._id.toString());
    // await orgExists.save();
    
    await orgModel.updateOne(
      {_id: orgId},
      { $pull: { members: memberExists._id  } }//$pull remove all instance of a value from array | one direct write trip
      );
    
    res.json({message: "Member deleted successfully..."})
  }
  catch(error){
    console.error(error);
    res.status(500).json({message: "Internal Server Error"});
    return;
  }
});

app.get("/",function (req,res){
  res.sendFile("/home/trello/public/index.html");
});

app.get("/signup", (req,res)=>{
  res.sendFile("/home/trello/public/signup.html");
});

app.get("/dashboard", (req,res)=>{
  res.sendFile("/home/trello/public/dashboard.html");
});

app.get("/createorg", (req,res)=>{
  res.sendFile("/home/trello/public/createorg.html");
});

app.get("/inviteMembers", (req,res)=>{
  res.sendFile("/home/trello/public/inviteMembers.html");
});

app.listen(3001,()=>{console.log("Server running at port 3001")})