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
var uuid = require('node-uuid');
var ip = require('ip');

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
            socket.emit('pullRoom',res)
        });

        socket.on('replyMessage',function(data){
            console.log('replyMessage')
            bot.pushTextMessage(data.groupId, data.message);
            
            var source = {userId:ip.address(),type:"agent"};
            var id = uuid.v4()
            var msg = {type:"text",text:data.message,id:id};
            var replyMessage = {type:"message",source:source,timestamp:Date.now(),method:"send",groupId:data.groupId,message:msg};

            storeMessage(replyMessage)
            console.log(data);
        });

        socket.on('requestMessage',function(data){
            console.log('requestMessage')
            console.log(data)
            dbmessages.find({"groupId":data.groupId}).limit(100).toArray(function(err,res){
                //console.log(res)
                if (err){
                    throw err
                }
                socket.emit('pullMessage',res)
            });
        });
        socket.on('reqestEvaluation',function(data)
        {
            
              console.log(data)
              var actions = [
                new PostbackTemplateAction('Satisfied', 'https://uxteam.in/chat/?actions=buy&itemid=123'),
                new PostbackTemplateAction('OK', 'https://uxteam.in/chat/?action=add&itemid=123'),
                new PostbackTemplateAction('Dissatisfied', 'https://uxteam.in/chat/?action=add&itemid=124')
              ];
              var buttonTemplate = new ButtonTemplateBuilder('Evaluation', 'Evaluation for this service', 'https://uxteam.in/chat/image/6a00e0099631d0883301b8d2b85c78970c-800wi.gif', actions);
              var messageBuilder = new TemplateMessageBuilder('Evaluate', buttonTemplate);
              bot.pushMessage(data.groupId, messageBuilder).then(function() {

                var source = {userId:ip.address(),type:"agent"};
                var msg = {type:"text",text:"--- Evaluate for this service ---"};
                var replyMessage = {type:"message",source:source,timestamp:Date.now(),method:"send",groupId:data.groupId,message:msg};
                
            

                storeMessage(replyMessage)
              }).catch(function(error) {
                console.log(error)
              });
        });
   });

   function prepaireMessage(message)
   {
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
        messageType = message.getMessageType();
        messageEvent = message.getEvent();
        messageEvent["method"] = "received";
        messageEvent["groupId"] = groupId;
        messageEvent["groupType"] = groupType;

        if ( messageType == "image" || messageType == "video" || messageType == "file" || messageType == "audio")
        {
            bot.getMessageContent(messageEvent.message.id).then(function(data) {

                var ext = "" ;
                
                switch(data.response["headers"]["content-type"])
                {
                    case 'image/jpeg':
                        ext = ".jpg";
                        break;
                    case 'video/mp4':
                        ext = ".mp4";
                        break;
                    case 'audio/aac':
                        ext = ".aac";
                        break;
                } 
                 
                var fn = messageEvent.message.id+ext
                messageEvent["message"]["url"] = fn;
                fs.writeFile('./public/downloads/'+fn,data.body,'binary',function(err)
                {
                    if (err){
                        throw err
                    }
                    console.log("save file ok")
                });
                storeMessage(messageEvent);
            }).catch(function(error) {
                console.log("getMessageContent Error")
                console.log(error)
            });

        }
      
        storeMessage(messageEvent);
     
   }
   function storeMessage(document)
   {
        console.log(document)
       dbrooms.findOne({"groupId":document.groupId},function(err,result)
       {
           if (!result)
           {
               var roomDetail = {"groupId":document.groupId, "channel":{"name":"LINE@","type":document.groupType,"members":[{userId:document.source.userId}]}}
               dbrooms.insert(roomDetail)
               broadcast('pullRoom',[roomDetail])

               
           }
           //update member in room
           if(document.source != "agent")
           {
                bot.getProfile(document.source.userId).then(function(data) {
                    document["source"]["detail"] = data.body;
                    console.log(document)
                    dbrooms.update({"groupId":document.groupId,"channel.members.userId":document.source.userId},{$addToSet:{"channel.members":document.source.detail}});
                }).catch(function(error) {
                    console.log("getProile Error")
                    console.log(error)
                });
           }
            //update message
            dbmessages.findOne({"groupId":document.groupId},function(err,result)
            {
                if (result)
                {
                    console.log(result.message)
                    if (result.groupId == document.groupId && result.messages.message.id == document.message.id)
                    {
                        dbmessages.update({"groupId":document.groupId,"messages.message.id":document.message.id},{$addToSet:{"messages":document}})
                        
                    }
                    else if(result.groupId == document.groupId)
                    {
                        
                        dbmessages.update({"groupId":document.groupId,"messages.message.id":document.message.id},{$push:{"messages":document}})
                    }
                }
                else
                {
                    dbmessages.insert({"groupId":document.groupId,"messages":[document]})
                }
                broadcast('pullMessage',[document])
               
            })
           
           
       })
   }
   function broadcast(eventHook,messageEvent)
   {
        io.sockets.emit(eventHook,messageEvent);
   }
    bot.on(LINEBot.Events.MESSAGE, function(replyToken, message) {
        prepaireMessage(message)
    });
});



server.listen(4200);