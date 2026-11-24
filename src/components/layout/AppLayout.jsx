import React, { useState } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import { NAVIGATION_ITEMS } from './navigation'

export default function AppLayout({ children, currentTab, onSelectTab, role, onToggleRole }) {
  const currentItem = NAVIGATION_ITEMS.find((it) => it.id === currentTab) || NAVIGATION_ITEMS[0]

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Header activeTabName={currentItem.label} role={role} onToggleRole={onToggleRole} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar currentTab={currentTab} onSelectTab={onSelectTab} role={role} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      <BottomNav currentTab={currentTab} onSelectTab={onSelectTab} role={role} />
    </div>
  )
}
