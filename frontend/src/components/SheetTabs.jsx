import React from 'react'
import { MenuIcon, ChevronDownIcon } from './Icons.jsx'

export default function SheetTabs({ activeTab, onSelectTab, counts }) {
  const tabs = [
    { id: 'ALL', label: 'ALL' },
    { id: '1', label: 'เทอม 1' },
    { id: '2', label: 'เทอม 2' },
    { id: '3', label: 'เทอม 3' },
  ]

  return (
    <footer className="sheets-bottombar">
      <button className="sheets-menu-btn" title="รายการแผ่นงาน" type="button">
        <MenuIcon size={18} />
      </button>

      <div className="sheet-tab-list">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              className={`sheet-tab ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTab(tab.id)}
            >
              <span>{tab.label}</span>
              <span className="tab-arrow">
                <ChevronDownIcon size={10} />
              </span>
            </button>
          )
        })}
      </div>

      <div className="sheet-stats-summary">
        {counts ? `${counts.showing} / ${counts.total} วิชา` : ''}
      </div>
    </footer>
  )
}
