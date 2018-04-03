var express = require('express');  
var app = express();  
var server = require('http').createServer(app);  
var io = require('socket.io')(server);
var LINEBot = require('line-messaging');

var mongo = require('mongodb').MongoClient;

app.use(express.static(__dirname + '/public'));  
app.get('/', function(req, res,next) {  
    res.sendFile(__dirname + '/index.html');
});
var bot = LINEBot.Client({
    channelID: '1567873891',
    channelSecret: '38bff89c9d11e6b862a5cf8ba8ca6617',
    channelAccessToken: 'Q2mqJWInhj4b9k8uqZW7PkzRzZrcxGzdqRPd15+51V7/gBrycuwUr01H/jY9Zmh+pZkbHhqcUCe+AmytovUmEN7JZfaMnyszNvb8nQ18VVrZRpWAkts3jYdQqTLJ5cjqvXhOaKssqAe786B5bkwjcgdB04t89/1O/w1cDnyilFU='
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

        bot.on(LINEBot.Events.MESSAGE, function(replyToken, message) {
            console.log(replyToken)
            console.log(message)
          });


   });
   
});



server.listen(4200);