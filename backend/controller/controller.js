import {db} from '../app.js';
import { transporter } from '../app.js';
import bcrypt, { compareSync } from 'bcrypt';
import {z} from 'zod';
import jwt from 'jsonwebtoken';

let otpArr = [];

const authSchema = z.object({
    name: z.string().email("Invalid email").max(255, "Email is too long"),
    password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password must be less than 72 characters"),
    type: z.enum(["login", "register"])
});

const otpRequestSchema = z.object({
    mail: z.string().email("Invalid email").max(255, "Email is too long")
});

const otpCheckSchema = z.object({
    mail: z.string().email("Invalid email").max(255, "Email is too long"),
    otp: z.string().regex(/^\d{6}$/, "OTP must be exactly 6 digits")
});

const submitPassSchema = z.object({
    mail: z.string().email("Invalid email").max(255, "Email is too long"),
    password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password must be less than 72 characters"),
    isVerified: z.string().min(4, "not verified")
});

function getValidationError(error) {
    return error.issues[0]?.message || "Invalid input";
}

const auth = async (req, res)=>{

    const v = authSchema.safeParse(req.body);
    if (!v.success) {
        return res.status(200).send(getValidationError(v.error));
    }
    const { name, password, type } = v.data;

    if (type === 'login'){
        const check = await db.query("SELECT * FROM users WHERE email = $1", [name]);
        if(check.rowCount === 0){
            return res.status(200).send('oops! email not found');
        }
        const user = check.rows[0];
        const isValid = await bcrypt.compare(password, user.password_hash);
        if(!isValid){
            return res.status(200).send('password incorrect')
        }else {
            const token = jwt.sign({
                id: user.id,
                email: user.email
            }, process.env.JWT_SECRET, {
                expiresIn: process.env.JWT_EXPIRES_IN
            })
            return res.status(200).json({
                message: 'good to go',
                token,
                user : {
                    id: user.id,
                    email: user.email
                }
            })
        }

    } else if (type === 'register'){
        const check = await db.query('SELECT * FROM users WHERE email = $1', [name]);
        if(check.rowCount > 0){
            return res.send('user already registered');
        }else{
            try {
                const hashPassword = await bcrypt.hash(password, 12);
                await db.query("INSERT INTO users(email, password_hash) values($1, $2)", [name, hashPassword]);
                return res.status(200).send('user registered, now please login your account');
            } catch (error) {
                console.log(error);
                return res.status(400).send(error);
            }
        }
    }else {
        return res.status(200).send('oops! something went wrong');
    }
}

const myOtp = async (req, res) => {

    const v = otpRequestSchema.safeParse(req.body);
    if(!v.success){
        return res.status(200).send(getValidationError(v.error))
    }
    const {mail} = v.data;

    const result = await db.query('SELECT * FROM users WHERE email = $1', [mail]);
    if(result.rowCount === 0){
        res.status(200).send('No recipients defined');
        return;
    }else {
        let attempts = otpArr.filter((e)=>{
            console.log('checked', e.mail)
            return e.mail === mail
        })
        if(attempts.length > 2){
            const newTime = attempts[attempts.length - 1].time;
            const remTime = Math.round((newTime - Date.now())/60000);
            if(remTime > 0){
                res.status(200).send(`Please try again after ${remTime} mins`);
                return;
            }
        }
        const otp = Math.floor(100000 + Math.random() * 900000);
        otpArr.push({'mail': mail, 'otp': otp , 'time': Date.now() + 1000 * 60 * 10});
        try {
            console.log('trying..')
            await transporter.sendMail({
                from: 'altayf427@gmail.com',
                to: mail,
                subject: "Your password reset OTP",
                text: `Your OTP is ${otp}. It will expire in 10 minutes. Never share this OTP with anyone.`,
                html: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                        <h2>Password Reset Request</h2>
                        <p>You requested to reset your password.</p>
                        <p>Your OTP is:</p>
                        <h1 style="letter-spacing: 4px;">${otp}</h1>
                        <p>If you did not request this, you can safely ignore this email.</p>
                        <p><strong>Never share this OTP with anyone.</strong></p>
                    </div>
                `
            });
            return res.status(200).send('Otp Sent');
        } catch (err) {
            if(err.message === 'No recipients defined'){
                otpArr = otpArr.filter((e)=>{
                    return e.mail != mail;
                })
                console.log('reset',otpArr)
                return res.status(200).send(err.message);
            }else res.status(400).send(err)
        }
    }
}

const otpCheck = async(req, res)=>{
    const v = otpCheckSchema.safeParse({...req.body, otp: String(req.body.otp)});
    if(!v.success){
        return res.status(200).send(getValidationError(v.error));
    }
    const {mail, otp} = v.data;
    const checkArr = otpArr.filter((e)=>{
        return e.mail === mail
    });
    if(checkArr.length === 0){
        return res.status(200).send('otp not requrested')
    }
    const remTime = (checkArr[checkArr.length - 1].time - Date.now())/60000;
    if(Number(checkArr[checkArr.length - 1].otp) == otp && remTime > 0){
        return res.status(200).send('good to go')
    }else {
        return res.status(200).send('otp invalid')
    }
}

const submitPass = async (req, res)=>{
    const v = submitPassSchema.safeParse(req.body);
    if(!v.success){
        return res.status(200).send(getValidationError(v.error))
    }
    const {mail, password, isVerified} = v.data;
    if(!mail || !password){
        return res.status(200).send('email or password not sent');
    }
    if(!isVerified){
        return res.status(200).send('user not verified, try again later');
    }
    console.log(v.data);
    try {
        const hashPassword = await bcrypt.hash(password, 12)
        const result = await db.query('UPDATE users SET password_hash = $1 WHERE email = $2',[hashPassword, mail]);
        return res.status(200).send(result.rowCount);
    } catch (error) {
        console.log(error)
        return res.send(error.message)
    }
}

const getMe = async (req, res)=>{
    try {
        const result = await db.query('SELECT * FROM users WHERE id = $1', [req.users.id]);
        if(result.rowCount === 0){
            return res.status(400).send('no user found');
        }
        return res.status(200).json(result.rows[0])
    } catch (error) {
        console.log(error);
        return res.status(400).send(error);
    }
}

const createMeeting = async(req, res)=>{
    const {userId, roomId, roomPass, name, leadersocket} = req.body;
    if(!userId || !roomId) return;
    try {
        const result = await db.query('INSERT INTO rooms(room_id, password, leader, leadername, leadersocket) VALUES($1, $2, $3, $4, $5) RETURNING *', [roomId, roomPass, userId, name, leadersocket]);
        const id = result.rows[0].id;
        try {
            await db.query("UPDATE users SET rooms = array_append(COALESCE(rooms, '{}'::int[]), $1::int) WHERE id = $2", [id, userId]);
            res.status(200).send({
                result: 'success',
                data: result.rows[0]
            });
        } catch (error) {
            console.log(error);
            res.status(400).send(error);
        }
    } catch (error) {
        console.log(error);
        return res.status(400).send(error)
    }
}

const searchMeeting = async (req, res)=>{
    const {search} = req.body;
    if(!search) return;
    try {
        const result = await db.query("SELECT * FROM rooms WHERE room_id = $1 and live = true", [search]);
        return res.status(200).json(result.rows);
    } catch (error) {
        console.log(error);
        return res.status(400).send(error);
    }
}

const searchMe = async (req, res)=>{
    const {id} = req.body;
    if(!id) return res.status(400).send('id missing');
    try {
        const result = await db.query('select * from users where id = $1', [id]);
        const user = result.rows[0];
        return res.status(200).json(user);
    } catch (error) {
        
    }
}

const joinUser = async (req, res)=>{
    const {room_id, name, id, socket_id, room_join_id} = req.body;
    const user = {
        name: name,
        id: id,
        socket_id: socket_id
    }
    try {
        await db.query("UPDATE users SET rooms = array_append(COALESCE(rooms, '{}'::int[]), $1::int) WHERE id = $2",[room_id, id]);
        console.log(JSON.stringify([user]))
        try {
            const result = await db.query("UPDATE rooms SET participants = COALESCE(participants, '[]'::jsonb) || $1::jsonb where id = $2 returning *", [JSON.stringify([user]), room_id]);
            res.status(200).json(result.rows[0])
        } catch (error) {
            console.log(error);
            return res.status(400).send(error);
        }
    } catch (error) {
        console.log(error);
        return res.status(400).send(error)
    }
}

const groupChat = async (req, res)=>{
    const {name, val, roomId} = req.body;
    if(!name || !val || !roomId) return;
    try {
        await db.query('UPDATE rooms SET live_chat = live_chat || $1::jsonb WHERE room_id = $2', [JSON.stringify([{'name': name, 'chat': val}]), roomId]);
        res.status(200).send('success');
    } catch (error) {
        console.log(error);
        res.status(400).send(error)
    }
}

export {auth, myOtp, otpCheck, submitPass, getMe, createMeeting, searchMeeting, joinUser, searchMe, groupChat};