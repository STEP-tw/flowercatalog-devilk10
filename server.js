let fs = require('fs');
const timeStamp = require('./time.js').timeStamp;
const http = require('http');
const WebApp = require('./webapp');
let registered_users = [{userName:'chetan',name:'chetan sangle'},{userName:'ketan',name:'ketan sangle'}];
let toS = o=>JSON.stringify(o,null,2);
let commentsFile = require('./data/comments.json');

let getFileContents = function(filename, res) {
  let defaultDir='./public';
  let filePath = defaultDir + filename;
  if (fs.existsSync(filePath))
    return fs.readFileSync(filePath);
  return false;
};

let logRequest = (req,res)=>{
  let text = ['------------------------------',
    `${timeStamp()}`,
    `${req.method} ${req.url}`,
    `HEADERS=> ${toS(req.headers)}`,
    `COOKIES=> ${toS(req.cookies)}`,
    `BODY=> ${toS(req.body)}`,''].join('\n');
  fs.appendFile('request.log',text,()=>{});

  console.log(`${req.method} ${req.url}`);
}
let loadUser = (req,res)=>{
  let sessionid = req.cookies.sessionid;
  let user = registered_users.find(u=>u.sessionid==sessionid);
  if(sessionid && user){
    req.user = user;
  }
};
let redirectLoggedInUserToHome = (req,res)=>{
  if(req.urlIsOneOf(['/login','/guestBook.html']) && req.user) res.redirect('/userBook.html')
}
let redirectLoggedOutUserToLogin = (req,res)=>{
  if(req.urlIsOneOf(['/logout','/userBook.html']) && !req.user) res.redirect('/guestBook.html');
}

let serveFile = (url,req,res)=>{
  let contents = getFileContents(url);
  if (contents)
    res.write(contents);
  else
    handleUnsupportedURL(res);
  res.end();
};

let handleUnsupportedURL = function (res) {
  res.statusCode = 404;
  res.write("page not found");
};

let recordComment = function (dateS,timeS,name,comment) {
  commentsFile.unshift(`<p class="comments"> ${dateS} ,
    ${timeS}  by ${name} <br> ${comment} </p>`);
  fs.writeFile("./data/comments.json", JSON.stringify(commentsFile), function(err) {
    if (err) return;
  });
};

let app = WebApp.create();
app.use(logRequest);
app.use(loadUser);
app.use(redirectLoggedInUserToHome);
app.use(redirectLoggedOutUserToLogin);
app.get('/login',(req,res)=>{
  res.setHeader('Content-type','text/html');
  if(req.cookies.logInFailed) res.write('<p>logIn Failed</p>');
  res.write('<form method="POST"> <input name="userName"><input name="place"> <input type="submit"></form>');
  res.end();
});
app.post('/login',(req,res)=>{
  let user = registered_users.find(u=>u.userName==req.body.userName);
  if(!user) {
    res.setHeader('Set-Cookie',`logInFailed=true`);
    res.redirect('/login');
    return;
  }
  let sessionid = new Date().getTime();
  res.setHeader('Set-Cookie',`sessionid=${sessionid}`);
  user.sessionid = sessionid;
  res.redirect('/userBook.html');
});
app.get('/logout',(req,res)=>{
  res.setHeader('Set-Cookie',[`loginFailed=false,Expires=${new Date(1).toUTCString()}`,`sessionid=0,Expires=${new Date(1).toUTCString()}`]);
  delete req.user.sessionid;
  res.redirect('/login');
});
app.get('/userBook.html',(req,res)=>{
  let contents = getFileContents('/userBook.html');
  res.write(contents+commentsFile.join('\n'));
  res.end();
});
app.get('/guestBook.html',(req,res)=>{
  let contents = getFileContents('/guestBook.html');
  res.write(contents+commentsFile.join('\n'));
  res.end();
});
app.post('/comment',(req,res)=>{
  let date=new Date();
  let name=req.body.name;
  let comment=req.body.comment;
  let dateS=date.toLocaleDateString();
  let timeS=date.toLocaleTimeString();
  recordComment(dateS,timeS,name,comment);
  res.redirect('/userBook.html');
});
app.postUse(serveFile);


const PORT = 5000;
let server = http.createServer(app);
server.on('error',e=>console.error('**error**',e.message));
server.listen(PORT,(e)=>console.log(`server listening at ${PORT}`));
