"use client";

import { useState, useEffect } from "react";

export interface ToastProps {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
  duration?: number;
}

type ToastListener = (toasts: ToastProps[]) => void;
let listeners: ToastListener[] = [];
let memoryToasts: ToastProps[] = [];

const toastLimit = 5;

const addToast = (toast: Omit<ToastProps, "id">) => {
  const id = Math.random().toString(36).substring(2, 9);
  const newToast = { ...toast, id };
  memoryToasts = [newToast, ...memoryToasts].slice(0, toastLimit);
  listeners.forEach((listener) => listener(memoryToasts));

  if (toast.duration !== 0) {
    setTimeout(() => {
      dismissToast(id);
    }, toast.duration || 4000);
  }

  return id;
};

const dismissToast = (id: string) => {
  memoryToasts = memoryToasts.filter((t) => t.id !== id);
  listeners.forEach((listener) => listener(memoryToasts));
};

export function toast(props: Omit<ToastProps, "id">) {
  return addToast(props);
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>(memoryToasts);

  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter((l) => l !== setToasts);
    };
  }, []);

  return {
    toasts,
    toast,
    dismiss: dismissToast,
  };
}
