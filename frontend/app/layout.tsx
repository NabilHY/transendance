import Providers from './providers';
import { Suspense } from 'react';
import Sidebar from '@/components/NewSidebar';
import Header from '@/components/Header';

export const metadata = {
	title: 'ft_transendance_42',
	description: 'Next.js frontend for auth backend',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body style={{margin: 0, overflow: 'hidden'}} >
				<Suspense fallback={null}>
					<Providers>

						<Header />
						<main style={{ display: 'flex', flex: 1, height: 'calc(100dvh - 60px)' }}>
							<Sidebar />
							<div style={{width: '100%', overflowY: 'auto' }}>
							{/* <div> */}
								{children}
							</div>
						</main>
					</Providers>
				</Suspense>
			</body>
		</html>
	);
}
