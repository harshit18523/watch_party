# watch_party

#### A Watch Party system that allows multiple users to watch YouTube videos together in real time.

* This app is deployed [here (live link)](https://watch-party-ivory-chi.vercel.app)

* Refer my [Medium story](https://medium.com/@harshitpareek241/building-a-real-time-watch-party-app-architecture-and-code-walkthrough-13b55a6c3618) for more details about the working of my application

## Tech Stack and Libraries used
- **Languages:** TypeScript
- **Backend:** Socket.IO, Express.js
- **Frontend:** Vite, React.js, react-router, lucide-react, tailwindcss, react-youtube

## Features
- Real Time Synchronization using web sockets
- Video play/pause, seek and playback is synchronized across all participants
- Hybrid Video Synchronization (both event based and polling)
- Room-based model (there can be multiple rooms)
- Role-based access -> [Host, Moderator, Participant]
- Persistent Chat in each room (new user also sees the previous chat)
- Floating emoji reactions
- Host can lock/unlock the room. Nobody can enter in a locked room 

## Working
- To create a room, user needs to enter name and create a unique room id
- To join an existing room, user has to enter name and room id of the room it wants to join
- A user can also join an existing room by the link shared by participants
- Host has the power to play/pause, seek video, change video, transfer host and delete the room and lock the room
- Moderator has the powers to play/pause seek and change video


## Setup and Run Instructions to use locally
1. Clone this repository
2. Open Terminal
3. Go inside *backend* directory `cd backend`
4. Run `npm i`
5. Run `npm run dev` and server will start running at port 3000
6. Open another Terminal window/tab
7. Go inside *frontend* directory `cd frontend`
8. Run `npm i`
9. Run `npm run dev` and frontend will start running at port 5173
10. Open browser and visit http://localhost:5173/ and now you can use my Watch Party app.

### Architecture overview and Code Walkthrough readiness
I have written a [Medium story](https://medium.com/@harshitpareek241/building-a-real-time-watch-party-app-architecture-and-code-walkthrough-13b55a6c3618) explaining everything
