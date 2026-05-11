# watch_party

#### A Watch Party system that allows multiple users to watch YouTube videos together in real time. Users should be synchronized—when one person pauses, seeks, or changes the video, everyone in the party sees the same action.

* This app is deployed [here (live link)](https://watch-party-ivory-chi.vercel.app)

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

## Tech Stack and Libraries used

- **Languages:** TypeScript
- **Backend:** Socket.IO, Express.js
- **Frontend:** Vite, React.js, react-router, lucide-react, tailwindcss, react-youtube

### Architecture overview and Code Walkthrough readiness
I have written a [Medium story](https://medium.com/@harshitpareek241/building-a-real-time-watch-party-app-architecture-and-code-walkthrough-13b55a6c3618) explaining everything
