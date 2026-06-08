import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { socket } from "../../home/home.tsx";

interface Props {
    roomId: string;
    userName: string;
    onMuteChange?: (isMuted: boolean) => void;
}

const peerConnections: Record<string, RTCPeerConnection> = {};
const audioElements: Record<string, HTMLAudioElement> = {};

const ICE_SERVERS = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
    ],
};

const isChromium = !!(window as any).chrome;

const VoiceRoom = forwardRef<{ toggleMute: () => void }, Props>(
    function VoiceRoom({ roomId, userName, onMuteChange }, ref) {

        const localStreamRef = useRef<MediaStream | null>(null);
        const isJoinedRef = useRef(false);
        const isMutedRef = useRef(true);
        const onMuteChangeRef = useRef(onMuteChange);

        useEffect(() => {
            onMuteChangeRef.current = onMuteChange;
        }, [onMuteChange]);

        useImperativeHandle(ref, () => ({
            toggleMute: () => {
                if (!localStreamRef.current) return;
                const audioTrack = localStreamRef.current.getAudioTracks()[0];
                if (!audioTrack) return;
                isMutedRef.current = !isMutedRef.current;
                audioTrack.enabled = !isMutedRef.current;
                onMuteChangeRef.current?.(isMutedRef.current);
            }
        }));

        function createPeerConnection(targetSocketId: string): RTCPeerConnection {
            if (peerConnections[targetSocketId]) {
                return peerConnections[targetSocketId];
            }

            const pc = new RTCPeerConnection(ICE_SERVERS);

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit("voice:ice-candidate", {
                        to: targetSocketId,
                        candidate: event.candidate,
                        roomId,
                    });
                }
            };

            pc.ontrack = (event) => {
                if (audioElements[targetSocketId]) {
                    audioElements[targetSocketId].srcObject = event.streams[0];
                    return;
                }
                const audio = document.createElement("audio");
                audio.srcObject = event.streams[0];
                audio.autoplay = true;
                audio.setAttribute("playsinline", "true");
                document.body.appendChild(audio);
                audioElements[targetSocketId] = audio;
            };

            localStreamRef.current?.getTracks().forEach((track) => {
                pc.addTrack(track, localStreamRef.current!);
            });

            peerConnections[targetSocketId] = pc;
            return pc;
        }

        function cleanupPeer(socketId: string) {
            peerConnections[socketId]?.close();
            delete peerConnections[socketId];
            if (audioElements[socketId]) {
                audioElements[socketId].srcObject = null;
                audioElements[socketId].remove();
                delete audioElements[socketId];
            }
        }

        async function joinVoice() {
            if (isJoinedRef.current) return;
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: isChromium ? {
                        echoCancellation: true,
                        noiseSuppression: false,
                        autoGainControl: false,
                        sampleRate: 48000,
                    } : {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                    video: false,
                });

                stream.getAudioTracks().forEach((track) => {
                    track.enabled = false;
                });

                localStreamRef.current = stream;
                isJoinedRef.current = true;
                onMuteChangeRef.current?.(true);
                socket.emit("voice:join", { roomId, userName });
            } catch (err) {
                console.error("Mic access denied:", err);
            }
        }

        useEffect(() => {
            joinVoice();

            async function onVoiceUserJoined(data: { socketId: string }) {
                if (!localStreamRef.current) return;
                const pc = createPeerConnection(data.socketId);

                if (pc.getTransceivers().length === 0) {
                    pc.addTransceiver('audio', { direction: 'sendrecv' });
                }

                const offer = await pc.createOffer({
                    offerToReceiveAudio: true,
                });
                await pc.setLocalDescription(offer);
                socket.emit("voice:offer", { to: data.socketId, offer, roomId });
            }

            async function onVoiceOffer(data: { from: string; offer: RTCSessionDescriptionInit }) {
                if (!localStreamRef.current) return;
                const pc = createPeerConnection(data.from);

                if (pc.getTransceivers().length === 0) {
                    pc.addTransceiver('audio', { direction: 'sendrecv' });
                }

                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit("voice:answer", { to: data.from, answer, roomId });
            }

            async function onVoiceAnswer(data: { from: string; answer: RTCSessionDescriptionInit }) {
                const pc = peerConnections[data.from];
                if (!pc) return;
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            }

            async function onIceCandidate(data: { from: string; candidate: RTCIceCandidateInit }) {
                const pc = peerConnections[data.from];
                if (!pc) return;
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (e) {
                    console.warn("ICE candidate error:", e);
                }
            }

            function onVoiceUserLeft(data: { socketId: string }) {
                cleanupPeer(data.socketId);
            }

            socket.on("voice:user-joined", onVoiceUserJoined);
            socket.on("voice:offer", onVoiceOffer);
            socket.on("voice:answer", onVoiceAnswer);
            socket.on("voice:ice-candidate", onIceCandidate);
            socket.on("voice:user-left", onVoiceUserLeft);

            return () => {
                Object.keys(peerConnections).forEach(cleanupPeer);
                localStreamRef.current?.getTracks().forEach((t) => t.stop());
                localStreamRef.current = null;
                isJoinedRef.current = false;
                isMutedRef.current = true;
                socket.emit("voice:leave", { roomId });

                socket.off("voice:user-joined", onVoiceUserJoined);
                socket.off("voice:offer", onVoiceOffer);
                socket.off("voice:answer", onVoiceAnswer);
                socket.off("voice:ice-candidate", onIceCandidate);
                socket.off("voice:user-left", onVoiceUserLeft);
            };
        }, []);

        return null;
    }
);

export default VoiceRoom;