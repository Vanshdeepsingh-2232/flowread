import React from 'react';
import { ArrowLeft, Moon, Sun, Coffee } from 'lucide-react';
import { Theme } from '../types';

interface ProfileProps {
  onBack: () => void;
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const Profile: React.FC<ProfileProps> = ({ onBack, currentTheme, onThemeChange }) => {
  return (
    <div className="min-h-screen bg-background text-text p-6 md:p-10 max-w-2xl mx-auto animate-fade-in">
      <header className="mb-8 flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-surface rounded-full transition"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">Profile & Settings</h1>
      </header>

      <section className="bg-surface p-6 rounded-2xl border border-slate-700/20 shadow-lg mb-6">
        <h2 className="text-lg font-semibold mb-4 border-b border-slate-700/10 pb-2">Appearance</h2>
        
        <div className="grid grid-cols-1 gap-4">
           <div>
             <p className="text-sm text-muted mb-3">Color Theme</p>
             <div className="flex gap-2">
               <button 
                 onClick={() => onThemeChange('light')}
                 className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 transition ${currentTheme === 'light' ? 'border-primary bg-primary/10 text-primary' : 'border-slate-700/20 hover:bg-slate-700/10'}`}
               >
                 <Sun size={24} />
                 <span className="text-sm font-medium">Light</span>
               </button>
               
               <button 
                 onClick={() => onThemeChange('dark')}
                 className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 transition ${currentTheme === 'dark' ? 'border-primary bg-primary/10 text-primary' : 'border-slate-700/20 hover:bg-slate-700/10'}`}
               >
                 <Moon size={24} />
                 <span className="text-sm font-medium">Dark</span>
               </button>
               
               <button 
                 onClick={() => onThemeChange('coffee')}
                 className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 transition ${currentTheme === 'coffee' ? 'border-primary bg-primary/10 text-primary' : 'border-slate-700/20 hover:bg-slate-700/10'}`}
               >
                 <Coffee size={24} />
                 <span className="text-sm font-medium">Coffee</span>
               </button>
             </div>
           </div>
        </div>
      </section>

      <section className="bg-surface p-6 rounded-2xl border border-slate-700/20 shadow-lg">
        <h2 className="text-lg font-semibold mb-4 border-b border-slate-700/10 pb-2">Account</h2>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
            JD
          </div>
          <div>
            <h3 className="font-medium text-lg">Local User</h3>
            <p className="text-sm text-muted">Data stored locally on device</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Profile;
