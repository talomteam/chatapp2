var express = require('express');  
var app = express();  
var server = require('http').createServer(app);  
var io = require('socket.io')(server);
var fs = require('fs');

var LINEBot = require('line-messaging');
var TextMessageBuilder = LINEBot.TextMessageBuilder;
var ImageMessageBuilder = LINEBot.ImageMessageBuilder;

// Imagemap
var ImagemapMessageBuilder = LINEBot.ImagemapMessageBuilder;
var ImagemapBaseSize = LINEBot.ImagemapBaseSize;
var ImagemapArea = LINEBot.ImagemapArea;
var ImagemapMessageAction = LINEBot.ImagemapMessageAction;
var ImagemapUriAction = LINEBot.ImagemapUriAction;

// Template
var TemplateMessageBuilder = LINEBot.TemplateMessageBuilder;
var ButtonTemplateBuilder = LINEBot.ButtonTemplateBuilder;
var ConfirmTemplateBuilder = LINEBot.ConfirmTemplateBuilder;
var CarouselColumnTemplateBuilder = LINEBot.CarouselColumnTemplateBuilder;
var CarouselTemplateBuilder = LINEBot.CarouselTemplateBuilder;
var MessageTemplateAction = LINEBot.MessageTemplateAction;
var PostbackTemplateAction = LINEBot.PostbackTemplateAction;
var UriTemplateAction = LINEBot.UriTemplateAction;

var MultiMessageBuilder = LINEBot.MultiMessageBuilder;

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
        socket.on('evaluation',function(data)
        {
            /* var actions = [
                new MessageTemplateAction('Satisfied', 'Satisfied'),
                new MessageTemplateAction('Dissatisfied ', 'Dissatisfied'),
               
              ];
              var confirmTemplate = new ConfirmTemplateBuilder('Evaluate for this service', actions);
              var messageBuilder = new TemplateMessageBuilder('this is a confirm template', confirmTemplate);
              bot.pushMessage(groupId, messageBuilder).then(function() {
               
              }); */
              console.log(data)
              var actions = [
                new PostbackTemplateAction('Satisfied', 'https://uxteam.in/chat/?actions=buy&itemid=123'),
                new PostbackTemplateAction('OK', 'https://uxteam.in/chat/?action=add&itemid=123'),
                new UriTemplateAction('Dissatisfied', 'https://uxteam.in/chat/?action=add&itemid=124')
              ];
              var buttonTemplate = new ButtonTemplateBuilder('Evaluation', 'Evaluation for this service', 'https://uxteam.in/chat/image/6a00e0099631d0883301b8d2b85c78970c-800wi.gif', actions);
              var messageBuilder = new TemplateMessageBuilder('Evaluate', buttonTemplate);
              bot.pushMessage(data.groupId, messageBuilder).then(function() {
                var source = {userId:"cccxxsfdsfdsfsf",type:"agent"};
                var msg = {type:"text",text:"---Evaluate for this service---"};
                var replyMessage = {type:"message",source:source,timestamp:Date.now(),method:"send",groupId:data.groupId,message:msg};
                
                dbmessages.update({"groupId":data.groupId},{$push:{"messages":replyMessage}});
                socket.emit('messageinroom',replyMessage);
                console.log("OK")
              }).catch(function(error) {
                console.log(error)
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
    
    if (groupId != ''){
        
        messageType = message.getMessageType();
        messageId = message.getMessageId();
        messageEvent = message.getEvent();
        messageEvent["method"] = "received";
        messageEvent["groupId"] = groupId;
        console.log(messageEvent)
        if (messageType != "text")
        {
            bot.getMessageContent(messageEvent.message.id).then(function(data) {

               var ext = "" ;

               /*  switch(data.response.headers.content)
                {

                } */
                console.log(data.response)
               fs.writeFile('./public/downloads/'+messageEvent.message.id,data.body,'binary',function(err)
               {

               })
              }).catch(function(error) {
              // add your code when error.
              console.log(error)
              });
        }
        dbrooms.count({"groupId":groupId},function(err,room_count){
            if (room_count === 0){
                console.log('new..')
                var roomDetail = {"groupId":groupId, "channel":{"name":"LINE@","type":groupType,"members":[]}}
                dbrooms.insert(roomDetail)
                dbmessages.insert({"groupId":groupId,"messages":[messageEvent]})
                
                bot.getProfile(messageEvent.source.userId).then(function(data) {
                    console.log(data.body)
                    dbrooms.update({"groupId":groupId},{$push:{"channel.members":data}});
                    roomDetail["channel"]["members"].push(data.body) 
                    io.sockets.emit('rooms',[roomDetail]) 
                });
                io.sockets.emit('messageinroom',messageEvent)
                
            }else{
                console.log('exits')
                var userId = messageEvent.source.userId;
                bot.getProfile(messageEvent.source.userId).then(function(data) {
                    //console.log(data)
                    dbrooms.update({"groupId":groupId},{$pull:{"channel.members":{"userId":userId}}});
                    dbrooms.update({"groupId":groupId},{$push:{"channel.members":data.body}});
                });
                dbmessages.update({"groupId":groupId},{$push:{"messages":messageEvent}});
                io.sockets.emit('messageinroom',messageEvent);
            }
        })
    }
 
    });
});



server.listen(4200);