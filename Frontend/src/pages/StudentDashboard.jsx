import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, Calendar, AlertCircle, BookOpen, Award, Menu, X } from 'lucide-react';
import Footer from '../components/Footer';

// Import Page Components
import StudentProfile from './StudentProfile';
import StudentTimetable from './StudentTimetable';
import StudentExam from './StudentExam';
import StudentResult from './StudentResult';
import StudentIssue from './StudentIssue';

// Configuration for sidebar items
const sidebarItems = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'timetable', label: 'Timetable', icon: Calendar },
    { id: 'exam', label: 'Take Exam', icon: BookOpen },
    { id: 'result', label: 'Results', icon: Award },
    { id: 'issue', label: 'Raise an Issue', icon: AlertCircle },
];

// Map IDs to components for easy rendering
const pageComponents = {
    profile: StudentProfile,
    timetable: StudentTimetable,
    exam: StudentExam,
    result: StudentResult,
    issue: StudentIssue,
};

export default function StudentDashboard() {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const ActiveComponent = pageComponents[activeTab];
    const activeLabel = sidebarItems.find(item => item.id === activeTab)?.label || 'Dashboard';

    const handleTabClick = (tabId) => {
        setActiveTab(tabId);
        if (isSidebarOpen) {
            setSidebarOpen(false);
        }
    };

    // Sidebar Component for better organization
    const Sidebar = () => (
        <aside 
            className={`portal-sidebar w-72 flex-shrink-0 flex flex-col border-r transition-transform duration-300 ease-in-out z-40
            md:sticky md:top-0 md:h-screen 
            ${isSidebarOpen ? 'translate-x-0 fixed h-dvh' : '-translate-x-full fixed h-dvh md:relative md:translate-x-0'}`}
        >
            <div className="portal-brand px-6 py-5 border-b">
                <h1 className="text-2xl font-bold">Student Portal</h1>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-gray-400">Learning workspace</p>
            </div>
            <nav className="flex-grow p-4 pt-6 space-y-3">
                {sidebarItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => handleTabClick(item.id)}
                            data-active={isActive}
                            aria-current={isActive ? 'page' : undefined}
                            className="portal-nav-link w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 font-medium text-sm"
                        >
                            <item.icon className="w-5 h-5" />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </nav>
            <div className="p-4 border-t border-gray-200">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <img 
                        src={user?.profilePicture || `https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Unknown_person.jpg/1280px-Unknown_person.jpg?20200423155822`} 
                        alt="User Avatar" 
                        className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1 overflow-hidden">
                        <p className="font-semibold text-sm text-gray-800 truncate">{user?.firstName} {user?.lastName}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.rollNumber}</p>
                    </div>
                    <button 
                        onClick={logout} 
                        className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-100 rounded-full transition-colors"
                        aria-label="Logout"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </aside>
    );

    return (
        <div className="portal-shell flex">
            {isSidebarOpen && (
                <button
                    className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-[2px] md:hidden"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close navigation"
                />
            )}
            <Sidebar />
            
            <div className="min-w-0 flex-1 flex flex-col">
                <header className="portal-header border-b px-5 md:px-8 flex justify-between items-center sticky top-0 z-20">
                    <h2 className="text-xl font-bold text-gray-800">{activeLabel}</h2>
                    <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 md:hidden" aria-label="Toggle navigation">
                        {isSidebarOpen ? <X /> : <Menu />}
                    </button>
                </header>

                <main className="portal-main flex-1">
                    <div className="portal-content">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.22 }}
                            >
                                {React.createElement(pageComponents[activeTab])}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>

                <Footer />
            </div>
        </div>
    );
}
