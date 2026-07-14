import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {io} from 'socket.io-client';
import './home.css';
import axios from 'axios';
import { nanoid } from "nanoid";

export const socket = io("http://localhost:3000");

function Home () {

    const location = useLocation();
    let user = location.state?.user;
    const navigate = useNavigate();

    const [searchMeetingsVal, setSearchMeetingsVal] = useState<string>('');
    const [section, setSection] = useState<boolean>(true);
    const [meetingNameInputVal, setMeetingNameInputVal] = useState<string>('');
    const [meetingIdPassVal, setMeetingIdPassVal] = useState<string>('');
    const [passwordReq, setPasswordReq] = useState<boolean>(false);
    const [searchResults, setSearchResults] = useState<boolean>(false);
    const [userName, setUserName] = useState<string>('');
    const [userPass, setUserPass] = useState<string>('');
    const [wrongId, setWrongId] = useState<boolean>(false);
    const [wrongPass, setWrongPass] = useState<boolean>(false);
    const [myId, setMyId] = useState<string>('');
    const [hasCopied, setHasCopied] = useState<boolean>(false);
    const [disableEnter, setDisableEnter] = useState<boolean>(false);
    const [clickedDownload, setClickedDownload] = useState<boolean>(false);

    const [meetingResults, setMeetingResults] = useState<results>({
        id: null,
        leader: '',
        leadername: '',
        participants: [],
        password: '',
        room_id: '',
        leadersocket: ''
    });

    const [recordArr, setRecordArr] = useState<Array<recordInter>>();

    interface recordInter{
        room_id: string,
        participants: Array<recordPartiInter>
        leadername: string,
        created_at: string
    }

    interface recordPartiInter{
        id: number,
        name: string,
        socket_id: string
    }

    interface results {
        id?: number | null,
        leader: string,
        leadername: string,
        participants: Array<object>,
        password: string,
        room_id: string,
        leadersocket: string
    }

    const meetingResultsRef = useRef(meetingResults);
    const userNameRef = useRef(userName);
    const searchMeetingsValRef = useRef(searchMeetingsVal);
    const userRef = useRef(user);

    async function updateDb(){
        let currentUser = user;
        if(!currentUser?.email){ 
            const token = localStorage.getItem("user");
            const id =  token && JSON.parse(token).id;
            if(!id){
                navigate('/auth');
                return;
            }
            try {
                const result = await axios.post('http://localhost:3000/home/searchMe', {id: id});
                currentUser = result.data;
            } catch (error) {
                console.log(error);
                return;
            }
        }
        if(!socket.id) return;
        socket.emit('dbUpdate', {
            'user': currentUser,
            'socket': socket.id
        })
    }

    async function createMeeting(){
        const idVal = myId;
        const passVal = meetingIdPassVal;
        const name = meetingNameInputVal;
        if(passVal.length > 0 && passVal.length !== 8) return;
        if(name.length < 3) return;
        try {
            const result = await axios.post('http://localhost:3000/home/createMeeting', {
                'userId': user.id,
                'roomId': idVal,
                'roomPass': meetingIdPassVal,
                'name': name,
                'leadersocket': socket.id
            })
            if (result.data.result === 'success') {
                const { room_id } = result.data.data;

                socket.emit('roomJoin', { roomId: room_id }, (response: string) => {
                    if (response === 'success') {
                    navigate('/meeting', {
                        state: {
                        data: result.data.data
                        }
                    });

                    console.log('room has been successfully joined');
                    } else {
                    console.log('oops! something went wrong');
                    }
                });
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

    async function copyId(){
        await navigator.clipboard.writeText(myId);
        setHasCopied(true);
    }

    async function searchMeeting() {
        setWrongId(false);
        const val = searchMeetingsVal;
        if(!val) return;
        try {
            const result = await axios.post('http://localhost:3000/home/searchMeeting', {search: val});
            if(result.data[0].length <= 0){
                setWrongId(true);
                return;
            }
            if(result.data[0].password.length > 0) setPasswordReq(true);
            setSearchResults(true);
            setMeetingResults(result.data[0]);
        } catch (error) {
            setWrongId(true);
            console.log(error);
        }
    }

    async function joinMeeting(){
        console.log('clicked')
        setWrongPass(false);
        if(!userName) return;
        if(passwordReq && !userPass) return;
        if(userPass == meetingResults.password){
            socket.emit('acceptance', {name: userName, leadersocket: meetingResults.leadersocket, mySocket: socket.id});
            setDisableEnter(true);
        }else setWrongPass(true);
    }

    async function resourceDownload(e: React.MouseEvent<HTMLElement>) {
        const roomId = e.currentTarget.dataset.room;
        if(clickedDownload) return;
        try {
            setClickedDownload(true);
            const result = await axios.post(`http://localhost:3000/home/downloadRecord/${roomId}`);
            if(result.status == 404){
                alert('No resources found for this meeting');
                setClickedDownload(false);
                return;
            }else {
                const {zipUrl} = result.data;
                const link = document.createElement('a');
                link.href = zipUrl;
                link.download = `resources_${roomId}.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(()=>{
                    setClickedDownload(false);
                }, 25000)
            }
        } catch (error) {
            alert('No resource found for this meeting');
            setClickedDownload(false);
            console.log(error);
        }
    }

    useEffect(()=>{
        console.log('from home', recordArr);
    }, [recordArr])

    useEffect(()=>{
        const latestUser = userRef.current
        if(latestUser && latestUser.length <= 0) return;
        async function setUpRecord(){
            try {
                console.log('we tried');
                const userRooms = latestUser.rooms;
                const result = await axios.post('http://localhost:3000/home/setRecord', userRooms);
                if(result.status == 200){
                    setRecordArr(result.data);
                }
            } catch (error) {
                console.log(error);
                return;
            }
        }
        setUpRecord();
    }, [user, socket.id])

    useEffect(() => {
        async function finalAcceptance(type: boolean) {
            const latestMeeting = meetingResultsRef.current;
            const latestUserName = userNameRef.current;
            const latestSearchVal = searchMeetingsValRef.current;
            const latestUser = userRef.current;

            console.log("latest meeting:", latestMeeting);

        if (!type) {
            setSearchResults(false);
            setDisableEnter(false);
            alert("sorry you were denied to enter the room");
            return;
        }

        socket.emit("updateParticipants", {
            room_id: latestMeeting.room_id,
            socket_id: socket.id,
            name: latestUserName,
            user_id: latestUser.id,
        });

        try {
            const result = await axios.post("http://localhost:3000/home/joinUser", {
                room_id: latestMeeting.id,
                name: latestUserName,
                id: user.id,
                socket_id: socket.id,
                room_join_id: latestSearchVal,
            });

            console.log('from home', result.data)

            if (result.status === 200) {
                console.log(result.data);
                navigate("/meeting", {
                    state: {
                        data: result.data,
                    },
                });
            }

        } catch (error) {
            console.log(error);
        }
        }

        socket.on("resultAcceptance", finalAcceptance);

        return () => {
            socket.off("resultAcceptance", finalAcceptance);
        };
    }, []);

    useEffect(()=>{
        function userJoinedMessage(data: any){
            const {socket_id, name} = data;
            console.log(`user joined as ${name} with id: ${socket_id}`)
        }
        socket.on('userJoinedMessage', userJoinedMessage);
        return ()=>{
            socket.off('userJoinedMessage', userJoinedMessage);
        }
    }, [])

    useEffect(()=>{
        if(!user){
            navigate('/auth')
        }
    }, [user]);

    useEffect(() => {
        meetingResultsRef.current = meetingResults;
    }, [meetingResults]);

    useEffect(() => {
        userNameRef.current = userName;
    }, [userName]);

    useEffect(() => {
        searchMeetingsValRef.current = searchMeetingsVal;
    }, [searchMeetingsVal]);

    useEffect(()=>{
        userRef.current = user;
    }, [user])

    useEffect(() => {
        setMyId(nanoid(8));
        socket.on("connect", updateDb);
        if (socket.connected) {
            updateDb();
        }
        return () => {
            socket.off("connect", updateDb);
        };
    }, []);
    
    return (
        <div className="home">
            <div className="homeLogout" onClick={navigateBack}>Logout</div>
            <div className="homeBody">
                {searchResults && 
                <div className="searchResults">
                    {disableEnter && <p style={{'textAlign': 'center', 'color': '#346739', 'fontWeight': 800}}>You will be redirected to the page once ur request is accepted</p>}
                    <input disabled={!passwordReq} style={wrongPass?{'backgroundColor': 'rgba(255, 54, 54, 0.86)'}:{}} placeholder={passwordReq? 'Room required password':'No password required'} value={userPass} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserPass(e.target.value)} type="text" className="userPass homeInput createMeetingInput" />
                    <input value={userName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserName(e.target.value)} type="text" className="userName homeInput createMeetingInput" />
                    <button className="submitHomeBtn" disabled={disableEnter} onClick={joinMeeting}>Enter</button>
                </div>}
                <div className="searchMeetingsInputContainer" style={wrongId?{'backgroundColor': 'rgba(255, 54, 54, 0.86)'}:{}}>
                    <input style={wrongId?{'backgroundColor': 'rgba(255, 54, 54, 0.86)', }:{}} type="text" value={searchMeetingsVal} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>{setSearchMeetingsVal(e.target.value);}} className="searchMeetings homeInput" placeholder="Search Live Meetings by Room ID" />
                    <button style={wrongId?{'backgroundColor': 'rgba(255, 54, 54, 0.86)'}:{}} onClick={searchMeeting} className="searchHome">Search</button>
                </div>
                <div className="homeManageBody">
                    <div className="homeManageBtn">
                        <button className="meetingManageBtn homeBtn" onClick={()=>{setSection(true)}}>Meeting</button>
                        <button className="screenshotManageBtn homeBtn" onClick={()=>{setSection(false)}}>Records</button>
                    </div>
                    <div className="homeManageContainer">
                        {section ?        
                            <div className="createMeetingSection">
                                <input type="text" onClick={copyId} value={`${myId} ${ hasCopied?'(Copied)':'(Click to copy Room ID)'}`} className="meetingIdInput homeInput createMeetingInput" readOnly/>
                                <input type="text" value={meetingNameInputVal} onChange={(e:React.ChangeEvent<HTMLInputElement>)=>{setMeetingNameInputVal(e.target.value)}} className="meetingNameInput homeInput createMeetingInput" placeholder="Enter Name of 3 or more characters"/>
                                <input type="password" value={meetingIdPassVal} onChange={(e:React.ChangeEvent<HTMLInputElement>)=>{setMeetingIdPassVal(e.target.value)}} className="meetingIdPass homeInput createMeetingInput" placeholder="(Optional) Password Length Must be of 8"/>
                                <button onClick={createMeeting} className="createMeetingsBtn submitHomeBtn">Create Meeting</button>
                            </div>
                            :
                            <div className="screenshotSection">
                                <div className="recordColumns">
                                    <div>Room Id</div>
                                    <div>Leader Name</div>
                                    <div style={{'fontSize': 'small', 'textAlign': 'center'}}>Number of Participants</div>
                                    <div>Created At</div>
                                    <div style={{'fontSize': 'small', 'textAlign': 'center'}}>Download Resources</div>
                                </div>
                                <div className="recordRows">
                                    {
                                        recordArr && recordArr?.length > 0 ? 
                                        <div className="recordRows">
                                            {recordArr?.map((record, i) => (
                                                <div className="recordEle" key={i}>
                                                    <div>{record.room_id}</div>
                                                    <div>{record.leadername}</div>
                                                    <div>{record.participants ? record.participants.length : 0}</div>
                                                    <div style={{'fontSize': 'small', 'textAlign': 'center'}}>{new Date(record.created_at).toLocaleString()}</div>
                                                    <div data-room={record.room_id} onClick={resourceDownload} style={!clickedDownload ? {'backgroundColor': 'whitesmoke','color': 'rgba(255, 0, 0, 0.856)', 'cursor': 'pointer', 'fontWeight': '600'} : {'backgroundColor': 'black','color': 'white', 'cursor':'not-allowed', 'fontWeight': '600', 'textDecoration': 'line-through'}}>Download</div>
                                                </div>
                                            ))}
                                        </div>
                                        :''
                                    }
                                </div>
                            </div>
                        }
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Home;