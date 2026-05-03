import './auth.css';
import { useState, useEffect, useRef} from 'react';
import axios from 'axios';
import { zxcvbn } from '@zxcvbn-ts/core'
import { useNavigate } from 'react-router-dom';

function Auth () {

    const [btn, setBtn] = useState<boolean>(true);

    const [message, setMessage] = useState<string>("Please Login");

    const [forgot, setForgot] = useState<boolean>(false);

    const [disOtp, setDisOtp] = useState<boolean>(false);

    const [countDown, setCountDown] = useState<number>(0);

    const [attempts, setAttempts] = useState<number>(1);

    const [otp, setOtp] = useState<number>();

    const intervalRef = useRef<number | null>(null);

    const [fullOtp, setFullOtp] = useState<boolean>(false);

    const [correctPassword, setCorrectPassword] = useState<boolean>(false);

    const [correctPassVal, setCorrectPassVal] = useState<string>('');

    const [newMessage, setNewMessage] = useState<string>('Please Enter New Password');

    const [passwordStrength, setPasswordStrength] = useState<number>(0);

    const [isVerified, setIsVerified] = useState<boolean>(false);

    const navigate = useNavigate();

    const [authObj, setAuthObj] = useState<authInt>({
        name: "",
        password: "",
        type: "login"
    });

    interface authInt {
        name: string,
        password: string,
        confirm?: string,
        type: string,
    }

    async function register(){
        const {name, password, type} = authObj;
        if (name && password) {
            if (name && name.length < 255 && password && password?.length < 72 ){
                const result = zxcvbn(password).score;
                if (type === "register" && result < 3) {
                    setMessage(`Weak Password with a score of ${result}, score must be at least 3`);
                    return;
                }
                if(authObj.type === 'register' && authObj.password !== authObj.confirm){
                    setMessage('password and confirm password doesnt match')
                    return;
                }else{
                    try {
                        setMessage("Sent")
                        const result = await axios.post('http://localhost:3000/auth',{'name': name, 'password': password, 'type': type});
                        if (authObj.type === "login" && result.data.token) {
                            localStorage.setItem("token", result.data.token);
                            localStorage.setItem("user", JSON.stringify(result.data.user));
                            setMessage(result.data.message);
                            navigate('/home')
                        } else {
                            setMessage(result.data);
                        }
                    } catch (error) {
                        console.log(error)
                    }
                }
            }else{
                setMessage("email and password words limit are are 255 and 72")
            }
        }else{
            setMessage("Please enter email or password")
        }
    }

    async function otpFunc(){
        const mail = authObj.name;
        try {
            const result = await axios.post('http://localhost:3000/auth/otp', {mail: mail})
            setMessage(result.data)
            if(result.data === 'No recipients defined' || result.data === 'Invalid email'){
                setForgot(false);
                if (intervalRef.current){
                    clearInterval(intervalRef.current)
                    intervalRef.current = null;
                }
                setCountDown(0);
            }
        } catch (error) {
            console.log(error);
        }
    }

    function forgotPass(){
        setForgot(true);
        countDownInterval();
        otpFunc();
    }

    async function countDownInterval(){
        if(intervalRef.current){
            clearInterval(intervalRef.current);
        }
        let time = 60 * attempts;
        setCountDown(time);
        intervalRef.current = window.setInterval(()=>{
            if(time <= 0){
                clearInterval(intervalRef.current!);
                intervalRef.current = null;
                setCountDown(0);
                return;
            }
            time --;
            setCountDown(time);
        }, 1000)
    }

    async function resendOtp() {
        setAttempts(attempts + 1);
        countDownInterval();
        otpFunc();
    }

    async function otpVal(e: React.ChangeEvent<HTMLInputElement>) {
        const val = e.target.value;
        setOtp(Number(val));
        if(String(val).length === 6){
            setFullOtp(true);
            setMessage('checking otp...');
            try {
                const result = await axios.post('http://localhost:3000/auth/otpCheck', {'mail': authObj.name, 'otp': val})
                setMessage(result.data)
                if(result.data === 'good to go'){
                    setCorrectPassword(true);
                    setIsVerified(true);
                }else {
                    setFullOtp(false);
                    setOtp(NaN);
                    setIsVerified(false);
                }
            } catch (error) {
                console.log(error)
            }
        }
    }

    async function submitCorrectPass() {
        const result = zxcvbn(correctPassVal).score;
        setPasswordStrength(result);
        if(result < 3){
            setNewMessage('weak password');
            return;
        }
        try {
            const res = await axios.post('http://localhost:3000/auth/submitPass', {'mail': authObj.name, 'password': correctPassVal, 'isVerified': String(isVerified)})
            if(res.data == 0){
                setNewMessage('oops! something went wrong');
            }else {
                setMessage('Now, login with new password');
                setForgot(false);
                setCorrectPassword(false);
                setIsVerified(false);
            }
        } catch (error) {
            console.log(error)
        }
    }

    async function getMe(token: string){
        try {
            const result = await axios.get('http://localhost:3000/auth/getMe', {headers: {auth: token}});
            if(result.data){
                console.log(result.data);
                navigate('/home', {state: {
                    user: result.data
                }});
            }
        } catch (error) {
            console.log(error);
            return;
        }
    }

    useEffect(()=>{
        const myToken = localStorage.getItem("token");
        if(!myToken){
            return;
        }
        getMe(myToken);
    },[])

    useEffect(()=>{
        if(message == 'user registered, now please login your account'){
            const timer = setTimeout(()=>{
                setMessage('Please Login')
            }, 3000);
            return ()=> clearTimeout(timer);
        }
        if(message !== 'Please Login' && message !== 'Please Register'){
            const np = setTimeout(()=>{
                if(authObj.type == 'login'){
                    setMessage('Please Login')
                }else {
                    setMessage('Please Register')
                }
            }, 5000);
            return ()=> clearTimeout(np);
        }
        if(newMessage !== 'Please Enter New Password'){
            const np = setTimeout(()=>{
                setNewMessage('Please Enter New Password')
            }, 5000);
            return ()=> clearTimeout(np);
        }
    }, [message, newMessage]);

    useEffect(()=>{
        if(authObj.type === 'register'){
            if(authObj.password !== authObj.confirm){
                setMessage("password and confirmed password doesnt match")
            }else setMessage("");
        }
    }, [authObj.confirm]);

    useEffect(()=>{
        if(authObj.name.length === 0){
            setDisOtp(true);
        }else setDisOtp(false)
    },[authObj.name]);

    return (
    <div className="authBody">
        <div className="container">
            <div className="btnContainer">
                <div className="login" onClick={()=>{setBtn(true); setAuthObj({name: "", password: "", type: "login"}); setMessage("Please Login") }}>
                    <div className="btn">Login</div>
                </div>
                <div className="register" onClick={()=>{setBtn(false); setAuthObj({name: "", password: "", type: "register"}), setMessage("Please Register")}}>
                    <div className="btn">Register</div>
                </div>
            </div>
            <div className="body">
                <div className="message">{message}</div>
                {btn ? 
                <div className="loginContainer">
                    {correctPassword && <div className="correctPassword">
                        <div className="newMessage">{newMessage}</div>
                        <input minLength={8} maxLength={72} type="text" className="correctPassInput" value={correctPassVal} onChange={(e:React.ChangeEvent<HTMLInputElement>)=>{setCorrectPassVal(e.target.value)}} placeholder='Enter New Passowrd'/>
                        <button className='correctPassBtn btn' onClick={submitCorrectPass}>Submit</button>
                    </div>}
                    <input minLength={5} maxLength={255} value={authObj.name} onChange={(e:React.ChangeEvent<HTMLInputElement>)=>{setAuthObj({...authObj, name: e.target.value})}} type="email" className="email input" placeholder='type email' />
                    <input minLength={8} maxLength={72} value={authObj.password} onChange={(e:React.ChangeEvent<HTMLInputElement>)=>{setAuthObj({...authObj, password: e.target.value})}} type="password" className="password input" placeholder='type password' />
                    {forgot ? <div className="forgot">
                        <input className='otpInput' disabled={fullOtp} onChange={otpVal} value={otp} type='number' placeholder='Enter Otp'/>
                        <button className="otpBtn" disabled={countDown > 0 ? true:false} style={{'padding': '5px'}} onClick={resendOtp}>{countDown > 0? countDown : 'Resend'}</button>
                    </div> 
                    : '' }
                    <button className='loginBtn btnS' onClick={register}>Login</button>
                    <button className="forgotPass" disabled={ disOtp || forgot ? true : false } onClick={forgotPass} style={{'textAlign': 'center', 'margin': '5px', 'cursor': 'pointer', 'height': '10%' ,'width': '15%', 'padding': '3px'}}>Forgot Password ?</button>
                </div>
                : 
                <div className="registerContainer">
                    <input value={authObj.name} minLength={5} maxLength={255} onChange={(e:React.ChangeEvent<HTMLInputElement>)=>{setAuthObj({...authObj, name: e.target.value})}} type="email" className="email input" placeholder='enter gmail here' />
                    <input value={authObj.password} minLength={8} maxLength={72} onChange={(e:React.ChangeEvent<HTMLInputElement>)=>{setAuthObj({...authObj,password: e.target.value})}} type="password" className="password input" placeholder='enter password here'/>
                    <input type="password" onChange={(e:React.ChangeEvent<HTMLInputElement>)=>{setAuthObj({...authObj, confirm: e.target.value})}} className="confirmPassword input" placeholder='enter password again' minLength={8} maxLength={72}/>
                    <button className='registerBtn btnS' onClick={register}>Register</button>
                </div>
                }  
            </div>
        </div>
    </div>
    )
}

export default Auth;