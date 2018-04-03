var express = require('express');  
var app = express();  
var server = require('http').createServer(app);  
var io = require('socket.io')(server);

var mongo = require('mongodb').MongoClient;

app.use(express.static(__dirname + '/public'));  
app.get('/', function(req, res,next) {  
    res.sendFile(__dirname + '/index.html');
});

mongo.connect('mongodb://127.0.0.1/messaging',function(err,db){
   if(err){
       throw err;
   }
   console.log('Mongo Connected...');
   
   io.on('connection',function(socket){
        var room =  db.collection('rooms');

        room.find().limit(100).sort({_id:1}).toArray(function(err,res){
            if (err){
                throw err
            }
            socket.emit('rooms',res)
        });

        socket.on('reply',function(data){
            console.log('reply')
            console.log(data);
        });
        socket.on('getmessageinroom',function(data){
            console.log('getmessageinroom')
            console.log(data);
        });




   });
   
});



server.listen(4200);