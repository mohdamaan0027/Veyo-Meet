import { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from "react";
import { socket } from "../../home/home.tsx";

interface Props {
    roomId: string;
    userName: string;
    onMuteChange?: (isMuted: boolean) => void;
}

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

        const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
        const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});
        const pendingCandidatesRef = useRef<Record<string, RTCIceCandidateInit[]>>({});
        
        const roomIdRef = useRef(roomId);

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

        const createPeerConnectionRef = useRef((targetSocketId: string): RTCPeerConnection => {
            const existing = peerConnectionsRef.current[targetSocketId];
            if (existing) {
                console.log("[PC] reusing existing pc for", targetSocketId);
                return existing;
            }

            console.log("[PC] creating new pc for", targetSocketId);
            const pc = new RTCPeerConnection(ICE_SERVERS);

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit("voice:ice-candidate", {
                        to: targetSocketId,
                        candidate: event.candidate,
                        roomId: roomIdRef.current,
                    });
                }
            };

            pc.ontrack = (event) => {
                console.log("[PC] got track from", targetSocketId);
                if (audioElementsRef.current[targetSocketId]) {
                    audioElementsRef.current[targetSocketId].srcObject = event.streams[0];
                    return;
                }

                const audio = document.createElement("audio");
                audio.autoplay = true;
                audio.setAttribute("playsinline", "true");
                audio.srcObject = event.streams[0];
                audio.muted = false;

                audio.onloadedmetadata = async () => {
                    try {
                        await audio.play();
                    } catch (err) {
                        console.warn("Audio play failed:", err);
                    }
                };

                document.body.appendChild(audio);
                audioElementsRef.current[targetSocketId] = audio;
            };

            // pc.onconnectionstatechange = () => {
            //     console.log("[CONNECTION]", targetSocketId, pc.connectionState);
            // };

            pc.oniceconnectionstatechange = () => {
                console.log("[ICE]", targetSocketId, pc.iceConnectionState);
            };

            const stream = localStreamRef.current;
            if (stream) {
                stream.getTracks().forEach((track) => {
                    pc.addTrack(track, stream);
                });
            } else {
                console.warn("[PC] no local stream when creating PC for", targetSocketId);
            }

            peerConnectionsRef.current[targetSocketId] = pc;
            return pc;
        });

        const cleanupPeerRef = useRef((socketId: string) => {
            console.log("[PC] cleaning up", socketId);
            peerConnectionsRef.current[socketId]?.close();
            delete pendingCandidatesRef.current[socketId];
            delete peerConnectionsRef.current[socketId];
            if (audioElementsRef.current[socketId]) {
                audioElementsRef.current[socketId].srcObject = null;
                audioElementsRef.current[socketId].remove();
                delete audioElementsRef.current[socketId];
            }
        });

        useEffect(() => {
            const createPC = createPeerConnectionRef.current;
            const cleanupPC = cleanupPeerRef.current;

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

            joinVoice();

            socket.on("voice:existing-users", async (users: string[]) => {
                console.log("[VOICE] existing users", users);
                for (const userId of users) {
                    if (peerConnectionsRef.current[userId]) continue;
                    const pc = createPC(userId);
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    socket.emit("voice:offer", { to: userId, offer, roomId });
                }
            });

            socket.on("voice:user-joined", ({ socketId }: { socketId: string }) => {
                console.log("[VOICE] new user joined", socketId);
            });

            async function onVoiceOffer(data: { from: string; offer: RTCSessionDescriptionInit }) {
                if (!localStreamRef.current) {
                    console.warn("[VOICE] got offer but no local stream yet");
                    return;
                }

                console.log("[VOICE] offer received from", data.from, "signaling state will be checked");
                const pc = createPC(data.from);

                if (pc.signalingState !== "stable") {
                    console.warn("[VOICE] skipping offer, state:", pc.signalingState);
                    return;
                }

                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

                const candidates = pendingCandidatesRef.current[data.from] || [];
                for (const c of candidates) {
                    try { await pc.addIceCandidate(new RTCIceCandidate(c)); }
                    catch (e) { console.warn("candidate flush failed", e); }
                }
                delete pendingCandidatesRef.current[data.from];

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit("voice:answer", { to: data.from, answer, roomId });
            }

            async function onVoiceAnswer(data: { from: string; answer: RTCSessionDescriptionInit }) {
                const pc = peerConnectionsRef.current[data.from];
                console.log("[VOICE] answer from", data.from, "| pc state:", pc?.signalingState);
                if (!pc) return;

                if (pc.signalingState !== "have-local-offer") {
                    console.warn("[VOICE] skipping answer, state:", pc.signalingState);
                    return;
                }

                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));

                const candidates = pendingCandidatesRef.current[data.from] || [];
                for (const c of candidates) {
                    try { await pc.addIceCandidate(new RTCIceCandidate(c)); }
                    catch (e) { console.warn("candidate flush failed", e); }
                }
                delete pendingCandidatesRef.current[data.from];
            }

            async function onIceCandidate(data: { from: string; candidate: RTCIceCandidateInit }) {
                const pc = peerConnectionsRef.current[data.from];
                if (!pc || !pc.remoteDescription) {
                    if (!pendingCandidatesRef.current[data.from]) {
                        pendingCandidatesRef.current[data.from] = [];
                    }
                    pendingCandidatesRef.current[data.from].push(data.candidate);
                    return;
                }
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (err) {
                    console.warn("ICE add failed", err);
                }
            }

            function onVoiceUserLeft(data: { socketId: string }) {
                cleanupPC(data.socketId);
            }

            socket.on("voice:offer", onVoiceOffer);
            socket.on("voice:answer", onVoiceAnswer);
            socket.on("voice:ice-candidate", onIceCandidate);
            socket.on("voice:user-left", onVoiceUserLeft);

            return () => {
                localStreamRef.current?.getTracks().forEach((t) => t.stop());
                localStreamRef.current = null;
                Object.keys(peerConnectionsRef.current).forEach(cleanupPC);
                isJoinedRef.current = false;
                isMutedRef.current = true;
                socket.emit("voice:leave", { roomId });

                socket.off("voice:existing-users");
                socket.off("voice:user-joined");
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