import { useEffect, useRef, useCallback } from "react";
import { Excalidraw, MainMenu } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import './myBoard.css';
import { socket } from "../../home/home.tsx";
import { useLocation } from "react-router-dom";

function MyBoard() {
  const location = useLocation();
  const roomId = location?.state?.data?.room_id;

  const excalidrawAPI = useRef<any>(null);
  const isUpdating = useRef(false);
  const lastEle = useRef<string>("");
  const isDrawing = useRef(false);
  const hasReceivedInitialState = useRef(false); 

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

  return (
    <div className="meetingBoard">
      <Excalidraw
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
    </div>
  );
}

export default MyBoard;
