import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext'; // ✅ Import useAuth
import GoogleSignInButton from './GoogleSignInButton';

export default function Login({ showModal, setShowModal }) {
	const { login, authLoading } = useAuth(); // ✅ Get login function from context
	const [form, setForm] = useState({ email: '', password: '' });
	const [error, setError] = useState('');

	const handleChange = (e) => {
		setForm({ ...form, [e.target.name]: e.target.value });
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError(''); // Clear previous errors
		if (!form.email || !form.password) {
			setError("Email and password are required.");
			return;
		}
		const result = await login(form);
		if (!result.success) {
			setError(result.message);
		} else {
			setShowModal(false); // Close modal on success
		}
	};

	return (
		<AnimatePresence>
			{showModal && (
				<motion.div
					className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-sm p-4"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					onClick={() => setShowModal(false)} // Close modal on overlay click
				>
					<motion.div
						initial={{ scale: 0.9, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0.9, opacity: 0 }}
						transition={{ type: 'spring', stiffness: 200 }}
						className="portal-auth-card relative z-10 w-full max-w-md px-8 py-10"
						onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the form
					>
						<button onClick={() => setShowModal(false)} className="absolute top-3 right-4 text-gray-500 text-2xl hover:text-gray-900" aria-label="Close login">&times;</button>
						<h2 className="text-3xl font-bold text-center text-gray-900 mb-2">Welcome back</h2>
						<p className="text-center text-gray-500 mb-6">Sign in to continue to your workspace.</p>
						<div className="mb-5">
							<GoogleSignInButton
								onError={setError}
								onSuccess={() => setShowModal(false)}
							/>
						</div>
						<form onSubmit={handleSubmit} className="space-y-4 text-gray-800">
							{error && <p className="text-red-700 text-sm text-center bg-red-50 p-3 rounded-lg">{error}</p>}
							<div className="relative">
								<User className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
								<input type="email" name="email" placeholder="Email address" value={form.email} onChange={handleChange} required className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-gray-200 placeholder-gray-400 text-gray-900 focus:ring-2 focus:ring-emerald-700/20 focus:outline-none"/>
							</div>
							<div className="relative">
								<Lock className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
								<input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} required className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-gray-200 placeholder-gray-400 text-gray-900 focus:ring-2 focus:ring-emerald-700/20 focus:outline-none"/>
							</div>
							<button type="submit" disabled={authLoading} className="w-full bg-emerald-900 hover:bg-emerald-800 text-white py-3 rounded-xl text-base font-semibold shadow-sm transition disabled:bg-gray-400 disabled:cursor-not-allowed">
								{authLoading ? 'Logging in...' : 'Login'}
							</button>
						</form>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}