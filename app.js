var express = require('express');  
var app = express();  
var server = require('http').createServer(app);  
var io = require('socket.io')(server);

var LINEBot = require('line-messaging');

var mongo = require('mongodb').MongoClient;
var bot = LINEBot.Client({
    channelID: '1567873891',
    channelSecret: '38bff89c9d11e6b862a5cf8ba8ca6617',
    channelAccessToken: 'Q2mqJWInhj4b9k8uqZW7PkzRzZrcxGzdqRPd15+51V7/gBrycuwUr01H/jY9Zmh+pZkbHhqcUCe+AmytovUmEN7JZfaMnyszNvb8nQ18VVrZRpWAkts3jYdQqTLJ5cjqvXhOaKssqAe786B5bkwjcgdB04t89/1O/w1cDnyilFU='
  });

app.use(express.static(__dirname + '/public')); 
app.use(bot.webhook('/webhook'));

app.get('/', function(req, res,next) {  
    res.sendFile(__dirname + '/index.html');
});



mongo.connect('mongodb://127.0.0.1/messaging',function(err,db){
   if(err){
       throw err;
   }
   console.log('Mongo Connected...');
   var rooms =  db.collection('rooms');
   var messages = db.collection('messages')
   io.on('connection',function(socket){
        rooms.find().limit(100).sort({_id:1}).toArray(function(err,res){
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
   bot.on(LINEBot.Events.MESSAGE, function(replyToken, message) {
    console.log("message: "+ message.getText()+ " userID: "+ message.getUserId()+ " gettype: " +message.getType());
    console.log(message.getEvent())
    console.log(replyToken)
    console.log(message)
    console.log("isUserEvent : "+ message.isUserEvent());
    console.log("isGroupEvent : "+ message.isGroupEvent());
    console.log("isRoomEvent : "+ message.isRoomEvent());

    bot.pushTextMessage(message.getUserId(), 'รับทราบ ++');

    var groupdId = '';
    var groupType = '' ;
    if(message.isUserEvent()){
        groupdId = message.getUserId();
        groupType = 'User' ;
    }else if (message.isGroupEvent()){
        groupdId = message.getGroupId()
        groupType = 'Group' ;
    }else if (message.isRoomEvent()){
        groupdId = message.getGroupId();
        groupType = 'Room' ;
    }
    if (groupdId != ''){
        room_count = rooms.find({"groupId":groupdId}).count()
        if (room_count == 0){
            console.log('new..')
            messageType = message.getMessageType();
            messageId = message.getMessageId()
            rooms.insert({"groupId:":groupdId, "channnel":{"name":"LINE@","type":groupType,"members":[]}})
            messages.insert({"groupId":groupdId,"messages":[{"type":messageType,"message":message.getText(),"id":messageId}]})
        }else{
            console.log('exits')
            messageType = message.getMessageType();
            messageId = message.getMessageId();
            timestamp = message.getTimestamp();
            messages.update({"groupdId":groupdId},{$push:{"messages":{"type":messageType,"message":message.getText(),"id":messageId}}});
        }
        
    }
    
  });
   
});



server.listen(4200);