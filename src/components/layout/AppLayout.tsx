import { ReactNode } from 'react';
import BottomNav from './BottomNav';

interface AppLayoutProps {
  children: ReactNode;
  noPadding?: boolean;
}

export default function AppLayout({ children, noPadding }: AppLayoutProps) {
  return (
    <div className="app-container min-h-screen bg-dark">
      <div className={noPadding ? '' : 'pb-20'}>
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
