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
    channelID: '1579713337',
    channelSecret: '7f2eb2b3ac758dad3fc5106dde1fbb73',
    channelAccessToken: 'AO/T/I7gymENRS9z84JFxde/pzPUSIgikaGhkA5rOLZGi1ZONo3XiicITyIa1uDPZLO2jq31TAg57mlDIqnKIE0LRvpHl+KvhQ/+jskrMXiv972/7TPrUOoef2sJeQL4mTA77vR+anWSGHGLKzuEQgdB04t89/1O/w1cDnyilFU='
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

                dbrooms.update({"groupId":data.groupId},{$set:{"status_read":true}});
            });
        });
        socket.on('requestEvaluation',function(data)
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

        date = new Date(messageEvent.timestamp);
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var days = date.getDay();

        console.log("day "+ days + "hours " + hours +"type "+messageEvent.groupType)
        var nonWorkingHour = false
        if (messageEvent.groupType == 'User')
        {
            if(days == 0 || days == 6)
            {
                nonWorkingHour = true
            }
            if (hours <= 8 || hours >= 17)
            {
                nonWorkingHour = true
            }
        }
        
        if (nonWorkingHour)
        {
            console.log("reply "+ messageEvent.replyToken)
            var replyMessageAuto = "ขณะนี้เป็นเวลานอกทำการ ทางบริษัทขอรับเรื่องและจะดำเนินการในวันทำการต่อไปให้นะครับ @ระบบอัตโนมัติตอบกลับ"
            bot.replyTextMessage(messageEvent.replyToken, replyMessageAuto)
        }

        
     
   }
   function storeMessage(document)
   {
       console.log(document)
       dbrooms.findOne({"groupId":document.groupId},function(err,result)
       {
           if (!result)
           {
               console.log(" not exists room")
               var roomDetail = {"groupId":document.groupId,"status_read":false, "channel":{"name":"LINE@","type":document.groupType,"members":[{userId:document.source.userId}]}}
               dbrooms.insert(roomDetail)
               broadcast('pullRoom',[roomDetail])
               if (document.groupType == 'Group')
               {

                    bot.getGroupMember(document.groupId).then(function(data) {
                        console.log("getmemberinroom")
                        console.log(data);
                    }).catch(function(error) {
                        console.log("getmemberinroom")
                        console.log(error)
                    });
               }
           }
           //update member in room
           if(document.source != "agent" && document["source"]["detail"] == undefined )
           {
                bot.getProfile(document.source.userId).then(function(data) {
                    document["source"]["detail"] = data.body;
                    //console.log(document)
                   
                    dbrooms.findOne({"groupId":document.groupId,"channel.members.userId":document.source.userId},function(err,result)
                    {
                        if (result)
                        {
                            dbrooms.update({"groupId":document.groupId,"channel.members.userId":document.source.userId},{$set:{"channel.members.$":document.source.detail}});
                        }
                        else
                        {  
                            dbrooms.update({"groupId":document.groupId},{$push:{"channel.members":document.source.detail}});
                        }
                    })
                    storeMessage(document);
                }).catch(function(error) {
                    console.log("getProile Error")
                    console.log(error)
                });
           }
            //update message
            dbmessages.findOne({"groupId":document.groupId,"messages.message.id":document.message.id},function(err,result)
            {
                if (result)
                {
                    console.log("exists")
                    dbmessages.update({"groupId":document.groupId,"messages.message.id":document.message.id},{$set:{"messages.$":document}});    
                } 
                else
                {
                    dbmessages.findOne({"groupId":document.groupId},function(err,result)
                    {
                        if (result)
                        {
                            dbmessages.update({"groupId":document.groupId},{$push:{"messages":document}})
                        }
                         
                        else
                        {
                            dbmessages.insert({"groupId":document.groupId,"messages":[document]})
                        }
                    })
                }
                
                broadcast('pullMessage',[{"groupId":document.groupId,messages:[document]}])
                dbrooms.update({"groupId":document.groupId},{$set:{"status_read":false}});
               
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