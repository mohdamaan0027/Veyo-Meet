import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import {router} from './routes/routes.js'
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
const {Client} = pg;

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

app.get('/', (req, res)=>{
    res.send('hey');
})

app.listen(3000, ()=>{
    console.log('Server is running on port 3000');
})