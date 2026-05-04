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

  socket.on('roomJoin', (data, callback)=>{
    const {roomId} = data;
    console.log(data);
    socket.join(roomId);
    callback('success');
  })

  socket.on('disconnect', ()=>{
    console.log('disconnected with id:', socket.id)
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