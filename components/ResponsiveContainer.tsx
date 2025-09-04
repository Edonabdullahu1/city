'use client';

import React, { ReactNode } from 'react';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
}

export default function ResponsiveContainer({ 
  children, 
  className = '' 
}: ResponsiveContainerProps) {
  return (
    <div className={`
      w-full
      px-4 sm:px-6 lg:px-8
      mx-auto
      max-w-7xl
      ${className}
    `}>
      {children}
    </div>
  );
}

export function ResponsiveGrid({ 
  children, 
  className = '' 
}: ResponsiveContainerProps) {
  return (
    <div className={`
      grid
      grid-cols-1
      sm:grid-cols-2
      lg:grid-cols-3
      xl:grid-cols-4
      gap-4 sm:gap-6
      ${className}
    `}>
      {children}
    </div>
  );
}

export function ResponsiveCard({ 
  children, 
  className = '' 
}: ResponsiveContainerProps) {
  return (
    <div className={`
      bg-white
      rounded-lg
      shadow-sm
      p-4 sm:p-6
      ${className}
    `}>
      {children}
    </div>
  );
}

export function ResponsiveTable({ 
  children, 
  className = '' 
}: ResponsiveContainerProps) {
  return (
    <div className={`
      overflow-x-auto
      -mx-4 sm:-mx-6 lg:-mx-8
      ${className}
    `}>
      <div className="inline-block min-w-full py-2 align-middle px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
          {children}
        </div>
      </div>
    </div>
  );
}

export function ResponsiveButton({ 
  children, 
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  className = '',
  ...props 
}: ResponsiveContainerProps & {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  [key: string]: any;
}) {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white'
  };

  const sizes = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg'
  };

  return (
    <button
      className={`
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        rounded-lg
        font-medium
        transition-colors
        focus:outline-none
        focus:ring-2
        focus:ring-offset-2
        focus:ring-blue-500
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}

export function ResponsiveModal({ 
  children, 
  isOpen,
  onClose,
  title,
  className = '' 
}: ResponsiveContainerProps & {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end sm:items-center justify-center p-4 text-center sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className={`
          relative
          inline-block
          align-bottom sm:align-middle
          bg-white
          rounded-lg
          text-left
          overflow-hidden
          shadow-xl
          transform
          transition-all
          w-full
          sm:max-w-lg
          sm:w-full
          ${className}
        `}>
          {title && (
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                {title}
              </h3>
            </div>
          )}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ResponsiveStack({ 
  children, 
  direction = 'vertical',
  spacing = 'medium',
  className = '' 
}: ResponsiveContainerProps & {
  direction?: 'vertical' | 'horizontal';
  spacing?: 'small' | 'medium' | 'large';
}) {
  const spacings = {
    small: direction === 'vertical' ? 'space-y-2' : 'space-x-2',
    medium: direction === 'vertical' ? 'space-y-4' : 'space-x-4',
    large: direction === 'vertical' ? 'space-y-6' : 'space-x-6'
  };

  return (
    <div className={`
      ${direction === 'horizontal' ? 'flex flex-wrap items-center' : ''}
      ${spacings[spacing]}
      ${className}
    `}>
      {children}
    </div>
  );
}