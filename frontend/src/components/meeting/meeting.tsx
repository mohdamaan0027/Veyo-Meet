import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {socket} from '../home/home.tsx';
import './meeting.css';
import MyBoard from "./components/myBoard.tsx";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleRight } from '@fortawesome/free-solid-svg-icons';
import {faAngleUp} from '@fortawesome/free-solid-svg-icons';
import {faUserGroup} from '@fortawesome/free-solid-svg-icons';
import UserAvatar from "./components/userAvatar.tsx";

function Meeting(){

    const location = useLocation();
    const data = location?.state?.data;
    const roomId = data?.room_id;

    const [joinArr, setJoinArr] = useState<Array<joinData>>([]);
    const [leftOpen,setLeftOpen] = useState(false)
    const [rightOpen,setRightOpen] = useState(false)

    const [updatedData, setUpdatedData] = useState<results>({
        id: null,
        leader: '',
        leadername: '',
        participants: [],
        password: '',
        room_id: '',
        leadersocket: ''
    });

    interface participantsInter {
        id?: number,
        name: string,
        socket_id: string
    }

    interface results {
        id?: number | null,
        leader: string,
        leadername: string,
        participants: participantsInter[],
        password: string,
        room_id: string,
        leadersocket: string
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
            return e.name !== name;
        })
        setJoinArr(getFiltered);
        socket.emit('sendApproval', {
            type: type,
            mySocket: socketId,
        })
    }

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
                    participants: [...prev.participants, {socket_id: socket_id, name: name, id: user_id}]
                }
            })
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
        console.log('from', updatedData)
    }, [updatedData])

    if(!roomId){
        return <>Oops! Something went wrong</>
    }
    
   return (
    <div className="meetingBody">
        <div className="section1"></div>

        <div className="section2">
            <div className={`participants middleLeft ${leftOpen ? "showLeft" : ""}`}>
                <div className="participantsHeader"><FontAwesomeIcon icon={faUserGroup}/>{`Participants: ${updatedData.participants.length + 1}`}</div>
                <div className="participantsManager">
                    <div className="leaderEle">
                        <img className="leaderElePic" src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQCMQ9s4jJ638UpXjhZfRNcNqHfiUU2i2nNqA&s" alt="leaderimage" />
                        {updatedData.leadername} <span style={{'opacity': 0.5, 'color': '#346739'}}>(Leader)</span>
                    </div>
                        {updatedData?.participants?.length?
                            updatedData?.participants.map((e, i)=>{
                                return <div className="participantsEle" tabIndex={i}>
                                    <UserAvatar e={e.socket_id}/>
                                    {e.name}
                                </div>
                            }):''
                        }
                </div>
            </div>
            <MyBoard/>
            <div className={`middleRight ${rightOpen ? "showRight" : ""}`}>
                <div className="groupChat">
                    <div className="groupChatHeader">Live Chat</div>
                    <div className="groupChatContainer"></div>
                    <div className="groupChatInputContainer">
                        <input placeholder="Enter here.." type="text" className="groupChatInput"/>
                        <button className="groupBtn" style={{'height': '100%', 'width': '20%'}}>Send</button>
                    </div>
                </div>
                <div className="doubts">
                    <div className="doubtsHeader">Questions</div>
                    <div className="doubtsContainer"></div>
                    <div className="doubtsInputContainer">
                        <input type="text" placeholder="Enter here.." className="doubtsInput"/>
                        <button className="doubtBtn" style={{'height': '100%', 'width': '20%'}}>Send</button>
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
                <button style={{'borderRight': '2px solid black'}} className="control">Control</button> : ''
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

