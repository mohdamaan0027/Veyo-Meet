import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import {router} from './routes/routes.js'
import nodemailer from 'nodemailer';
import {Server} from 'socket.io';
import {createServer} from 'http'
// import { disconnect } from 'cluster';
import cloudinary from "./config/cloudinary.js";

dotenv.config();

const app = express();
const server = createServer(app);
const {Client} = pg;
const roomArr = new Map();

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME ,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

io.on('connection', (socket)=>{
    console.log('connected with id:', socket.id)

    socket.on('dbUpdate', async (data)=>{
      const {email} = data.user;
      const {socket} = data;
      console.log(`connected email: ${email} with id: ${socket}`)
      try {
        await db.query('UPDATE users SET socket = $1 WHERE email = $2', [socket, email])
      } catch (error) {
        console.log(error)
      }
    })

    socket.on("roomJoin", (data, callback) => {
      const { roomId } = data;
      socket.join(roomId);
      const existing = roomArr.get(roomId);
      if (existing) {
        socket.emit("whiteBoard", existing);
      } else {
        socket.emit("whiteBoard", { elements: [], appState: {} });
      }
      callback("success");
    });

    socket.on('acceptance', (data, response)=>{
      const {name, leadersocket, mySocket} = data;
      socket.to(leadersocket).emit('leaderAcceptance', {name: name, socket: mySocket});
    })

    socket.on('sendApproval', (myData)=>{
      const {type, mySocket} = myData;
      socket.to(mySocket).emit('resultAcceptance', type);
    })
    
    socket.on('updateParticipants', (data) => {
      const { room_id, socket_id, name , user_id} = data;

      if (!room_id) {
        console.log('room_id missing in updateParticipants');
        return;
      }

      socket.join(room_id);

      console.log(`${socket.id} joined room after approval: ${room_id}`);
      console.log('emitting userJoinedMessage to room:', room_id);

      io.to(room_id).emit('userJoinedMessage', {
        socket_id,
        name,
        user_id
      });
    });

    socket.on("whiteBoard", (data) => {
      const { roomId, elements, appState } = data;
      if (!roomId) return;

      roomArr.set(roomId, { elements, appState });
      socket.to(roomId).emit("whiteBoard", { elements, appState });
    });

    socket.on("leaveMyRoom", (roomId) => {
      socket.leave(roomId);
    });

    socket.on('disconnectedData', (data)=>{
      const {room} = data;
      console.log('disconnected data:', data)
      io.to(room).emit('declareUserDisconnected', data)
    })

    socket.on('leaderLeft', async ({roomId})=>{
      socket.to(roomId).emit('leaderLeftToFrontend');
      await db.query('UPDATE rooms SET live = false WHERE room_id = $1', [roomId])
      socket.leave(roomId);
    })

    socket.on('controlAction', (data)=>{
      const {socketVal, roomVal} = data;
      io.to(roomVal).emit('controllerActionBack', socketVal)
    })

    socket.on("sendGroupChat", ({roomId, name, val})=>{
      if( !roomId || !name || !val) return;
        io.to(roomId).emit("sendGrouptChatToFrontend", {
          'name': name,
          'chat': val
        })
    })

    socket.on('poll', (e)=>{
      const {roomId, data, poll} = e;

      const pollId = Date.now();

      io.to(roomId).emit('receivePoll', {
        pollId,
        poll,
        data
      })
    })

    socket.on('pollOpt', ({quesId, userName, leaderSocket, pollId})=>{
      console.log('in backedn', userName)
      socket.to(leaderSocket).emit('pollOptRecieve', {
        'quesId': quesId,
        'userName': userName,
        'pollId': pollId
      })
    })

    socket.on('ques', (data)=>{
      const {roomId, val} = data;
      console.log(data);
      io.to(roomId).emit('receiveQues', {
        'val': val
      })
    })

    socket.on('ansVal', (data)=>{
      const {leadersocket, ansVal, userName, quesId} = data;
      socket.to(leadersocket).emit('ansValReceive', {
        'userName': userName,
        'ansVal': ansVal,
        'quesId': quesId
      })
    })

    socket.on('exitMeeting', async ({roomId, socketId, isLeader, userName})=>{
      io.to(roomId).emit('userExitMessage', {
        'socketId': socketId,
        'isLeader': isLeader,
        'userName': userName
      })
      if(isLeader){
        await db.query('UPDATE rooms SET live = false WHERE room_id = $1', [roomId])
        socket.leave(roomId);
      }
    })

    socket.on("voice:join", ({ roomId, userName }) => {
        const room = io.sockets.adapter.rooms.get(roomId);

        // Get existing users BEFORE joining
        const existingUsers = room
            ? [...room].filter(id => id !== socket.id)
            : [];

        socket.join(roomId);

        socket.emit("voice:existing-users", existingUsers);

        socket.to(roomId).emit("voice:user-joined", { socketId: socket.id });
    });

    socket.on("voice:offer", ({ to, offer, roomId }) => {
        io.to(to).emit("voice:offer", { from: socket.id, offer });
    });

    socket.on("voice:answer", ({ to, answer, roomId }) => {
        io.to(to).emit("voice:answer", { from: socket.id, answer });
    });

    socket.on("voice:ice-candidate", ({ to, candidate, roomId }) => {
        io.to(to).emit("voice:ice-candidate", { from: socket.id, candidate });
    });

    socket.on("voice:leave", ({ roomId }) => {
        socket.to(roomId).emit("voice:user-left", { socketId: socket.id });
    });

    socket.on('askForControl', ({leaderSocket, socketId, userName})=>{
      socket.to(leaderSocket).emit('askForControlToLeader', {
        socketId,
        userName
      })
    })
    
})

export const db = new Client({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host:process.env.DB_HOST,
  port: 5432,
  database: process.env.DB_DATABASE
})

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

db.connect()
.then(()=>{
    console.log('hehe.. connected')
})
.catch((err)=>{
    console.log(err);
})

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(router);

server.listen(3000, ()=>{
    console.log('Server is running on port 3000');
})