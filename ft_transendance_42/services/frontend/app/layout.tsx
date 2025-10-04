import Providers from './providers';
import { Suspense } from 'react';
export const metadata = {
	title: 'ft_transendance_42',
	description: 'Next.js frontend for auth backend',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body>
				<Suspense fallback={null}>
					<Providers>{children}</Providers>
				</Suspense>
			</body>
		</html>
	);
}


