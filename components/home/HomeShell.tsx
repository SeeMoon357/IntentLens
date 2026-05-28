/* eslint-disable @next/next/no-img-element */
import { type ReactNode } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import questionIcon from '@/app/question.png';
import { WalletButton } from '@/components/WalletConnect';
import {
	Brain,
	Droplet,
	Eye,
	Route,
	Settings,
	Shield,
	Wallet,
	Zap,
} from 'lucide-react';

export const navItems = [
	{ id: 'dashboard', icon: Wallet, label: 'Jewel-Holder' },
	{ id: 'auto-agent', icon: Brain, label: 'Auto-Agent' },
	{ id: 'analytics', icon: Eye, label: 'Wisdom-Eye' },
	{ id: 'vaults', icon: Shield, label: 'Abhaya-Giver' },
	{ id: 'router', icon: Route, label: 'Avatar-Router' },
	{ id: 'refinery', icon: Droplet, label: 'Amrita-Refinery' },
	{ id: 'executor', icon: Zap, label: 'Vajra-Executor' },
] as const;

export type HomeViewId =
	| (typeof navItems)[number]['id']
	| 'settings'
	| 'insights'
	| 'new-strategy';

type HomeShellProps = {
	currentView: HomeViewId;
	onViewChange: (view: HomeViewId) => void;
	onToggleTheme: () => void;
	children: ReactNode;
};

export default function HomeShell({
	currentView,
	onViewChange,
	onToggleTheme,
	children,
}: HomeShellProps) {
	return (
		<div className='min-h-screen relative overflow-x-hidden bg-surface dark:bg-stone-950 text-on-surface dark:text-stone-50 selection:bg-accent-gold/30'>
			<div className='fixed inset-0 pointer-events-none z-0 overflow-hidden'>
				<motion.div
					animate={{ rotate: 360 }}
					transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
					className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vmax] h-[120vmax] opacity-[0.03]'
				>
					{[...Array(24)].map((_, i) => (
						<div
							key={i}
							style={{
								transform: `translate(-50%, -50%) rotate(${i * 15}deg)`,
							}}
							className='absolute top-1/2 left-1/2 w-full h-[1px] bg-accent-gold'
						/>
					))}
					{[...Array(3)].map((_, i) => (
						<div
							key={i}
							style={{ width: `${(i + 1) * 30}%`, height: `${(i + 1) * 30}%` }}
							className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-accent-gold rounded-full'
						/>
					))}
				</motion.div>
				<div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vmax] h-[150vmax] opacity-10'>
					{[...Array(12)].map((_, i) => (
						<motion.div
							key={i}
							initial={{ rotate: i * 30, scale: 0.8, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							transition={{ duration: 2, delay: i * 0.1, ease: 'easeOut' }}
							className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[2px] bg-gradient-to-r from-transparent via-accent-gold to-transparent'
						/>
					))}
				</div>
				<div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-accent-gold/5 blur-[120px]' />
			</div>

			<motion.div
				initial={{ opacity: 0, scale: 1.1 }}
				animate={{ opacity: 0.08, scale: 1 }}
				transition={{ duration: 3 }}
				className='fixed bottom-[-10%] left-[-10%] w-[60%] pointer-events-none z-0'
			>
				<img
					className='w-full h-auto'
					alt='a large elegant line art illustration of a blooming lotus flower'
					src='https://lh3.googleusercontent.com/aida-public/AB6AXuC3YpnY9flUgdIGfJfahlZkoSL-fu3LeFRJFCVGQ5mGvPpwEM_Ptim-53e49OX06-iDuOiedUFtP9cTT7mAJRRL1G7R1GkEhjdVQOyzRrsnzyXw3MpGQslfgZBDOpxcLfBvVDhzZRrIBJj_QbrnH8iwdsEuLevyuOFl1JqTbMIXlDEWCsyd28OuMzNXroUjrdgShwSwaSG7wLjC92VXTYYvz-WTwZCfCo-VKUE3629YuH1pw1k4avmbFU36KU_viJwI_1nkorpwZoa6'
				/>
			</motion.div>

			<aside className='h-screen w-64 fixed left-0 top-0 bg-stone-100/80 dark:bg-stone-900/80 backdrop-blur-xl border-r border-accent-gold/10 shadow-2xl flex flex-col py-8 px-4 z-50 overflow-y-auto'>
				<div className='mb-10 px-2'>
					<div className='flex items-center gap-3'>
						<motion.div
							whileHover={{ scale: 1.1, rotate: 360 }}
							transition={{ duration: 0.8, ease: 'anticipate' }}
							className='w-14 h-14 bg-[#0a192f] rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.3)] overflow-hidden border-2 border-accent-gold/50'
						>
							<img
								src='https://lh3.googleusercontent.com/aida-public/AB6AXuC3YpnY9flUgdIGfJfahlZkoSL-fu3LeFRJFCVGQ5mGvPpwEM_Ptim-53e49OX06-iDuOiedUFtP9cTT7mAJRRL1G7R1GkEhjdVQOyzRrsnzyXw3MpGQslfgZBDOpxcLfBvVDhzZRrIBJj_QbrnH8iwdsEuLevyuOFl1JqTbMIXlDEWCsyd28OuMzNXroUjrdgShwSwaSG7wLjC92VXTYYvz-WTwZCfCo-VKUE3629YuH1pw1k4avmbFU36KU_viJwI_1nkorpwZoa6'
								alt='Thousand-Hand Guanyin'
								className='w-full h-full object-cover'
								referrerPolicy='no-referrer'
							/>
						</motion.div>
						<div>
							<h1 className='text-2xl font-headline text-emerald-900 dark:text-emerald-100 italic tracking-tight'>
								IntentLens
							</h1>
							<p className='text-[10px] font-label uppercase tracking-widest text-accent-gold font-bold'>
								Intents Flight Recorder
							</p>
						</div>
					</div>
				</div>

				<nav className='flex-1 space-y-1'>
					{navItems.map((item) => (
						<motion.button
							key={item.id}
							onClick={() => onViewChange(item.id)}
							whileHover={{ x: 4 }}
							className={`w-full flex items-center gap-3 px-3 py-3 transition-all rounded-lg group ${
								currentView === item.id
									? 'text-emerald-900 dark:text-emerald-200 font-bold bg-accent-gold/10 border-r-4 border-accent-gold'
									: 'text-stone-500 dark:text-stone-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
							}`}
						>
							<item.icon
								className={`w-5 h-5 ${currentView === item.id ? 'text-accent-gold' : 'group-hover:text-accent-gold'}`}
							/>
							<span className='font-headline italic tracking-tight text-sm'>
								{item.label}
							</span>
						</motion.button>
					))}
				</nav>

				<div className='mt-auto space-y-6'>
					<button
						onClick={() => onViewChange('new-strategy')}
						className={`w-full py-4 rounded-xl bg-gradient-to-r from-primary to-primary-container text-surface font-label text-sm font-semibold shadow-lg hover:opacity-90 transition-opacity ${currentView === 'new-strategy' ? 'ring-2 ring-accent-gold ring-offset-2 ring-offset-stone-900' : ''}`}
					>
						New Strategy
					</button>
					<div className='space-y-1'>
						<button
							onClick={() => onViewChange('settings')}
							className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-label transition-colors ${currentView === 'settings' ? 'text-accent-gold font-bold' : 'text-stone-500 dark:text-stone-400 hover:text-primary'}`}
						>
							<Settings className='w-5 h-5' />
							<span>Settings</span>
						</button>
						<button
							onClick={() => onViewChange('insights')}
							className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-label transition-colors ${currentView === 'insights' ? 'text-accent-gold font-bold' : 'text-stone-500 dark:text-stone-400 hover:text-primary'}`}
						>
							<Brain className='w-5 h-5' />
							<span>Insights</span>
						</button>
					</div>
				</div>
			</aside>

			<header className='fixed top-0 right-0 w-[calc(100%-16rem)] h-16 bg-stone-50/80 dark:bg-stone-950/80 backdrop-blur-md border-b border-stone-200/20 dark:border-stone-800/20 flex justify-between items-center px-8 z-40'>
				<div className='flex items-center gap-4'>
					<span className='text-xl font-headline font-bold text-stone-900 dark:text-stone-100'>
						IntentLens
					</span>
					<span className='bg-primary/10 text-primary text-[10px] px-2 py-1 rounded-full font-label font-bold border border-primary/20'>
						MAINNET LENS
					</span>
				</div>

				<div className='flex items-center gap-8'>
					<nav className='hidden md:flex gap-6'>
						<button
							onClick={() => onViewChange('dashboard')}
							className={`font-body uppercase text-xs tracking-widest py-1 transition-all ${currentView === 'dashboard' ? 'text-emerald-700 dark:text-emerald-400 border-b-2 border-emerald-700' : 'text-stone-400 dark:text-stone-500 hover:text-emerald-600'}`}
						>
							Dashboard
						</button>
						<button
							onClick={() => onViewChange('auto-agent')}
							className={`font-body uppercase text-xs tracking-widest py-1 transition-all ${currentView === 'auto-agent' ? 'text-emerald-700 dark:text-emerald-400 border-b-2 border-emerald-700' : 'text-stone-400 dark:text-stone-500 hover:text-emerald-600'}`}
						>
							Auto-Agent
						</button>
						<button
							onClick={() => onViewChange('analytics')}
							className={`font-body uppercase text-xs tracking-widest py-1 transition-all ${currentView === 'analytics' ? 'text-emerald-700 dark:text-emerald-400 border-b-2 border-emerald-700' : 'text-stone-400 dark:text-stone-500 hover:text-emerald-600'}`}
						>
							Analytics
						</button>
						<button
							onClick={() => onViewChange('vaults')}
							className={`font-body uppercase text-xs tracking-widest py-1 transition-all ${currentView === 'vaults' ? 'text-emerald-700 dark:text-emerald-400 border-b-2 border-emerald-700' : 'text-stone-400 dark:text-stone-500 hover:text-emerald-600'}`}
						>
							Vaults
						</button>
					</nav>

					<div className='h-6 w-[1px] bg-outline-variant/30'></div>

					<div className='flex items-center gap-4'>
						<div className='flex items-center gap-3'>
							<button
								onClick={onToggleTheme}
								className='cursor-pointer w-8 h-8 rounded-full border-none outline-none ring-0 hover:bg-accent-gold/10 text-emerald-700 dark:text-emerald-400 transition-colors flex items-center justify-center'
							>
								<span className='theme-icon-moon dark:hidden'>🌙</span>
								<span className='theme-icon-sun hidden dark:block'>☀️</span>
							</button>

							<button
								aria-label='Help'
								className='cursor-pointer w-8 h-8 rounded-full flex items-center justify-center hover:bg-accent-gold/10 text-emerald-700 dark:text-emerald-400 transition-colors'
							>
								<Image
									src={questionIcon}
									alt='Help'
									width={18}
									height={18}
									className='theme-adaptive-icon'
								/>
							</button>

							<WalletButton />
						</div>
					</div>
				</div>
			</header>

			<main className='pl-64 pt-16 pb-16 min-h-screen z-10 relative'>{children}</main>
		</div>
	);
}
