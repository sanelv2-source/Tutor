import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Logo from './Logo';

export default function Navbar({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigation = (page: string) => {
    onNavigate(page);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={() => handleNavigation('landing')}
          >
            <Logo iconSize="w-8 h-8 text-lg" textSize="text-xl" />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => handleNavigation('landing')} 
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Hjem
            </button>
            <button 
              onClick={() => handleNavigation('how-it-works')} 
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Slik fungerer det
            </button>
            <button 
              onClick={() => handleNavigation('pricing')} 
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Priser
            </button>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <button 
              onClick={() => handleNavigation('login')} 
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-4 py-2"
            >
              Logg inn
            </button>
            <button 
              onClick={() => handleNavigation('signup')}
              className="text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors px-5 py-2.5 rounded-full shadow-sm"
            >
              Kom i gang
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-slate-600 hover:text-slate-900 focus:outline-none p-2"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-100 shadow-lg absolute w-full">
          <div className="px-4 pt-2 pb-6 space-y-1 flex flex-col">
            <button 
              onClick={() => handleNavigation('landing')} 
              className="block px-3 py-4 text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md text-left"
            >
              Hjem
            </button>
            <button 
              onClick={() => handleNavigation('how-it-works')} 
              className="block px-3 py-4 text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md text-left"
            >
              Slik fungerer det
            </button>
            <button 
              onClick={() => handleNavigation('pricing')} 
              className="block px-3 py-4 text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md text-left"
            >
              Priser
            </button>
            <div className="h-px bg-slate-100 my-2"></div>
            <button 
              onClick={() => handleNavigation('login')} 
              className="block px-3 py-4 text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md text-left"
            >
              Logg inn
            </button>
            <button 
              onClick={() => handleNavigation('signup')}
              className="block w-full text-center mt-4 px-5 py-3 text-base font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors rounded-full shadow-sm"
            >
              Kom i gang
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
