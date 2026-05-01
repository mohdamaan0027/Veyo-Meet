import {auth, myOtp, otpCheck, submitPass, getMe} from '../controller/controller.js';
import {check} from '../middleware/middleware.js';
import express from 'express';

export const router = express.Router();

router.post('/auth', auth);
router.post('/auth/otp', myOtp);
router.post('/auth/otpCheck', otpCheck);
router.post('/auth/submitPass', submitPass)
router.get('/auth/getMe', check, getMe);

