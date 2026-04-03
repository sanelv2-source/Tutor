import React from 'react';

export default function Logo({ 
  iconSize = "w-10 h-10", 
  textSize = "text-2xl",
  showText = true,
  textColor = "text-slate-900"
}: { 
  iconSize?: string, 
  textSize?: string,
  showText?: boolean,
  textColor?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-md text-white font-black ${iconSize}`}>
        T
      </div>
      {showText && <span className={`font-bold tracking-tight ${textColor} ${textSize}`}>TutorFlyt</span>}
    </div>
  );
}
