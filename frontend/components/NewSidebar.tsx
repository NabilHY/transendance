'use client';

// import styles from '@/styles/NewSidebar.module.css';
import logo from '@/public/racket.png';
import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

const authenticatedItems = [
    { id: "home", label: "Dashboard", href: "/" },
    { id: "chat", label: "Chat", href: "/chat" },
];


const unauthenticatedItems = [
    { id: "login", label: "Login", href: "/login" },
    { id: "register", label: "Register", href: "/register" },
    { id: "forgot-password", label: "Forgot Password", href: "/forgot-password" },
];

export default function NewSidebar() {
    const { isLoggedIn } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const items = isLoggedIn ? authenticatedItems : unauthenticatedItems;
    
    const getActiveItem = () => {
        return items.find((item) => pathname === item.href);
    }
    
    const handleNavigation = (path: string) => {
        router.push(path);
    }
    
    

    return (
        <aside >
            <div >
                <div >
                    <Link href="/">
                        <img src={logo.src} alt="Logo" width={100} height={100} />
                    </Link>
                </div>
            </div>
            <nav >
                {items.map((item) => (
                    <Link key={item.id} href={item.href} >
                        {item.label}
                    </Link>
                ))}
            </nav>
        </aside>
    );
}