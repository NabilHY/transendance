import Providers from './providers';
import { Suspense } from 'react';
import Sidebar from '@/components/NewSidebar';
import Header from '@/components/Header';
import './globals.css';

export const metadata = {
	title: 'ft_transendance_42',
	description: 'Next.js frontend for auth backend',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" style={{ height: '100%' }}>
			<body style={{ margin: 0, padding: 0, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
				<Suspense fallback={null}>
					<Providers>

					<Header />
					<main style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
						<Sidebar />
						<div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
							{children}
						</div>
					</main>
					</Providers>
				</Suspense>
			</body>
		</html>
	);
}
