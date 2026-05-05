import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {socket} from '../home/home.tsx';
import './meeting.css';

function Meeting(){

    const location = useLocation();
    const data = location?.state?.data;

    const [joinArr, setJoinArr] = useState<Array<joinData>>([]);

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

    function checkUpdate(){
        console.log(updatedData);
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
    
    return <div className="meetingBody">
        <button onClick={checkUpdate}>check</button>
        {joinArr.length > 0 && 
            joinArr.map((e)=>{
                return <div className="handleReq">
                    <div className="req">
                        <p>{e.name}</p>
                        <button onClick={fulfillReq} data-name={e.name} data-socket={e.socket} data-type={true}>tick</button>
                        <button onClick={fulfillReq} data-name={e.name} data-socket={e.socket} data-type={false}>cross</button>
                    </div>
                </div>
            })
        }
    </div>
}

export default Meeting;