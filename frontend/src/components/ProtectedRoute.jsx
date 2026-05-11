import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <Outlet />
    </>
  );
};

export default ProtectedRoute;
