import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, GraduationCap, Sparkles, ArrowRight, ShieldCheck, BrainCircuit, FolderKanban } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Footer from './Footer';
import TestimonialChat from './TestimonialChat';
import Login from './Login';

import img1 from '../assets/image1.jpg';
import img2 from '../assets/image2.jpg';
import img3 from '../assets/image3.jpg';
import img4 from '../assets/image4.jpg';
import img5 from '../assets/image5.jpg';
import img6 from '../assets/image6.jpg';
import img7 from '../assets/image7.jpg';
import img8 from '../assets/image8.jpg';

export default function RoleSelector({ user, setUser }) {
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    if (user?.role === 'student') {
      navigate('/student-dashboard');
    } else if (user?.role === 'teacher') {
      navigate('/teacher-dashboard');
    }
  }, [user, navigate]);

  const handleSelect = (role) => {
    navigate(role === 'student' ? '/student-login' : '/teacher-login');
  };

  const imageSets = [
    [img1, img2, img3, img4, img5, img6, img7, img8],
    [img5, img6, img7, img8, img1, img2, img3, img4],
    [img3, img4, img1, img2, img7, img8, img5, img6],
  ];
  const [currentSet, setCurrentSet] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);

  const heroLines = [
    'Loved by millions of students and teachers.',
    'Making learning fun and smarter.',
    'Trusted by educators worldwide.',
  ];

  const highlightStats = [
    { label: 'Exams automated', value: '1.4K+' },
    { label: 'Avg. feedback time', value: '1.8m' },
    { label: 'Teacher satisfaction', value: '98%' },
  ];

  const featureCards = [
    { icon: BrainCircuit, title: 'AI-powered evaluation', text: 'Automate grading, highlight gaps, and deliver faster feedback.' },
    { icon: FolderKanban, title: 'One place for work', text: 'Track exams, submissions, issues, and assignment progress in one dashboard.' },
    { icon: ShieldCheck, title: 'Built for trust', text: 'Secure, clear, and student-friendly workflows for every learning moment.' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSet((prev) => (prev + 1) % imageSets.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setLineIndex((prev) => (prev + 1) % heroLines.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const images = imageSets[currentSet];

  return (
    <div className="portal-landing min-h-screen relative overflow-hidden">
      <nav className="relative z-10 w-full flex justify-between items-center px-6 py-4 shadow-sm border-b border-white/60 bg-white/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">AI Evaluation</h1>
          <p className="mt-0.5 text-xs font-medium tracking-wide text-slate-500">Exam assessment workspace</p>
        </div>
        <button
          onClick={() => setShowLoginModal(true)}
          className="portal-button-secondary"
        >
          Sign In
        </button>
      </nav>

      <div className="relative z-10 px-4 py-14 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="portal-hero-panel">
            <div className="flex flex-col items-center text-center">
              <span className="portal-pill inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI-Powered learning ecosystem
              </span>

              <h1 className="mt-7 max-w-4xl text-4xl font-black tracking-[-0.06em] text-slate-900 md:text-6xl leading-[1.02]">
                Where classrooms <br /> become connected communities
              </h1>

              <AnimatePresence mode="wait">
                <motion.p
                  key={lineIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.6 }}
                  className="mt-6 max-w-2xl text-lg text-slate-600 md:text-xl"
                >
                  {heroLines[lineIndex]}
                  <br />
                  <span className="font-semibold text-emerald-700">
                    Free for everyone, forever.
                  </span>
                </motion.p>
              </AnimatePresence>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={() => handleSelect('student')}
                  className="portal-button-primary"
                >
                  Student portal
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleSelect('teacher')}
                  className="portal-button-secondary"
                >
                  Teacher portal
                </button>
              </div>

              <div className="mt-10 grid w-full max-w-3xl grid-cols-1 gap-4 md:grid-cols-3">
                {highlightStats.map((stat) => (
                  <div key={stat.label} className="portal-stat-card">
                    <div className="text-2xl font-black text-slate-900 md:text-3xl">{stat.value}</div>
                    <div className="mt-2 text-sm text-slate-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 px-4 pb-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700/85">Choose your role</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-800 md:text-4xl">It’s time to start your journey</h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <button
              onClick={() => handleSelect('student')}
              className="portal-role-card portal-role-card-student"
            >
              <div className="portal-role-icon portal-role-icon-student">
                <GraduationCap className="h-8 w-8" />
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-slate-900">Student</div>
                <div className="mt-2 text-sm text-slate-600">Submit work, track assessments, and get clearer feedback instantly.</div>
              </div>
              <div className="portal-role-arrow">→</div>
            </button>

            <button
              onClick={() => handleSelect('teacher')}
              className="portal-role-card portal-role-card-teacher"
            >
              <div className="portal-role-icon portal-role-icon-teacher">
                <User className="h-8 w-8" />
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-slate-900">Teacher</div>
                <div className="mt-2 text-sm text-slate-600">Manage exams, evaluate efficiently, and keep learning outcomes visible.</div>
              </div>
              <div className="portal-role-arrow">→</div>
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 px-4 pb-10">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-5 md:grid-cols-3">
            {featureCards.map(({ icon: Icon, title, text }) => (
              <div key={title} className="portal-feature-card">
                <div className="portal-feature-icon">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 bg-slate-100/70 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="relative flex flex-wrap justify-center gap-x-10 gap-y-12 px-2 md:gap-x-14">
            {images.map((img, index) => (
              <div key={index} className="flex flex-col items-center swing">
                <div className="w-1 h-10 bg-emerald-300" />
                <div className="w-4 h-4 rounded-full border-2 border-white bg-emerald-600 -mt-2 z-10 shadow" />
                <img
                  src={img}
                  alt={`Hanging ${index + 1}`}
                  className="w-40 h-40 rounded-2xl border-4 border-white object-cover shadow-lg shadow-slate-200/70 transition duration-500 hover:-translate-y-1 md:w-44 md:h-44"
                />
              </div>
            ))}
          </div>
          <h2 className="mt-12 text-center text-2xl font-bold tracking-tight text-slate-800 md:text-3xl">
            Keeping teachers and students connected
          </h2>
        </div>
      </div>

      <TestimonialChat />
      <Footer />

      <Login
        showModal={showLoginModal}
        setShowModal={setShowLoginModal}
        setUser={setUser}
      />
    </div>
  );
}
