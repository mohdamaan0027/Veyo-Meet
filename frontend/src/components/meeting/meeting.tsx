import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {socket} from '../home/home.tsx';
import './meeting.css';
import MyBoard from "./components/myBoard.tsx";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleRight } from '@fortawesome/free-solid-svg-icons';
import {faAngleUp} from '@fortawesome/free-solid-svg-icons';
import {faUserGroup} from '@fortawesome/free-solid-svg-icons';
import UserAvatar from "./components/userAvatar.tsx";
import { useNavigate } from "react-router-dom";
import axios from "axios";
// import axios from "axios";

function Meeting(){

    const location = useLocation();
    const data = location?.state?.data;
    const roomId = data?.room_id;

    const [joinArr, setJoinArr] = useState<Array<joinData>>([]);
    const [leftOpen,setLeftOpen] = useState<boolean>(false);
    const [rightOpen,setRightOpen] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');
    const [controller, setController] = useState<string>('');
    const [canControl, setCanControl] = useState<boolean>(false);
    const [clickedControl, setClickedControl] = useState<boolean>(false);
    const [groupChatVal, setGroupChatVal] = useState<string>('');
    const [doubtType, setDoubtType] = useState<doubtT>('');
    const [noOfDoubtInput, setNoOfDoubtInput] = useState<number>(0);
    const [clickedPoll, setClickedPoll] = useState<boolean>(false);
    const [clickedQues, setClickedQues] = useState<boolean>(false);
    const [pollOptions, setPollOptions] = useState<Array<pollOptInter>>([]);
    const [mainPollVal, setMainPollVall] = useState<string>('');
    const [receivePoll, setReceivePoll] = useState<Array<receivePollInter>>([]);

    const [updatedData, setUpdatedData] = useState<results>({
        id: null,
        leader: '',
        leadername: '',
        participants: [],
        password: '',
        room_id: '',
        leadersocket: '',
        live_chat: []
    });

    const navigate = useNavigate();

    const updatedDataReff = useRef(updatedData);
    const controllerReff = useRef(controller);

    type doubtT = 'poll' | 'ques' | '';

    interface receivePollInter {
        poll : string,
        data : pollOptInter[]
    }

    interface participantsInter {
        id?: number,
        name: string,
        socket_id: string
    }

    interface groupChatInger {
        name: string,
        chat: string
    }

    interface pollOptInter {
        id?: number,
        value?: string
    }

    interface results {
        id?: number | null,
        leader: string,
        leadername: string,
        participants: participantsInter[],
        password: string,
        room_id: string,
        leadersocket: string,
        live_chat: groupChatInger[]
    }

    interface joinData {
        name: string,
        socket: string
    }

    async function fulfillReq(e: React.MouseEvent<HTMLElement>){
        const type = e.currentTarget.dataset.type == 'true';
        const socketId = e.currentTarget.dataset.socket;
        const name = e.currentTarget.dataset.name;
        if(!socketId || !name) return;
        const getFiltered = joinArr.filter((e)=>{
            return e.socket !== socketId;
        })
        setJoinArr(getFiltered);
        socket.emit('sendApproval', {
            type: type,
            mySocket: socketId,
        })
    }

    function checkMessage(){
        const myMessage = message;
        if(myMessage == 'room ended as leader left 😁'){
            navigate('/home')
            return;
        }
        setMessage('');
    }

    function controlling(){
        if(socket.id !== updatedData.leadersocket) return;
        setClickedControl(!clickedControl);
        if(!clickedControl) {setMessage('please click on any participant to give control'); setLeftOpen(true);};
    }

    function controllerAction(e:React.MouseEvent<HTMLElement>){
        if(socket.id !== updatedData.leadersocket) return;
        if(!clickedControl) return;
        setClickedControl(false);
        setMessage('');
        const socketVal = e.currentTarget.dataset.socket;
        socket.emit('controlAction', {'socketVal': socketVal, 'roomVal': roomId});
        setLeftOpen(false)
    }

    async function sendGroupChat(){
        const val = groupChatVal;
        console.log(!val)
        if(!val) return;
        const user = socket.id == updatedData.leadersocket? updatedData.leadername : updatedData.participants.filter((e)=>{
            return socket.id == e.socket_id
        })[0]?.name;
        if(!user) return;
        setGroupChatVal('');
        try {
            const result = await axios.post('http://localhost:3000/meeting/groupChat', {'val': val, 'name': user, 'roomId': roomId});
            if(result.status == 200 && result.data == 'success'){
                socket.emit('sendGroupChat', {'roomId': roomId, 'name': user, 'val': val})
            }
        } catch (error) {
            console.log(error);
            return
        }
    }

    function pollClicked(){
        setClickedQues(false);
        if(doubtType == 'poll'){
            if(mainPollVal){
                const check = pollOptions.some((e)=>{
                    return !e.value
                })
                if(!check){
                    socket.emit('poll', {
                        'roomId': roomId,
                        'data': pollOptions,
                        'poll': mainPollVal
                    })
                    setPollOptions([])
                    setNoOfDoubtInput(0)
                    setMainPollVall('')
                }
            }
            setDoubtType('');
            setClickedPoll(false); 
            return;
        }
        setDoubtType('poll');
        setClickedPoll(true);
    }

    useEffect(()=>{
        function onReceivePoll(e: any){
            setReceivePoll((prev)=>{
                return [...prev ?? [], e]
            })
        }
        socket.on('receivePoll', onReceivePoll);
        return ()=>{socket.off('receivePoll', onReceivePoll)}
    }, [])

    useEffect(()=>{
        console.log(updatedData.live_chat)
    }, [updatedData.live_chat])

    useEffect(()=>{
        function sendGrouptChatToFrontend(data:any){
            const {name, chat} = data;
            setUpdatedData((prev)=>{
                return {
                    ...prev,
                    live_chat: [...prev.live_chat ?? [], {name: name, chat: chat}]
                }
            })
        }
        socket.on("sendGrouptChatToFrontend", sendGrouptChatToFrontend);
        return ()=>{socket.off("sendGrouptChatToFrontend", sendGrouptChatToFrontend)}
    }, [])

    useEffect(()=>{
        const latestData = updatedDataReff.current
        function controllerActionBack(data:string){
            const socketVal = data;
            if(controllerReff.current == socketVal){
                console.log('we tried to reset')
                setController(latestData.leadersocket);
                return;
            }
            setController(socketVal);
        }
        socket.on('controllerActionBack', controllerActionBack);
        return ()=>{socket.off('controllerActionBack', controllerActionBack)}
    }, [])

    useEffect(()=>{
        if(updatedData.leadersocket == socket.id){
            setCanControl(true);
            setController(updatedData.leadersocket);
            return
        }
    }, [updatedData.leadersocket])

    useEffect(()=>{
        const latestData = updatedDataReff.current;
        const user = latestData.participants.filter((e)=>{
            return e.socket_id == socket.id;
        })
        if(user.length<=0) return;
        if(controller == user[0].socket_id) {setCanControl(true)} else {setCanControl(false)};
    }, [controller])

    useEffect(()=>{
        function leaderAcceptance(data:joinData){
            const data0 = {
                name: data.name,
                socket: data.socket
            }
            setJoinArr((prev)=>{return [...prev, data0]});
        }
        socket.on('leaderAcceptance', leaderAcceptance);
        return ()=>{
            socket.off('leaderAcceptance', leaderAcceptance);
        }
    }, [])

    useEffect(()=>{
        setUpdatedData(data);
    }, [data])

    useEffect(() => {
        function userJoinedMessage(data: any) {
            const { socket_id, name, user_id } = data;
            setUpdatedData((prev)=>{
                return {
                    ...prev,
                    participants: [...prev.participants ?? [], {socket_id: socket_id, name: name, id: user_id}]
                }
            })
            setMessage(`user joined named as ${name}`)
        }
        socket.on('userJoinedMessage', userJoinedMessage);
        return () => {
            socket.off('userJoinedMessage', userJoinedMessage);
        };
    }, []);

    useEffect(() => {
        if (!roomId) return;
        socket.emit("roomJoin", { roomId }, (res: string) => {
            console.log("room join response:", res);
        });
        return () => {
            socket.emit("leaveMyRoom", roomId);
        };
    }, [roomId]);

    useEffect(()=>{
        let userArr;
        function sendData(){
            const latestUpdatedData = updatedDataReff.current;
            userArr = socket.id == latestUpdatedData.leadersocket? latestUpdatedData.leadername : latestUpdatedData?.participants?.filter((e)=>{
                return socket.id == e.socket_id
            })[0]?.name;
            socket.emit('disconnectedData', {'room': roomId, 'userSocket': socket.id, 'userArr': userArr})
        }
        window.addEventListener('beforeunload', sendData)
        socket.on('disconnect', ()=>{
            console.log('user disconnect with socket id', socket.id);
        })
        return ()=>{
            window.removeEventListener('beforeunload', sendData);
            socket.off('disconnect')
        }
    }, [])

    useEffect(()=>{
        updatedDataReff.current = updatedData;
    }, [updatedData])

    useEffect(()=>{
        let latestUpdatedData;
        function declareUserDisconnected(data:any){
            latestUpdatedData = updatedDataReff.current;
            const {userSocket, userArr} = data;
            const newArr = latestUpdatedData?.participants?.filter((e)=>{
                return e.socket_id !== userSocket
            })
            if(userSocket === latestUpdatedData.leadersocket){
                socket.emit('leaderLeft', {'roomId': roomId});
                // navigate('/home');
                return;
            }
            setUpdatedData((prev)=>{
                return {
                    ...prev,
                    participants: newArr
                }
            });
            setMessage(`user left named as ${userArr}`);
        }
        socket.on('declareUserDisconnected', declareUserDisconnected);
        return ()=>{socket.off('declareUserDisconnected', declareUserDisconnected)};
    },[])

    useEffect(()=>{
        function leaderLeftToFrontend(){
            console.log('we did')
            setMessage(`room ended as leader left 😁`);
        }
        socket.on('leaderLeftToFrontend', leaderLeftToFrontend);
        return ()=>{socket.off('leaderLeftToFrontend', leaderLeftToFrontend)}
    }, []);

    useEffect(()=>{
        controllerReff.current = controller;
    }, [controller])

    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if(chatContainerRef.current){
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [updatedData.live_chat]);

    if(!roomId){
        return <>Oops! Something went wrong</>
    }
    
   return (
    <div className="meetingBody">
        {message.length > 0 ? <div className="meetingMessage" onClick={checkMessage}>
            <p className="meetingText">{message}</p>
            <button className="endBtn">Close</button>
        </div> : ''}

        <div className="section1"></div>

        <div className="section2">
            <div className={`participants middleLeft ${leftOpen ? "showLeft" : ""}`}>
                <div className="participantsHeader"><FontAwesomeIcon icon={faUserGroup}/>{`Participants: ${updatedData.participants.length + 1}`}</div>
                <div className="participantsManager">
                    <div className="leaderEle">
                        <img className="leaderElePic" src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQCMQ9s4jJ638UpXjhZfRNcNqHfiUU2i2nNqA&s" alt="leaderimage" />
                        {updatedData.leadername.length > 5 ? (updatedData.leadername.slice(0, 4) + '...') : updatedData.leadername} <span style={{'opacity': 0.5, 'color': '#346739'}}>(Leader)</span>
                    </div>
                        {updatedData?.participants?.length?
                            updatedData?.participants.map((e, i)=>{
                                return <div className="participantsEle" style={controller == e.socket_id? {'backgroundColor': '#4f9a57ff', 'color': 'white'}:{}} data-socket={e.socket_id} onClick={controllerAction} tabIndex={i}>
                                    <UserAvatar e={e.socket_id}/>
                                    {e.name.length > 5 ? (e.name.slice(0, 4) + '...') : e.name}
                                </div>
                            }):''
                        }
                </div>
            </div>
            <MyBoard controller = {canControl}/>
            <div className={`middleRight ${rightOpen ? "showRight" : ""}`}>
                <div className="groupChat">
                    <div className="groupChatHeader">Live Chat</div>
                    <div className="groupChatContainer" ref={chatContainerRef}>
                        {updatedData.live_chat?.map((e:groupChatInger, i:number)=>{
                            return <div className="meetingChat" key={i}>
                                <span className="meetingChatName">{e.name}</span>
                                <p className="meetingChatText">{e.chat}</p>
                            </div>
                        })}
                    </div>
                    <div className="groupChatInputContainer">
                        <input placeholder="Enter here.." value={groupChatVal} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>{setGroupChatVal(e.target.value)}} type="text" className="groupChatInput"/>
                        <button className="groupBtn" onClick={sendGroupChat} style={{'height': '100%', 'width': '20%'}}>Send</button>
                    </div>
                </div>
                <div className={socket.id == updatedData.leadersocket? 'doubts': 'doubtsParticipant'}>
                    <div className="doubtsHeader">Questions</div>
                    <div className="doubtsContainer">
                        {
                            doubtType.length > 0? (doubtType == 'poll'?
                            <div className="doubtPoll">
                                <input type='text' value={mainPollVal} onChange={(e:React.ChangeEvent<HTMLInputElement>)=>{setMainPollVall(e.target.value)}} placeholder="Enter here"/>
                                <div className="addDoubtBtnContianer">
                                    {
                                        Array.from({length: noOfDoubtInput}, (_, i)=>{
                                            return <input type="text" value={pollOptions[i].value} onChange={(m:React.ChangeEvent<HTMLInputElement>)=>{setPollOptions((prev)=>{
                                                return prev.map((e, ind)=>{
                                                    return ind == i ? {...e, value: m.target.value} : e
                                                })
                                            })}} key={i} className="doubtBtnInput" />
                                        })
                                    }
                                    <button className="addDoubtBtn" disabled={noOfDoubtInput == 6 ? true: false} onClick={()=>{if(noOfDoubtInput == 6)return;setNoOfDoubtInput(noOfDoubtInput + 1); setPollOptions((prev)=>{
                                        return [...prev ?? [], {
                                            id: noOfDoubtInput + 1
                                        }]
                                    })}}>Add</button>
                                    <button className="removeDoubtBtn" onClick={()=>{pollOptions.pop();setNoOfDoubtInput(noOfDoubtInput-1)}}>Remove</button>
                                </div>
                            </div>:
                            <div className="doubtQues">
                            </div>) : ''
                        }
                    </div>
                    <div className="doubtsInputContainer">
                        {socket.id == updatedData.leadersocket && <div className="doubtBtnContainer">
                            <button onClick={pollClicked} className="doubtBtn" style={{'height': '100%', 'width': '20%'}}>{clickedPoll ? 'Send': 'Poll'}</button>
                            <button className="doubtBtn0" onClick={()=>{setClickedPoll(false); if(doubtType == 'ques'){setDoubtType(''); setClickedQues(false); return};setDoubtType('ques'); setClickedQues(true);}} style={{'height': '100%', 'width': '20%'}}>{clickedQues? 'Send': 'Ques'}</button>
                        </div>}
                    </div>
                </div>
            </div>
            <button className="leftBtn" onClick={()=>setLeftOpen(!leftOpen)}><FontAwesomeIcon icon={faAngleRight}/></button>
            <button className="rightBtn" onClick={()=>setRightOpen(!rightOpen)}><FontAwesomeIcon icon={faAngleUp}/></button>
        </div>

        <div className="section3">
            <div className="section3Container">
                <button style={{'borderRight': '2px solid black'}} className="mic">Mic</button>
                {socket.id === updatedData.leadersocket?
                <button style={!clickedControl? {'borderRight': '2px solid black'}: {'borderRight': '2px solid black', 'backgroundColor': '#346739ff', 'color': 'white'}} onClick={controlling} className="control">Control</button> : ''
                }
                <button className="leave">Leave</button>
            </div>
        </div>

        {joinArr?.length > 0 && <div className="reqManager">
            {joinArr.map((e)=>{
                return <div className="req">
                    {e.name}
                    <button onClick={fulfillReq} data-type={true} data-name={e.name} data-socket={e.socket} className="meetingBtn reqTick">Accept</button>
                    <button onClick={fulfillReq} data-type={false} data-name={e.name} data-socket={e.socket} className="meetingBtn">Reject</button>
                </div>
            })}
        </div>}
    </div>
    )
}

export default Meeting;

