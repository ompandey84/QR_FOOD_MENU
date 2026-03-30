import React from 'react';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

function MainLayout({ activeLink, title, topNavChildren, children }) {
    return (
        <div className="min-h-screen bg-[#FCFAF5] flex">
            <Sidebar active={activeLink} />
            <div className="flex-1 flex flex-col min-w-0 min-h-[100dvh] h-[100dvh] overflow-y-auto relative">
                <TopNav title={title}>
                    {topNavChildren}
                </TopNav>
                {children}
            </div>
        </div>
    );
}

export default MainLayout;
