import styles from './SectionHeader.module.css'

interface SectionHeaderProps {
  title: string
}

function SectionHeader({ title }: SectionHeaderProps): React.JSX.Element {
  return (
    <div className={styles.header}>
      <h3 className={styles.title}>{title}</h3>
    </div>
  )
}

export default SectionHeader
