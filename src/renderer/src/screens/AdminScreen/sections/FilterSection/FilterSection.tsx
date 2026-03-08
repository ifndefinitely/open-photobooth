import { useStripSettingsStore } from '@/stores/stripSettingsStore'
import { Toggle } from '@/components/admin'
import styles from './FilterSection.module.css'

function FilterSection(): React.JSX.Element {
  const filtersEnabled = useStripSettingsStore((s) => s.filtersEnabled)
  const filterBlackAndWhite = useStripSettingsStore((s) => s.filterBlackAndWhite)
  const filterSepia = useStripSettingsStore((s) => s.filterSepia)
  const filterVintage = useStripSettingsStore((s) => s.filterVintage)
  const setFiltersEnabled = useStripSettingsStore((s) => s.setFiltersEnabled)
  const setFilterBlackAndWhite = useStripSettingsStore((s) => s.setFilterBlackAndWhite)
  const setFilterSepia = useStripSettingsStore((s) => s.setFilterSepia)
  const setFilterVintage = useStripSettingsStore((s) => s.setFilterVintage)

  return (
    <div className={styles.section}>
      <h2 className={styles.title}>Filters</h2>

      <div className={styles.controls}>
        <Toggle
          label="Enable filters"
          value={filtersEnabled}
          onChange={setFiltersEnabled}
          description="When disabled, the filter selection UI is hidden from users entirely."
        />

        <Toggle
          label="Black & White"
          value={filterBlackAndWhite}
          onChange={setFilterBlackAndWhite}
          disabled={!filtersEnabled}
        />

        <Toggle
          label="Sepia"
          value={filterSepia}
          onChange={setFilterSepia}
          disabled={!filtersEnabled}
        />

        <Toggle
          label="Vintage"
          value={filterVintage}
          onChange={setFilterVintage}
          disabled={!filtersEnabled}
        />
      </div>
    </div>
  )
}

export default FilterSection
