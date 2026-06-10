import { useEffect, useRef, useCallback } from "react";
import { Excalidraw, MainMenu } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import './myBoard.css';
import { socket } from "../../home/home.tsx";
import { useLocation } from "react-router-dom";
import { exportToBlob } from "@excalidraw/excalidraw";
import axios from "axios";
import { forwardRef, useImperativeHandle } from "react";
import html2canvas from "html2canvas";

export interface MyBoardRef {
    captureAndUpload: () => Promise<void>;
}

interface Props {
  controller: boolean;
}

const MyBoard = forwardRef< MyBoardRef, Props>(({ controller }, ref) => {
  const location = useLocation();
  const roomId = location?.state?.data?.room_id;

  const excalidrawAPI = useRef<any>(null);
  const isUpdating = useRef(false);
  const lastEle = useRef<string>("");
  const isDrawing = useRef(false);
  const hasReceivedInitialState = useRef(false); 
  const boardContainerRef = useRef<HTMLDivElement>(null);

  const delay = useRef((e: any, delay: number) => {
    let last = 0;
    return (...args: any[]) => {
      const now = Date.now();
      if (now - last >= delay) {
        last = now;
        e(...args);
      }
    };
  }).current;

  async function captureAndUpload() {
    if (!boardContainerRef.current) return;
    const canvas = await html2canvas(boardContainerRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
    });
    const blob: Blob | null = await new Promise((resolve) => {
        canvas.toBlob(resolve, "image/png");
    });
    if (!blob) return;
    const formData = new FormData();
    formData.append(
        "image",
        blob,
        `capture-${Date.now()}.png`
    );
    formData.append("roomId", roomId);
    const res = await axios.post(
        "http://localhost:3000/upload-capture",
        formData
    );
    console.log(res.data.url);
  }

  const emitChange = useCallback(
    delay((elements: any[], appState: any) => {
      const serialized = JSON.stringify(elements);
      if (serialized === lastEle.current) return;
      lastEle.current = serialized;

      socket.emit("whiteBoard", {roomId, elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          currentItemStrokeColor: appState.currentItemStrokeColor,
        },
      });
    }, 50),
    [roomId]
  );

  useEffect(()=>{
    console.log('from board', controller)
  }, [controller])

  useEffect(():any => {
    function onWhiteboardChange(data: any) {

      if (!excalidrawAPI.current) return;
      if (isDrawing.current) return;

      hasReceivedInitialState.current = true; 
      if (!data.elements?.length) return; 
      isUpdating.current = true;
      excalidrawAPI.current.updateScene({
        elements: data.elements,
        appState: data.appState,
      });
      isUpdating.current = false;
    }

    socket.on("whiteBoard", onWhiteboardChange);
    return () => socket.off("whiteBoard", onWhiteboardChange);
  }, []);

  useImperativeHandle(ref, () => ({
    captureAndUpload
  }));

  return (
    <div className="meetingBoard" ref={boardContainerRef}>
      <Excalidraw
        viewModeEnabled={!controller}
        excalidrawAPI={(api) => (excalidrawAPI.current = api)}
        onChange={(elements, appState) => {
          if (isUpdating.current) return;
          if (!hasReceivedInitialState.current) return; 
          isDrawing.current = appState.cursorButton === "down";
          emitChange(elements, appState);
        }}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            export: false,
            saveAsImage: false,
            clearCanvas: false,
            changeViewBackgroundColor: false,
            toggleTheme: false,
          },
          tools: { image: false },
          welcomeScreen: false,
        }}
      >
        <MainMenu />
      </Excalidraw>
    </div>);
})

export default MyBoard;
