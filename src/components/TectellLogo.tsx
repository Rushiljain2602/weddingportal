import React from 'react';

interface TectellLogoProps {
  variant?: 'light' | 'dark' | 'color';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  animate?: boolean;
  className?: string;
}

export function TectellIcon({ variant = 'color', size = 'md', animate = false, className = '' }: Omit<TectellLogoProps, 'showText'>) {
  // Size dimensions
  const dimensions = {
    xs: 'h-4 w-4',
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
    xl: 'h-20 w-20'
  }[size];

  // Colors based on variant
  const colors = {
    light: {
      lightBlue: '#ffffff',
      deepBlue: '#e2e8f0',
    },
    dark: {
      lightBlue: '#94a3b8',
      deepBlue: '#475569',
    },
    color: {
      lightBlue: '#7dd3fc', // Sky blue 300
      deepBlue: '#0284c7',  // Sky 600
    }
  }[variant];

  return (
    <svg 
      viewBox="0 0 100 100" 
      className={`${dimensions} ${animate ? 'animate-pulse' : ''} transition-transform duration-350 hover:scale-105 ${className}`}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Top-Left Small Light Blue Square */}
      <rect 
        x="10" 
        y="10" 
        width="24" 
        height="24" 
        rx="2" 
        fill={colors.lightBlue} 
      />
      {/* Top-Right Large Deep Blue Square */}
      <rect 
        x="40" 
        y="10" 
        width="50" 
        height="50" 
        rx="4" 
        fill={colors.deepBlue} 
      />
      {/* Bottom-Left Large Deep Blue Square */}
      <rect 
        x="10" 
        y="40" 
        width="50" 
        height="50" 
        rx="4" 
        fill={colors.deepBlue} 
      />
      {/* Bottom-Right Small Light Blue Square */}
      <rect 
        x="66" 
        y="66" 
        width="24" 
        height="24" 
        rx="2" 
        fill={colors.lightBlue} 
      />
    </svg>
  );
}

export default function TectellLogo({ 
  variant = 'color', 
  size = 'md', 
  showText = true, 
  animate = false,
  className = '' 
}: TectellLogoProps) {
  
  const textColors = {
    light: {
      title: 'text-white',
      subtitle: 'text-stone-300'
    },
    dark: {
      title: 'text-stone-900',
      subtitle: 'text-stone-500'
    },
    color: {
      title: 'text-[#021128]',
      subtitle: 'text-stone-500'
    }
  }[variant];

  const fontSizeTitle = {
    xs: 'text-xs font-black tracking-widest',
    sm: 'text-sm font-extrabold tracking-widest',
    md: 'text-xl font-black tracking-widest',
    lg: 'text-3xl font-black tracking-widest',
    xl: 'text-4xl font-black tracking-widest'
  }[size];

  const fontSizeSub = {
    xs: 'text-[6px] tracking-wider font-semibold uppercase',
    sm: 'text-[7px] tracking-wider font-medium',
    md: 'text-[9px] tracking-widest font-bold uppercase',
    lg: 'text-[11px] tracking-widest font-bold uppercase',
    xl: 'text-xs tracking-widest font-extrabold uppercase'
  }[size];

  const gap = {
    xs: 'gap-1.5',
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
    xl: 'gap-5'
  }[size];

  return (
    <a 
      href="https://tectell.in/"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center ${gap} hover:opacity-95 transition-opacity select-none group cursor-pointer ${className}`}
      title="Visit Tectell.in"
    >
      <TectellIcon variant={variant} size={size} animate={animate} />
      
      {showText && (
        <div className="flex flex-col text-left">
          {/* TECTELL logo text with custom horizontal slit lines style via letter-spacing and font */}
          <span className={`${fontSizeTitle} ${textColors.title} font-sans leading-none tracking-[0.18em] transition-colors group-hover:text-sky-500 duration-300`}>
            TECTELL
          </span>
          <span className={`${fontSizeSub} ${textColors.subtitle} font-sans mt-1 leading-none opacity-85`}>
            Ideas Made Digital
          </span>
        </div>
      )}
    </a>
  );
}

// 🚀 Highly aesthetic animated corporate page loader
export function TectellPageLoader({ message = "Powering digital experiences..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-[#031124] flex flex-col items-center justify-center p-6 z-[9999] text-white">
      {/* Radial lighting background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl -z-10" />
      
      <div className="flex flex-col items-center space-y-6 max-w-xs text-center animate-fade-in">
        {/* Glowing floating logo icon */}
        <div className="relative p-5 bg-white/5 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-md animate-bounce" style={{ animationDuration: '3s' }}>
          <TectellIcon variant="color" size="lg" animate={true} />
          {/* Pulsing ring indicator around */}
          <div className="absolute -inset-1 rounded-3xl border border-sky-400/20 animate-ping" style={{ animationDuration: '2s' }} />
        </div>

        <div className="space-y-2">
          {/* Logo Brand */}
          <div className="flex flex-col items-center">
            <span className="text-xl font-black tracking-[0.25em] text-white font-sans">TECTELL</span>
            <span className="text-[9px] tracking-widest font-bold uppercase text-sky-400 font-sans mt-1">Ideas Made Digital</span>
          </div>

          <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-sky-400 to-transparent mx-auto my-3" />
          
          <p className="text-xs text-stone-300 font-medium tracking-wide">
            {message}
          </p>
        </div>

        <div className="flex items-center gap-1.5 pt-2">
          {/* Flowing loader dots */}
          <span className="h-2 w-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="h-2 w-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="h-2 w-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        
        <a 
          href="https://tectell.in/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[10px] font-mono text-sky-300/60 hover:text-sky-300 hover:underline transition-all pt-4 block"
        >
          tectell.in
        </a>
      </div>
    </div>
  );
}
