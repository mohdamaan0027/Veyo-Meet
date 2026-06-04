import {useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {socket} from '../home/home.tsx';
import './meeting.css';
import MyBoard from "./components/myBoard.tsx";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleRight,faSquareXmark } from '@fortawesome/free-solid-svg-icons';
import {faAngleUp} from '@fortawesome/free-solid-svg-icons';
import {faUserGroup} from '@fortawesome/free-solid-svg-icons';
import {faMaximize, faRightFromBracket} from '@fortawesome/free-solid-svg-icons';
import UserAvatar from "./components/userAvatar.tsx";
import { useNavigate } from "react-router-dom";
import axios from "axios";
// import ping from 'ping';
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
    const [viewDoubtType, setViewDoubtType] = useState<boolean>(true);
    const [isView, setIsView] = useState<boolean>(false);
    const [clickedPollOptManager, setClickedPollOptManager] = useState<Array<clickedPollOptInter>>([]);
    const [leaderPollArr, setLeaderPollArr] = useState<Array<leaderPollViewInter>>([]);
    // const [pollOptData, setPollOptData] = useState<Array<pollOptDataInter>>([]);
    const [selectedPollId, setSelectedPollId] = useState<number | null>(null);
    const [checkPollOpt, setCheckPollOpt] = useState<boolean>(false);
    const [percContainer, setPercContainer] = useState<Record<number, Array<percContainerInter>>>({});
    const [viewUsersArr, setViewUsersArr] = useState<Array<string>>([]);
    const [qoubtQuesInpVal, setQoubtQuesInpVal] = useState<string>('');
    const [ansArr, setAnsArr] = useState<Array<string>>([]);
    const [ansVal, setAnsVal] = useState<Record<number, string>>({});
    const [ansValUsersArr, setAnsValUsersArr] = useState<Array<ansValUsersArrInter>>([]);
    const [checkAnsSend, setCheckAnsSend] = useState<Array<number>>([]);
    const [ansListingEleClicked, setAnsListingEleClicked] = useState<boolean>(false);
    const [filteredAnsArr, setFilteredAnsArr] = useState<Array<ansValUsersArrInter>>([]);
    const [hasCopied, setHasCopied] = useState<boolean>(false);
    const [pingVal, setPingVal] = useState<number>();

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

    // interface filteredAnsArrInter{
    //     userName: string,
    //     quesId: number,
    //     ansVal: string
    // }

    interface ansValUsersArrInter {
        quesId: string,
        ansVal: string,
        userName: string
    }

    interface percContainerInter{
        quesId: number,
        percentage: number,
        users: string[]
    }

    // interface pollOptDataInter{
    //     pollData: string,
    //     pollOpt: pollOptDataOptIter[]
    // }

    interface leaderPollViewInter{
        pollId: number,
        quesId: number,
        userName: string
    }

    interface clickedPollOptInter {
        pollId: number,
        quesId: number
    }

    interface receivePollInter {
        pollId: number,
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
        if(!clickedControl) {setRightOpen(false); setMessage('please click on any participant to give control'); setLeftOpen(true);};
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
            if(pollOptions.length <= 0){
                setDoubtType('');
                setClickedPoll(false);
                return
            };
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
                    setViewDoubtType(true);
                }
            }
            setDoubtType('');
            setClickedPoll(false); 
            return;
        }
        setDoubtType('poll');
        setClickedPoll(true);
    }

    function quesClicked(){
        setClickedPoll(false);
        if(doubtType == 'ques'){
            if(qoubtQuesInpVal.length <= 0){
                setDoubtType("");
                setClickedQues(false);
                return;
            };
            socket.emit('ques', {
                'roomId': roomId,
                'val': qoubtQuesInpVal
            })
            setQoubtQuesInpVal('');
            setDoubtType('')
            setClickedQues(false);
            setViewDoubtType(false);
            return;
        }
        setDoubtType('ques');
        setClickedQues(true);
    }

    function pollOptClick(e: React.MouseEvent<HTMLElement>){
        if(socket.id == updatedData.leadersocket) return;
        const pollId = e.currentTarget.dataset.pollid;
        if (clickedPollOptManager.some((e)=>{ return e.pollId == Number(pollId)})) return;
        console.log('sending to leaderSocket:', updatedData.leadersocket); 
        console.log('my socket:', socket.id); 
        const userName = updatedData.participants.filter((e)=>{
            return e.socket_id == socket.id
        })[0].name
        const id = e.currentTarget.dataset.id;
        socket.emit('pollOpt', {
            'quesId' : Number(id),
            'userName' : userName,
            'leaderSocket' : updatedData.leadersocket,
            'pollId': pollId
        })
        setClickedPollOptManager((prev:any)=>{
            return [...prev ?? [] , {quesId: id, pollId: pollId}];
        })
    }

    function pollViewFunc(e: React.MouseEvent<HTMLElement>) {
        const pollId = e.currentTarget.dataset.pollid;
        if (!pollId) return;
        const id = Number(pollId);
        setSelectedPollId(id);
        calculatePerc(id);  
        setIsView(true);
    }

    function calculatePerc(pollId: number) {
        const users = leaderPollArr.filter((e) => e.pollId === pollId);

        const total = users.length;

        if (total <= 0) {
            setPercContainer(prev => ({
                ...prev,
                [pollId]: []
            }));
            return;
        }

        const countMap: Record<number, { count: number; users: string[] }> = {};

        users.forEach((u) => {
            if (!countMap[u.quesId]) {
                countMap[u.quesId] = {
                    count: 0,
                    users: []
                };
            }

            countMap[u.quesId].count += 1;
            countMap[u.quesId].users.push(u.userName);
        });

        const quesCountArr: Array<percContainerInter> =
            Object.entries(countMap).map(([quesId, val]) => ({
                quesId: Number(quesId),
                percentage: Number(
                    ((val.count / total) * 100).toFixed(1)
                ),
                users: val.users
            }));

        setPercContainer(prev => ({
            ...prev,
            [pollId]: quesCountArr
        }));
    }

    function viewUsersOpt(e: React.MouseEvent<HTMLElement>){
        setCheckPollOpt(!checkPollOpt);
        const users = e.currentTarget.dataset.users;
        if(users == null) return;
        const usersArr = JSON.parse(users);
        setViewUsersArr(usersArr);
    }

    function sendAns(e: React.MouseEvent<HTMLElement>) {
        const quesId = Number(e.currentTarget.dataset.quesid);
        setCheckAnsSend((prev) => [...prev ?? [], quesId]);
        if (!quesId) return;

        const perQuesVal = ansVal[quesId - 1]; 
        if (!perQuesVal || perQuesVal.length <= 0) return;

        const userName = updatedData.participants?.find((e) => {
            return socket.id == e.socket_id;
        })?.name;
        if (!userName) return;

        socket.emit('ansVal', {
            'leadersocket': updatedData.leadersocket,
            'ansVal': perQuesVal,
            'userName': userName,
            'quesId': quesId
        });
    }

    function ansListingClickFunc(e: React.MouseEvent<HTMLElement>){
        const id = e.currentTarget.dataset.id;
        if (!id) return;
        setAnsListingEleClicked(!ansListingEleClicked);
        const filter = ansValUsersArr.filter((e)=>{
            return id == e.quesId
        })
        if(!filter) return;
        setFilteredAnsArr(filter)
    }

    async function copyId(){
        await navigator.clipboard.writeText(roomId);
        setHasCopied(true);
    }

    async function exitMeeting(){
        if(!socket.id) return;
        let isLeader:boolean = false;
        if(socket.id == updatedData.leadersocket){
            isLeader = true;
        }else { isLeader = false };
        const userName = socket.id == updatedData.leadersocket? updatedData.leadername : updatedData.participants.find((e)=>{
            return e.socket_id == socket.id
        })?.name;
        if(!isLeader){
            try {
                await axios.post('http://localhost:3000/meeting/removeUser', {'roomId':roomId, 'socketId': socket.id});
            } catch (error) {
                console.log(error);
            }
        }
        socket.emit('exitMeeting', {
            'roomId': roomId,
            'socketId': socket.id,
            'isLeader': isLeader,
            'userName': userName ? userName : 'NaN'
        });
        navigate('/home');
    }

    useEffect(()=>{
        function userExitMessage(data:any){
            const latestData = updatedDataReff.current;
            const {socketId, isLeader, userName} = data;
            if(isLeader){
                setMessage(`room ended as leader left 😁`);
            }else{
                const newParticipants = latestData.participants.filter((e)=>{
                    return e.socket_id !== socketId
                })
                setUpdatedData((prev)=>{
                    return {
                        ...prev, participants: newParticipants
                    }
                });
                setMessage(`user left with name: ${userName}`);
            }
        }
        socket.on('userExitMessage', userExitMessage);
        return ()=>{socket.off('userExitMessage', userExitMessage)}
    }, [])

    useEffect(()=>{
        function ansValReceive(data:any){
            const {ansVal, userName, quesId} = data;
            setAnsValUsersArr((prev)=>{
                return [...prev ?? [], {
                    userName: userName,
                    quesId: quesId,
                    ansVal: ansVal
                }]
            })
        }
        socket.on('ansValReceive', ansValReceive);
        return ()=>{socket.off('ansValReceive', ansValReceive)}
    }, [])

    useEffect(()=>{
        console.log('from front', filteredAnsArr)
    }, [filteredAnsArr])

    useEffect(()=>{
        function receiveQues(data:any){
            // setViewDoubtType(false);
            const {val} = data;
            setAnsArr((prev:any)=>{
                return [...prev ?? [], val]
            });
        }
        socket.on('receiveQues', receiveQues);
        return ()=>{socket.off('receiveQues', receiveQues)}
    }, [])

    useEffect(()=>{
        console.log(ansArr)
    }, [ansArr])

    useEffect(()=>{
        if(!checkPollOpt) setViewUsersArr([]);
    }, [checkPollOpt])

    useEffect(()=>{
        console.log(viewUsersArr)
    }, [viewUsersArr])

    useEffect(() => {
        if (selectedPollId === null) return;

        calculatePerc(selectedPollId);

    }, [leaderPollArr, selectedPollId]);

    useEffect(()=>{
        function pollOptRecieve(data:any){
            const {quesId, userName, pollId} = data;
            setLeaderPollArr((prev)=>{
                return [...prev ?? [], {pollId: Number(pollId), quesId: Number(quesId), userName: userName}]
            })
        }
        socket.on('pollOptRecieve', pollOptRecieve);
        return ()=>{socket.off('pollOptRecieve', pollOptRecieve)}
    }, [])

    useEffect(()=>{
        function onReceivePoll(e: any){
            // setViewDoubtType(true);
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

    useEffect(() => {
        const measurePing = async () => {
            const start = performance.now();
            try {
                await axios.get('/ping');
                setPingVal(Math.round(performance.now() - start));
            } catch (err) {
                console.error(err);
            }
        };
        measurePing();
        const interval = setInterval(measurePing, 5000);
        return () => clearInterval(interval);
    }, []);
    
    if(!roomId){
        return <>Oops! Something went wrong</>
    }
    
   return (
    <div className="meetingBody">
        {message.length > 0 ? <div className="meetingMessage" onClick={checkMessage}>
            <p className="meetingText">{message}</p>
            <button className="endBtn">Close</button>
        </div> : ''}
        <div className="section1">
            <div className="section1Container">
                <div className="meetingLogo">Logo</div>
                <div className="meetingGroupId" onClick={copyId} style={{'color': '#346739'}}><span style={{'color': '#2d3436', 'marginRight': '4px'}}>RoomId:</span>{roomId ? <p style={hasCopied ? {'textDecoration': 'line-through', 'cursor': 'not-allowed'} : {'cursor':'copy'}}>{roomId}</p> : 'Error'}</div>
                <div className="meetingLeaderName" style={{'color': '#346739'}}><span style={{'color': '#2d3436', 'marginRight': '4px'}}>Leadername:</span>{updatedData.leadername? updatedData.leadername.slice(0, 5) + '..' : 'Error'}</div>
                <div className="meetingNetwork">Network: {pingVal ? pingVal : '🛜'}ms</div>
                <div className="exitMeeting" onClick={exitMeeting}><FontAwesomeIcon className="exitMeetingExitEle" icon={faRightFromBracket}/>Exit</div>
            </div>
        </div>

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
                                return <div key={i} className="participantsEle" style={controller == e.socket_id? {'backgroundColor': '#4f9a57ff', 'color': 'white'}:{}} data-socket={e.socket_id} onClick={controllerAction} tabIndex={i}>
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
                        {doubtType == ''? 
                            <div className="viewerDoubtContainer">
                                <div className="doubtsMainBtn">
                                    <button className="pollSwitch" onClick={()=>{setViewDoubtType(true); setIsView(false)}}>Poll</button>
                                    <button className="quesSwitch" onClick={()=>{setViewDoubtType(false); setIsView(false)}}>Quess</button>
                                </div>
                                {viewDoubtType ? 
                                <div className="viewPoll">
                                   {receivePoll.map((poll)=>{
                                    return (
                                        <div className="poll" key={poll.pollId}>
                                            <div className="pollMainQues">{poll.poll}</div>
                                            {socket.id == updatedData.leadersocket ? (
                                                <div className="pollView" data-pollid={poll.pollId} onClick={pollViewFunc}>
                                                    <FontAwesomeIcon icon={faMaximize}/>
                                                </div>
                                            ) : ''}
                                            {poll.data.map((opt)=>{
                                                return (
                                                    <div className="pollOpt" data-id={opt.id} data-pollid={poll.pollId} style={clickedPollOptManager.some((ei)=>{
                                                        return (
                                                            ei.quesId == opt.id &&
                                                            ei.pollId == poll.pollId
                                                        )})? {'backgroundColor': 'rgba(255, 0, 0, 0.856)'}: {}
                                                    } onClick={pollOptClick}  key={opt.id}>
                                                        {opt.id}: {opt.value}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )
                                })}
                                </div>
                                :
                                <div className="viewQues">
                                    {ansArr.map((e, i)=>{
                                        return <div className="ansEle" key={i}>
                                            <div className="ansValEle">
                                                {i + 1}: {e}
                                                {socket.id == updatedData.leadersocket ? <div className="expandQuesBtn" onClick={()=>{setIsView(!isView)}}><FontAwesomeIcon icon={faMaximize}/></div> : ''}
                                            </div>
                                            {socket.id == updatedData.leadersocket ? '' : <div className="sendAnsContainer">
                                                <input maxLength={500} style={{'padding': '5px'}} readOnly={checkAnsSend.includes(i + 1)} placeholder="Enter here" type="text" onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setAnsVal(prev => ({ ...prev, [i]: e.target.value }));}} value={ansVal[i] ?? ''} className="ansInp"/>
                                                <button data-quesid={i+1} style={{'textDecoration': checkAnsSend.includes(i + 1) ? 'line-through' : 'none'}} disabled={checkAnsSend.includes(i + 1)} onClick={sendAns} className="sendAnsBtn">Send</button>
                                            </div>}
                                        </div>
                                    })}
                                </div>
                                }
                            </div>
                        : ''}
                        {
                            doubtType.length > 0? (doubtType == 'poll'?
                            <div className="doubtPoll">
                                <input type='text' className="doubtPollInput" maxLength={250} value={mainPollVal} onChange={(e:React.ChangeEvent<HTMLInputElement>)=>{setMainPollVall(e.target.value)}} placeholder="Enter question here"/>
                                <div className="addDoubtBtnContianer">
                                    {
                                        Array.from({length: noOfDoubtInput}, (_, i)=>{
                                            return <input placeholder="Enter option here" type="text" maxLength={25} value={pollOptions[i].value} onChange={(m:React.ChangeEvent<HTMLInputElement>)=>{setPollOptions((prev)=>{
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
                                   <button
                                        className="removeDoubtBtn"
                                        onClick={()=>{
                                            if(noOfDoubtInput == 0) return;
                                            setPollOptions((prev)=>{
                                                return prev.slice(0, -1);
                                            });
                                            setNoOfDoubtInput((prev)=> prev - 1);
                                        }}
                                    >Remove</button>
                                </div>
                            </div>:
                            <div className="doubtQues">
                                <h6>Please write your ques in the input below</h6>
                                <input type="text" maxLength={250} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>{setQoubtQuesInpVal(e.target.value)}} value={qoubtQuesInpVal} placeholder="Enter here" className="doubtQuesInp" />
                            </div>) : ''
                        }
                    </div>
                    <div className="doubtsInputContainer">
                        {socket.id == updatedData.leadersocket && <div className="doubtBtnContainer">
                            <button onClick={pollClicked} className="doubtBtn" style={{'height': '100%', 'width': '20%'}}>{clickedPoll ? 'Send': 'Add Poll'}</button>
                            <button className="doubtBtn0" onClick={quesClicked} style={{'height': '100%', 'width': '20%'}}>{clickedQues? 'Send': 'Add Ques'}</button>
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
                <button className="leave">{socket.id == updatedData.leadersocket ? 'Capture':'Ask for Control' }</button>
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
        <div className={isView?'leaderPollView transistPollView': 'leaderPollView'}>
            <div className='crossPoll' onClick={()=>{setIsView(false)}}><FontAwesomeIcon style={{'fontSize': 'larger'}} icon={faSquareXmark}/></div>
            {viewDoubtType?
            <div className="leaderPollViewData leaderPollViewDataTrue">
                <div className="checkPollLeft">
                    {
                        selectedPollId !== null && receivePoll.find((p)=> p.pollId === selectedPollId) &&
                        (
                            <div className="checkPollHead">
                                {
                                    receivePoll.find((p)=> p.pollId === selectedPollId)?.poll
                                }
                            </div>
                        )
                    }
                    { receivePoll.find((p)=> p.pollId === selectedPollId) ?.data.map((e)=>{
                        return <div onClick={viewUsersOpt} data-users={
                            selectedPollId !== null && percContainer[selectedPollId]?.length > 0 ? JSON.stringify(percContainer[selectedPollId].find((l)=>{
                                return l.quesId === Number(e.id)
                            })?.users):null
                        } className="checkPollOpt">
                            <div className="overlapCheckPoll" style={{
                                width: selectedPollId !== null && percContainer[selectedPollId]?.length > 0
                                    ? `${percContainer[selectedPollId].find((ef) => ef.quesId === Number(e.id))?.percentage ?? 0}%`
                                    : '0%'
                            }}></div>
                            {e.id}: {e.value}
                        </div>
                    })}
                </div>
                <div className={checkPollOpt ? 'checkPollRight transistCheckPollRight': 'checkPollRight'}>
                    {viewUsersArr.length > 0? viewUsersArr.map((e)=>{
                        return <div className={checkPollOpt ? 'viewUserArrEle viewUserArrEleTransist' : 'viewUserArrEle'}>{e.length > 6 ? `${e.slice(0, 5)}...`: e}</div>
                    }): <p style={{'textAlign': 'center'}}>No user has selected this option 😄</p>}
                </div>
            </div>
            :
            <div className="leaderPollViewData leaderPollViewDataFalse">
                <div className={ansListingEleClicked ? 'quesListing quesListingTransist': 'quesListing'}>
                    {ansArr.map((e, i)=>{
                        return <div onClick={ansListingClickFunc} data-id={i+1} className="quesListingEle">{e}</div>
                    })}
                </div>
                <div className={ansListingEleClicked ? 'userAns userAnsTransist': 'userAns'}>
                    {filteredAnsArr?.length > 0 ? filteredAnsArr.map((e, i) => (
                            <div className="userAnsEle" key={i}>
                                <h4>{e.userName}</h4>
                                <p>{e.ansVal}</p>
                            </div>
                        )): <p>No user has answered 🙂</p>
                    }
                </div>
            </div>
            }
        </div>
    </div>
    )
}
export default Meeting;

