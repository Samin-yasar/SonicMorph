const WebRTCRouter = (() => {
  async function attachProcessedAudioToPeerConnection(peerConnection, processedStream) {
    if (!peerConnection || typeof peerConnection.addTrack !== 'function') {
      throw new Error('Invalid RTCPeerConnection instance');
    }
    if (!processedStream) {
      throw new Error('Processed stream is not available');
    }

    const [audioTrack] = processedStream.getAudioTracks();
    if (!audioTrack) {
      throw new Error('No audio track found in processed stream');
    }

    const existingSenders = peerConnection.getSenders ? peerConnection.getSenders() : [];
    const audioSender = existingSenders.find(sender => sender.track && sender.track.kind === 'audio');
    if (audioSender) {
      try {
        await audioSender.replaceTrack(audioTrack);
      } catch (err) {
        throw new Error(`Failed to replace outbound audio track: ${err.message}`);
      }
      return audioSender;
    }
    return peerConnection.addTrack(audioTrack, processedStream);
  }

  function createOutboundStreamForWebRTC(getProcessedStream) {
    const stream = getProcessedStream ? getProcessedStream() : null;
    if (!stream) {
      throw new Error('Processed stream unavailable. Initialize audio first.');
    }
    return stream;
  }

  return {
    attachProcessedAudioToPeerConnection,
    createOutboundStreamForWebRTC
  };
})();

window.WebRTCRouter = WebRTCRouter;
