var http=require('http');
var url=require('url');
var fs=require('fs');
var users=[];
//var jsonFile = require('jsonfile');

var server=http.createServer(function(req, res){
    // parse the pathname as a url  
    var path=url.parse(req.url).pathname;  
     
    switch(true){                         
        case path=='/':
            fs.readFile(__dirname +'/chatclient.html', function(err, data){            
               if(err) return send404(res);
                res.writeHead(200, {'content-type':'text/html'})
                res.write(data, 'utf8');
                res.end();
            });
            break;
        default:send404(res);
    }
}),
    // utility functions
send404=function(res){
        res.writeHead(404);
        res.write('404');
        res.end();
    };
server.listen(8080);

function save(users){
    let userJSON=JSON.stringify(users);
    try{
        fs.writeFileSync(__dirname +'/users.json', userJSON);
    }
    catch(err){
        console.log(err);
    }
}

function getusers(){
    var  ret=[];
    ret= JSON.parse(fs.readFileSync(__dirname + '/users.json', 'utf8'));
    // fs.readFile(__dirname + '/sample.txt', function(err, data){
    //     if(err) throw err;
    //   //  var parser=new JSONParser();
    //   console.log("read "+data);
    //    ret=  JSON.parse(data); // got all the users here.
    // }); 
    return ret;
}

function getuser(name){
    var userID="";
    users.forEach(function(user){
        if(user.user_name===name){
            userID= user.id;
        }
    });
    return userID;
}

//let users=getusers();

var io=require('socket.io').listen(server);

io.sockets.on('connection', function(socket){
    
    //console.log(socket);
    
   console.log("Connection"+ socket.id+" accepted");    
   
    socket.on('disconnect', function(){
       console.log("Connection"+socket.id+" terminated");
    });

    // when we recieve a message send it to all connected clients
    // socket.on('message', function(message){
    //     console.log("Received message: "+message+" from client "+socket.id);
    //     // relay message to all connected clients
    //     io.sockets.emit('chat', socket.id, message);

      
    // });

    
    socket.on('new user', function(name){
        //initialise socket name;
        socket.user_name=name;

       // console.log(user);
        users=getusers();
        users.forEach(user => {
            if(user.user_name===name && user.id != socket.id){  // user is stored, but id is diff, so he must have disconnected or reconnected,                  
                   user.id=socket.id;  //so update ID value                                   
                   save(users);
                }   
        });
            
        if(getuser(name)==="") {
            // its a new username
            var userOBJ={
                id:socket.id,
                user_name:name,
               };
               users.push(userOBJ);
               save(users);
        }
        users=getusers();       
        io.sockets.emit('users', users); // send new users to all clients      
    });

    // socket.on('connect to user', function(user){
    //    var recipientID=getuser(user);
    //     socket.broadcast.to(recipientID).emit('chat',socket.id,"hello"+user);
    //    io.sockets.socket(recipientID).emit('chat', socket.id, "hello");
    // });
  
        
     



    socket.on('subscribe', function(subscribeObj){   
        var recipientID=getuser(subscribeObj.User);
        console.log('joining room',subscribeObj.Room);
        socket.join(subscribeObj.Room);
         io.to(recipientID).emit('chat invite',{
            Room: subscribeObj.Room ,
            Invitee:socket.id,
            Message: socket.user_name+" wants to chat"
             });
        });

        socket.on('invitation accept',function(accepted_invitation){
        console.log("invitation accept server from "+socket.user_name);
        var inviteeID=accepted_invitation.invitee;
        socket.join(accepted_invitation.Room);
        io.to(inviteeID).emit('CommLine Established', {
            Message:socket.user_name+" has accepted your invitation"
        });
        });    


        socket.on('send message', function(room, message){
        console.log("Received message: "+message+" from client "+socket.id);
        // relay message to all connected clients
        socket.broadcast.to(room).emit('chat', socket.user_name, message);
        });


});