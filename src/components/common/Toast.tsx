import React from 'react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="fixed top-5 z-50 px-4 py-2.5 rounded-full bg-black/85 backdrop-blur-md text-white text-sm font-medium shadow-2xl animate-bounce flex items-center gap-2 border border-white/10">
      <span className="inline-block w-2 h-2 rounded-full bg-[#25F4EE] animate-ping" />
      <span>{message}</span>
    </div>
  );
};
