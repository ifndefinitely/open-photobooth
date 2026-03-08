import { useEffect, useState } from 'react'
import type { CaptureResult } from '@/services/cameraService'
import { generateFilterThumbnail } from '@/services/filterService'
import type { FilterType } from '@/stores/stripStore'
import { useT } from '@/i18n'
import styles from './FilterSelector.module.css'

interface FilterSelectorProps {
  previewPhoto: CaptureResult
  selectedFilter: FilterType
  onFilterSelect: (filter: FilterType) => void
  availableFilters: FilterType[]
}

function FilterSelector({
  previewPhoto,
  selectedFilter,
  onFilterSelect,
  availableFilters
}: FilterSelectorProps): React.JSX.Element {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})
  const t = useT()

  const filterLabel = (filter: FilterType): string => t(`filter.${filter}`)

  useEffect(() => {
    let cancelled = false

    async function generateThumbnails(): Promise<void> {
      const results: Record<string, string> = {}
      for (const filter of availableFilters) {
        if (cancelled) return
        results[filter] = await generateFilterThumbnail(previewPhoto, filter, 120)
      }
      if (!cancelled) {
        setThumbnails(results)
      }
    }

    generateThumbnails()
    return () => {
      cancelled = true
    }
  }, [previewPhoto, availableFilters])

  return (
    <div className={styles.container}>
      {availableFilters.map((filter) => (
        <button
          key={filter}
          className={`${styles.filterButton} ${selectedFilter === filter ? styles.selected : ''}`}
          onClick={() => onFilterSelect(filter)}
          type="button"
        >
          <div className={styles.thumbnailWrapper}>
            {thumbnails[filter] ? (
              <img
                src={thumbnails[filter]}
                alt={filterLabel(filter)}
                className={styles.thumbnail}
                draggable={false}
              />
            ) : (
              <div className={styles.thumbnailPlaceholder} />
            )}
          </div>
          <span className={styles.filterLabel}>{filterLabel(filter)}</span>
        </button>
      ))}
    </div>
  )
}

export default FilterSelector
