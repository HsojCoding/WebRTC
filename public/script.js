const socket = io('/')
const videoGrid = document.getElementById('video-grid')
var myPeer = new Peer(undefined, {
    host: 'joshhadfield.uk',
    port: '',
    path: '/peerjs',
    secure: true
})
const myVideo = document.createElement('video')
let myId;
let localStream;
myVideo.muted = true
const peers = {}

myPeer.on('open', async id => {
    socket.emit('join-room', ROOM_ID, id)
    console.log('Room ID: ', ROOM_ID)
    console.log('Your Id: ', id)
    myId = id;
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ 'video': true, 'audio': true });
        console.log('Local Video Loaded. ', localStream)
    } catch(error) {
	try {
		localStream = await navigator.mediaDevices.getUserMedia({ 'video': false, 'audio': true });
		console.log('Local audio loaded')
	} catch(error) {
		console.log("Unable to load audio", error);
	}
	console.error("Unable to load video", error);
    }
    try {
	addVideoStream(myVideo, localStream)
    } catch(error) {
	console.error("Unable to load local video element", error)
    }
})

myPeer.on('call', async call => {
    try {
        if (call.peer != myId) {
		try {
        	    localStream = await navigator.mediaDevices.getUserMedia({ 'video': true, 'audio': true });
		} catch(error) {
			try {
				localStream = await navigator.mediaDevices.getUserMedia({ 'video': false, 'audio': true });
				console.log("Loaded local audio")
			} catch(error) {
				console.error("Unable to load local audio", error);
			}
			console.error("Unable to load local video", error);
		}
            call.answer(localStream);
            console.log('Answered call with local stream.')
            console.log('   From User: ', call.peer)
            console.log('   Call: ', call)
        }
    } catch(error) {
        console.error('Unable to answer call.')
    }

    try {
        const video = document.createElement('video');
        call.on('stream', userVideoStream => {
            addVideoStream(video, userVideoStream);
            console.log('Loaded Video Stream')
        })
        peers[call.peer] = {
            callInfo: call,
            videoElement: video
        }
    } catch(error) {
        console.error('Failed to load peer call', error)
    }

})

socket.on("user-connected", async userId => {
    try {
        if (userId != myId) {
            console.log('User Connected: ' + userId)
	   try {
            	localStream = await navigator.mediaDevices.getUserMedia({ 'video': true, 'audio': true })
	   } catch(error) {
		try {
			localStream = await navigator.mediaDevices.getUserMedia({ 'video': false, 'audio': true });
			console.log("Loaded local audio")
		} catch(error) {
			console.error("Unable to load local audio", error);
		}
		console.error("Unable to load local video", error);
	   }
            connectToNewPeer(userId, localStream)
        }
    } catch(error) {
	console.error("Unable to send stream", error);
    }
})

socket.on('user-disconnected', userId => {
    if (peers[userId]) {
        peers[userId].callInfo.close()
        peers[userId].videoElement.remove()
        console.log("Closed Connection: ", userId)
        delete peers[userId]
    };
})

function connectToNewPeer(userId, stream) {
    const call = myPeer.call(userId, stream);
    const video = document.createElement('video');
    call.on('stream', userVideoStream => {
        try {
            addVideoStream(video, userVideoStream);
            console.log('Video Stream Loaded:');
            console.log('   User Id: ', userId);
            console.log('   Stream Data: ', userVideoStream);
        } catch(error) {
            console.error('Video from: ', userId, ' Failed to load.', error)
        }
    });
    call.on('close', () => {
        if (video) video.remove();
        console.log('Video Stream Dropped:');
        console.log('   User Id: ', userId);
    })

    peers[userId] = {
        callInfo: call,
        videoElement: video
    }
}

function addVideoStream(video, stream) {
    try {
        video.srcObject = stream;
        video.addEventListener('loadedmetadata', () => {
            video.play();
        });
        videoGrid.append(video);
    } catch(error) {
        console.error('Failed to create video element. ', error);
    }
}
