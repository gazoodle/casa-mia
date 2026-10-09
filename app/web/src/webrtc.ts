/** A camera's live video through Home Assistant's WebRTC (its go2rtc), as HA's own camera
 * cards play it: the stream itself, at its own size and frame rate. The admin page is served
 * from HA's own address (ingress), so it uses the HA connection of the window it sits in. */

type Connection = {
  sendMessagePromise: <T = any>(msg: object) => Promise<T>;
  subscribeMessage: (callback: (msg: any) => void, msg: object) => Promise<() => Promise<void>>;
};

/** HA's own connection, from the window the page sits in; null outside HA (npm run dev). */
export function haConnection(): Connection | null {
  try {
    return (window.parent.document.querySelector("home-assistant") as any)?.hass?.connection ?? null;
  } catch {
    return null; // not the same origin: not inside HA
  }
}

/** Whether HA plays this camera by WebRTC. */
export async function canWebRTC(conn: Connection, entity: string): Promise<boolean> {
  try {
    const caps = await conn.sendMessagePromise<{ frontend_stream_types?: string[] }>({
      type: "camera/capabilities",
      entity_id: entity,
    });
    return !!caps.frontend_stream_types?.includes("web_rtc");
  } catch {
    return false;
  }
}

/** Plays a camera's WebRTC stream in `video`; `failed` hears why it stopped. Returns the
 * close: the session ends and the connection is dropped. */
export async function playWebRTC(
  conn: Connection,
  entity: string,
  video: HTMLVideoElement,
  failed: (why: string) => void,
): Promise<() => void> {
  const config = await conn.sendMessagePromise<{ configuration: RTCConfiguration; dataChannel?: string }>({
    type: "camera/webrtc/get_client_config",
    entity_id: entity,
  });
  const pc = new RTCPeerConnection(config.configuration);
  if (config.dataChannel) pc.createDataChannel(config.dataChannel); // some cameras need one
  pc.addTransceiver("video", { direction: "recvonly" });
  pc.addTransceiver("audio", { direction: "recvonly" });
  const stream = new MediaStream();
  pc.ontrack = (e) => {
    stream.addTrack(e.track);
    video.srcObject = stream;
  };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "failed") failed("The WebRTC connection failed.");
  };
  // Candidates found before HA names the session wait for it.
  let session: string | undefined;
  const waiting: RTCIceCandidate[] = [];
  const send = (c: RTCIceCandidate) =>
    conn
      .sendMessagePromise({
        type: "camera/webrtc/candidate",
        entity_id: entity,
        session_id: session,
        candidate: { candidate: c.candidate, sdpMid: c.sdpMid, sdpMLineIndex: c.sdpMLineIndex },
      })
      .catch(() => undefined);
  pc.onicecandidate = (e) => {
    if (e.candidate) session ? send(e.candidate) : waiting.push(e.candidate);
  };
  await pc.setLocalDescription(await pc.createOffer());
  const unsubscribe = await conn.subscribeMessage(
    (msg) => {
      if (msg.type === "session") {
        session = msg.session_id;
        waiting.splice(0).forEach(send);
      } else if (msg.type === "answer") {
        pc.setRemoteDescription({ type: "answer", sdp: msg.answer }).catch((err) => failed(String(err)));
      } else if (msg.type === "candidate") {
        pc.addIceCandidate(msg.candidate).catch(() => undefined);
      } else if (msg.type === "error") {
        failed(msg.message);
      }
    },
    { type: "camera/webrtc/offer", entity_id: entity, offer: pc.localDescription!.sdp },
  );
  return () => {
    unsubscribe().catch(() => undefined);
    pc.close();
    video.srcObject = null;
  };
}
