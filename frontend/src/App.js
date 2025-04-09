import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import AuthPage from './components/Auth/AuthPage';
import Task from "./components/Task";
import Dashboard from "./components/Dashboard";
import Reports from "./components/Reports";
import { Toaster } from "react-hot-toast";

const PrivateRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('token');
  return isAuthenticated ? children : <Navigate to="/auth" />;
};

function App() {
  return (
    <>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <AppLayout>
                <Toaster
                  position="top-right"
                  gutter={8}
                />
                <Routes>
                  <Route path="/:projectId" element={<Task />} />
                  <Route path="/dashboard/:id" element={<Dashboard />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/" element={
                    <div className="flex flex-col items-center w-full pt-10">
                      <img src="./image/welcome.svg" className="w-5/12" alt="" />
                      <h1 className="text-lg text-gray-600">Select or create new project</h1>
                    </div>
                  } />
                </Routes>
              </AppLayout>
            </PrivateRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
