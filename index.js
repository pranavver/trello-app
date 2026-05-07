const express = require("express");
const jwt = require("jsonwebtoken");
const { authMiddleware } = require("./middleware")

const app = express();
app.use(express.json());

let USER_ID = 1;
let ORG_ID = 1;
let BOARD_ID = 1;
let ISSUE_ID = 1;


const USERS = [];
/*{id:1,
  username:"pranav",
  password:"pranav123"}*/
const ORGANIZATIONS = [];
/*{id:1,
  title:"100xdevs",
  description:"learn coding online",
  admin:1,
  members:[2]} //Member Id inside array*/
const BOARDS = [];
/*{id:1,
  title:"",
  organizationId:1}*/
const ISSUES = [];
/*{id:1,
  title:"",
  boardId:1}*/

//CURD Routes
//CREATE - Populate data
app.post("/signup",(req,res)=>{
  const username = req.body.username;
  const password = req.body.password;
  
  const userExists = USERS.find(user => user.username === username)
  if(userExists){
    res.status(403).json({message: "User already exists !!!"})
    return;
  }
  USERS.push({id: USER_ID++, username, password});
  
  res.json({stat:"success", message: "You have signed up successfully..."})
});

app.post("/login",(req,res)=>{
  const username = req.body.username;
  const password = req.body.password;
  
  const userExists = USERS.find(user => user.username === username && user.password === password)
  if(!userExists){
    res.status(403).json({message: "Wrong user credentials !!!"});
    return;
  }
  
  const payload = {userId: userExists.id};
  const secret = "Secret@5647"
  
  const token = jwt.sign(payload,secret);
  
  res.json({stat:"success",token});//means token: token
  
});

app.post("/organization",authMiddleware,(req,res)=>{
  const userId = req.userId;//for 1st admin
  const title = req.body.title;
  const desc = req.body.description;
  
  const orgExistsDb = ORGANIZATIONS.find(org => org.title === title);
  if(orgExistsDb) {
    res.status(401).json({message:"Organization title already exists"});
    return;
  }
  // if(!userId){
  //   res.status(403).json({message: "User not signed in !!!"})
  // }
  ORGANIZATIONS.push({
    id: ORG_ID++,
    title: title,
    description: desc,
    admin: userId,
    members: []
  })
  
  res.json({
    id: ORG_ID - 1,
    message: "Organization created successfully..."
  })
});

app.post("/add-member-to-org",authMiddleware,(req,res)=>{
  const userId = req.userId;//admin user id
  const orgId = parseInt(req.body.organizationId)// org id in which member to be added
  const userUsername = req.body.memberUsername;//username of user which will to added to org
  
  const orgExists = ORGANIZATIONS.find(o => o.id === orgId);
  const memberExists = USERS.find(u => u.username === userUsername);
  
  if(!orgExists || orgExists.admin !== userId){
    res.status(403).json({
      message: "Either the org not exists or you are not an admin of this org !!!"
    })
    return;
  }
// console.log("Searching for username:", userUsername);
// console.log("Type of userUsername:", typeof userUsername);
// console.log("All users currently in memory:", JSON.stringify(USERS));

// console.log("Result of find:", memberExists);
  if(!memberExists)
  {
    res.status(403).json({
      message: "User not exists !!!"
    })
    return;
  }
  
  // Prevent duplicate members (already member)
  if (orgExists.members.includes(memberExists.id)) {//or use OrgExists.members.find(m => m.id === memberExists.id) inside if, but it return compleate object not yes or no
    return res.status(400).json({ message: "User is already a member !!!" });
  }
  
  orgExists.members.push(memberExists.id);
  res.json({message: "New member added..."})
});

app.post("/board",authMiddleware,(req,res)=>{
  const userId = req.userId;
  const title = req.body.title;
  const orgId = parseInt(req.body.organizationId);
  
  const orgExists = ORGANIZATIONS.find(o => o.id === orgId);
  if(!orgExists || orgExists.admin !== userId){
    res.status(403).json({
      message: "Either the org not exists or you are not an admin of this org !!!"
    })
    return;
  }
  
  const orgBoards = BOARDS.filter(b => b.organizationId === orgId);// get all BOARD of current organization id
  if(orgBoards.some(b => b.title === title))// (check duplicate title) in any board of org //can use if(orgBoards.find(s=>s.title === title))
  {
    res.status(401).json({message: "Title alread exist in organization !!!"});
    return;
  }
  
  const newBoard ={
    id: BOARD_ID++,
    title: title,
    organizationId: orgId
  }
  BOARDS.push(newBoard);
  res.json({
    message: "Board with created successfully...",
    board: newBoard
  })
});

app.post("/issue",authMiddleware,(req,res)=>{
  const userId = req.userId;
  const title = req.body.title;
  const boardId = parseInt(req.body.boardId);
  
  const boardExists = BOARDS.find(b => b.id === boardId);
  if(!boardExists){
    res.status(403).json({message: "Board not exists !!!"});
    return;
  }
  
  const currentBoardIssues = ISSUES.filter(i=> i.boardId === boardExists.id);
  const issueExists = currentBoardIssues.find(i=>i.title === title)
  if(issueExists){
    res.status(403).json({message: "Issue title already exists !!!"});
    return;
  }
  
  const findOrg = ORGANIZATIONS.find(org => org.id === boardExists.organizationId);
  if(!findOrg) {
    res.status(401).json({message: "Organization of board's issue not exists !!!"});
    return;
  }
  
  const memberExists = findOrg.members.includes(userId);
  if(findOrg.admin !== userId || !memberExists){// if you are member or admin then only can create issue
    res.status(403).json({
      message: "You are not the member of this org to raise issue"
    })
  }
  const newIssue = {
    id: ISSUE_ID++,
    title: title,
    boardId: boardId
  }
  
  ISSUES.push(newIssue);
  res.json({
    message: "New issue created successfully...",
    issue: newIssue
  })
}); //anymember

//READ - Get endpoints
app.get("/organization",authMiddleware, (req,res)=>{
  const userId = req.userId;//org admin id
  const orgId = parseInt(req.query.organizationId);
  
  const orgExists = ORGANIZATIONS.find(org => org.id === orgId)
  if(!orgExists || orgExists.admin !== userId)
  {
    res.status(403).json({
      message: "Either the org not exists or you are not an admin of this org !!!"
    })
    return;
  }
  
  res.json({//Return 1 organition & its multiple members object
    organization:{
      ...orgExists,
      members:orgExists.members.map(memberId => {
        return {
          id: memberId,
          username: USERS.find(u => u.id === memberId).username
        }
      })
    }
  })//transform an array of member IDs into an array of objects containing the id and username by looking them up in a USERS array
})

app.get("/boards",authMiddleware, (req,res)=>{
  const userId = req.userId;
  const orgId = parseInt(req.query.organizationId);
  
  const orgExists = ORGANIZATIONS.find(org => org.id === orgId);
  if(!orgExists) {
    res.status(403).json({message: "Organization not exist !!!"});
    return;
  }
  
  if(orgExists.admin !== userId){
    res.status(403).json({message: "User not authorized to access boards"});
    return;
  }
  
  const boards = BOARDS.filter(b => b.organizationId === orgId)
  if(boards.length === 0){//if return empty [] array whisch is truthy
    res.json({message: "No boards found !!!"});
    return;
  }
  
  res.json(boards);
  
})

app.get("/issues",authMiddleware, (req,res)=>{
  const userId = req.userId;
  const boardId = parseInt(req.query.boardId);
  
  const boardExists = BOARDS.find(b=> b.id === boardId);
  if(!boardExists) {
    res.status(403).json({message: "Board not exists !!!"});
    return;
  }
  
  const orgExists = ORGANIZATIONS.find(org => org.id === boardExists.organizationId)
  
  if(!orgExists || orgExists.admin !== userId || !orgExists.members.includes(userId)) {
    res.status(403).json({message: "Organization of boards's issues not exists or you are not the admin !!!"});
    return;
  }
  
  const issues = ISSUES.filter(i=> i.boardId === boardId);//all issues of board
  
  if(issues.length === 0){
    res.json({message: "No issues exist of current board..."});
    return;
  }
  
  res.json(issues);
}) //anymember

app.get("/members",authMiddleware, (req,res)=>{
  const userId = req.userId;
  const orgId = parseInt(req.query.organizationId);
  
  const orgExists = ORGANIZATIONS.find( org => org.id === orgId);
  if(!orgExists || orgExists.admin !== userId){
    res.status(403).json({message: "Either organigation not exists or you are not the admin"});
    return;
  }
  
  res.json({
    members: orgExists.members.map(memberId=> {
      return {
        id: memberId,
        username: USERS.find(u=> u.id === memberId).username
      }
    })
  });
})

//UPDATE
app.put("/issue",authMiddleware, (req,res)=>{
  const userId = req.userId;
  const issueId= parseInt(req.body.id);
  const title = req.body.newTitle;//can also use const { title } = req.body;
  const boardId = parseInt(req.body.boardId);
  
  const boardExists = BOARDS.find(b=> b.id === boardId);
  if(!boardExists) {
    res.status(403).json({message: "Board not exists !!!"});
    return;
  }
  
  const orgExists = ORGANIZATIONS.find(org => org.id === boardExists.organizationId)
  if(!orgExists || orgExists.admin !== userId || !orgExists.members.includes(userId)) {
    res.status(403).json({message: "Organization of boards's issues not exists or you are not the admin or member !!!"});
    return;
  }

  const currentBoardIssues = ISSUES.filter(i=>i.boardId === boardId);
  const issueExists = currentBoardIssues.find(i=> i.id === issueId);
  if(!issueExists){
    res.status(403).json({message: "Issue not exists in the board !!!"});
    return;
  }
  
  const previosTitle = issueExists.title;
  
  issueExists.title = title;
  
  res.json({
    message: `Issue title updated to ${title} from ${previosTitle}`
  });
  
})//anymember

//DELETE
app.delete("/del-member-from-org",authMiddleware, (req,res)=>{
  const userId = req.userId;
  const orgId = parseInt(req.query.organizationId);
  const memberUsername = req.query.memberUsername;
  
  const orgExists = ORGANIZATIONS.find(o => o.id === orgId);
  const memberExistsDB = USERS.find(u => u.username === memberUsername);
  const memberExists = orgExists.members.includes(memberExistsDB.id);
  
  if(!orgExists || orgExists.admin !== userId){
    res.status(403).json({
      message: "Either the org not exists or you are not an admin of this org !!!"
    })
    return;
  } 
  
  if(!memberExistsDB)
  {
    res.status(403).json({
      message: "User not exists in db!!!"
    })
    return;
  }
  
  if(!memberExists)
  {
    res.status(403).json({
      message: "User not exists in organization!!!"
    })
    return;
  }
  
  
  // console.log(orgExists.members)
  
  orgExists.members = orgExists.members.filter(memId => memId !== memberExistsDB.id);h//bug......
  res.json({message: "Member deleted successfully..."})
  
})

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