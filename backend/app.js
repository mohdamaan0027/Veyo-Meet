import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import {router} from './routes/routes.js'
import nodemailer from 'nodemailer';
import {Server} from 'socket.io';
import {createServer} from 'http'
// import { disconnect } from 'cluster';

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
      console.log('we did')
      socket.leave(roomId);
    })

    socket.on('controlAction', (data)=>{
      const {socketVal, roomVal} = data;
      io.to(roomVal).emit('controllerActionBack', socketVal)
      console.log('we did to control')
    })

    socket.on("sendGroupChat", ({roomId, name, val})=>{
      if( !roomId || !name || !val) return;
        io.to(roomId).emit("sendGrouptChatToFrontend", {
          'name': name,
          'chat': val
        })
    })
})

export const db = new Client({
  user: 'postgres',
  password: 'Amaan12@',
  host: 'localhost',
  port: 5432,
  database: 'meeting',
})

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, 
  auth: {
    user: 'altayf427@gmail.com',
    pass: 'svdr lasm yuvz qjwz',
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