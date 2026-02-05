"use client";

import React from "react";

interface ControlsProps {
  children: React.ReactNode;
  className?: string;
}

export function Controls({ children, className = "" }: ControlsProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 p-3 bg-surface rounded-lg border border-white/10 ${className}`}
      role="toolbar"
    >
      {children}
    </div>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
}

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const base =
    "px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary:
      "bg-accent text-white hover:bg-accent-hover focus:ring-accent",
    secondary:
      "bg-surface-muted text-foreground hover:bg-white/10 focus:ring-surface-muted",
    danger:
      "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  };
  return (
    <button
      type={type}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
