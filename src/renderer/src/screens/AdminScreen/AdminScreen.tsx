import { useState } from 'react'
import { useNavigationStore } from '@/stores/navigationStore'
import { ADMIN_SECTIONS } from './adminSections'
import styles from './AdminScreen.module.css'

function AdminScreen(): React.JSX.Element {
  const goHome = useNavigationStore((state) => state.goHome)
  const [activeSectionId, setActiveSectionId] = useState(ADMIN_SECTIONS[0].id)

  const activeSection = ADMIN_SECTIONS.find((s) => s.id === activeSectionId) ?? ADMIN_SECTIONS[0]

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>Admin Settings</h1>
        <button className={styles.exitButton} onClick={goHome}>
          Exit Admin
        </button>
      </div>
      <div className={styles.body}>
        <nav className={styles.sidebar}>
          {ADMIN_SECTIONS.map((section) => (
            <button
              key={section.id}
              className={`${styles.sidebarItem}${section.id === activeSectionId ? ` ${styles.sidebarItemActive}` : ''}`}
              onClick={() => setActiveSectionId(section.id)}
            >
              {section.label}
            </button>
          ))}
        </nav>
        <main className={styles.content}>
          {activeSection.component ? (
            <activeSection.component />
          ) : (
            <>
              <h2 className={styles.sectionTitle}>{activeSection.label}</h2>
              <p className={styles.sectionPlaceholder}>
                Settings for {activeSection.label} will be added in a future epic.
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default AdminScreen
