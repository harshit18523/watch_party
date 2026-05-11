import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from "react-router";

import './index.css';
import App from './App.tsx';
import JoinRoom from './pages/JoinRoom.tsx';
import CreateRoom from './pages/CreateRoom.tsx';
import Room from './pages/Room.tsx';

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/join",
    element: <JoinRoom />,
  },
  {
    path: "/create",
    element: <CreateRoom />,
  },
  {
    path: "/room/:roomId",
    element: <Room />,
  }
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
