import {auth, myOtp, otpCheck, submitPass, getMe, createMeeting} from '../controller/controller.js';
import {check} from '../middleware/middleware.js';
import express from 'express';

export const router = express.Router();

// auth routes from here----->
router.post('/auth', auth);
router.post('/auth/otp', myOtp);
router.post('/auth/otpCheck', otpCheck);
router.post('/auth/submitPass', submitPass)
router.get('/auth/getMe', check, getMe);

// home ruotes from here------>
router.post('/home/createMeeting', createMeeting);

