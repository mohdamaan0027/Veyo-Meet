import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {io} from 'socket.io-client';
import './home.css';
import axios from 'axios';

const socket = io("http://localhost:3000");

function Home () {

    const location = useLocation();
    const user = location.state?.user;
    const navigate = useNavigate();

    const [searchMeetingsVal, setSearchMeetingsVal] = useState<string>('');
    const [section, setSection] = useState<boolean>(true);
    const [meetingIdInputVal, setMeetingIdInputVal] = useState<string>('');
    const [meetingIdPassVal, setMeetingIdPassVal] = useState<string>('');

    function updateDb(){
        console.log(socket.id)
        socket.emit('dbUpdate', {
            'user': user,
            'socket': socket.id
        })
    }

    useEffect(()=>{
        socket.on('connect', updateDb);
    }, [])

    async function createMeeting(){
        const idVal = String(meetingIdInputVal);
        const passVal = String(meetingIdPassVal);
        if(idVal.length <= 8) return;
        if(passVal.length > 0 && passVal.length !== 8) return;
        try {
            const result = await axios.post('http://localhost:3000/home/createMeeting', {
                'userId': user.id,
                'roomId': meetingIdInputVal,
                'roomPass': meetingIdPassVal
            })
            if(result.data === 'success'){
                socket.emit('roomJoin', {
                    id: user.id,
                    roomId: idVal,
                })
            }
        } catch (error) {
            console.log(error);
        }
    }

    function navigateBack(){
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/auth");
    }

    useEffect(()=>{
        if(!user){
            navigate('/auth')
        }
    }, [user])
    
    return (
        <div className="home">
            <div className="homeLogout" onClick={navigateBack}>Logout</div>
            <div className="homeBody">
                <div className="searchMeetingsInputContainer">
                    <input type="text" value={searchMeetingsVal} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>{setSearchMeetingsVal(e.target.value);}} className="searchMeetings homeInput" placeholder="Search Live Meetings by Room ID" />
                    <button className="searchHome">Search</button>
                </div>
                <div className="homeManageBody">
                    <div className="homeManageBtn">
                        <button className="meetingManageBtn homeBtn" onClick={()=>{setSection(true)}}>Meeting</button>
                        <button className="screenshotManageBtn homeBtn" onClick={()=>{setSection(false)}}>Records</button>
                    </div>
                    <div className="homeManageContainer">
                        {section ?        
                            <div className="createMeetingSection">
                                <input type="text" value={meetingIdInputVal} onChange={(e:React.ChangeEvent<HTMLInputElement>)=>{setMeetingIdInputVal(e.target.value)}} className="meetingIdInput homeInput createMeetingInput" placeholder="Create Room Id of length more than 8"/>
                                <input type="password" value={meetingIdPassVal} onChange={(e:React.ChangeEvent<HTMLInputElement>)=>{setMeetingIdPassVal(e.target.value)}} className="meetingIdPass homeInput createMeetingInput" placeholder="(Optional) Password Length Must be of 8"/>
                                <button onClick={createMeeting} className="createMeetingsBtn submitHomeBtn">Create Meeting</button>
                            </div>
                            :
                            <div className="screenshotSection">
                                thats screenshot section biraather
                            </div>
                        }
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Home;