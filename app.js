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
   var dbrooms =  db.collection('rooms');
   var dbmessages = db.collection('messages')
   io.on('connection',function(socket){
       console.log("client connect")
        dbrooms.find().limit(100).sort({_id:1}).toArray(function(err,res){
            //console.log(res)
            if (err){
                throw err
            }
            socket.emit('rooms',res)
        });
        socket.on('reply',function(data){
            console.log('reply')
            bot.pushTextMessage(data.groupId, data.message);
            
            var source = {userId:"cccxxsfdsfdsfsf",type:"agent"};
            var msg = {type:"text",text:data.message};
            var replyMessage = {type:"message",source:source,timestamp:Date.now(),method:"send",groupId:data.groupId,message:msg};
            
            console.log(replyMessage);
            dbmessages.update({"groupId":data.groupId},{$push:{"messages":replyMessage}});
            socket.emit('messageinroom',replyMessage);
            console.log(data);
        });
        socket.on('getmessageinroom',function(data){
            console.log('getmessageinroom')
            console.log(data)
            dbmessages.find({"groupId":data.groupId}).limit(100).toArray(function(err,res){
                //console.log(res)
                if (err){
                    throw err
                }
                socket.emit('firstmessageinroom',res)
            });
        });
   });
   bot.on(LINEBot.Events.MESSAGE, function(replyToken, message) {
    
    console.log("isUserEvent : "+ message.isUserEvent());
    console.log("isGroupEvent : "+ message.isGroupEvent());
    console.log("isRoomEvent : "+ message.isRoomEvent());
    var groupId = '';
    var groupType = '' ;
    if(message.isUserEvent()){
        groupId = message.getUserId();
        groupType = 'User' ;
    }else if (message.isGroupEvent()){
        groupId = message.getGroupId()
        groupType = 'Group' ;
    }else if (message.isRoomEvent()){
        groupId = message.getRoomId();
        groupType = 'Room' ;
    }
    
    //bot.pushTextMessage(groupdId, 'รับทราบ ++');
    if (groupId != ''){
        messageType = message.getMessageType();
        messageId = message.getMessageId();
        messageEvent = message.getEvent();
        messageEvent["method"] = "received";
        messageEvent["groupId"] = groupId;
        console.log(messageEvent)
        dbrooms.count({"groupId":groupId},function(err,room_count){
            if (room_count === 0){
                console.log('new..')
                var roomDetail = {"groupId":groupId, "channel":{"name":"LINE@","type":groupType,"members":[]}}
                dbrooms.insert(roomDetail)
                dbmessages.insert({"groupId":groupId,"messages":[messageEvent]})
                
                bot.getProfile(messageEvent.source.userId).then(function(data) {
                    console.log(data)
                    dbrooms.update({"groupId":groupId},{$push:{"members":data}});
                    roomDetail["members"].push(data)
                    var res=[];
                    res.push(roomDetail);
                    io.sockets.emit('messageinroom',messageEvent)
                    io.sockets.emit('rooms',res)
                }).catch(function(error) {
                    console.log("can not get profile")
                    var res=[];
                    res.push(roomDetail);
                    io.sockets.emit('messageinroom',messageEvent)
                    io.sockets.emit('rooms',res)
                });
                



            }else{
                console.log('exits')
                dbmessages.update({"groupId":groupId},{$push:{"messages":messageEvent}});
                io.sockets.emit('messageinroom',messageEvent);
            }
        })
    }
 
    });
});



server.listen(4200);