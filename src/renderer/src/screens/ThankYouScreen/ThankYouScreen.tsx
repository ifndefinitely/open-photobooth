import { useNavigationStore } from '@/stores/navigationStore'
import { useStripStore } from '@/stores/stripStore'
import { useIdleTimeout } from '@/hooks/useIdleTimeout'
import { useT } from '@/i18n'
import IdleCountdown from '@/components/IdleCountdown/IdleCountdown'
import styles from './ThankYouScreen.module.css'

function ThankYouScreen(): React.JSX.Element {
  const goHome = useNavigationStore((state) => state.goHome)
  const printSheetResult = useStripStore((s) => s.printSheetResult)
  const wasPrinted = useStripStore((s) => s.wasPrinted)
  const { remainingSeconds } = useIdleTimeout({ onTimeout: goHome })
  const t = useT()

  const titleKey = wasPrinted ? 'thankyou.title' : 'thankyou.title.saved'
  const subtitleKey = wasPrinted ? 'thankyou.subtitle' : 'thankyou.subtitle.saved'

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t(titleKey)}</h1>
      <p className={styles.subtitle}>{t(subtitleKey)}</p>

      {printSheetResult?.dataUrl && (
        <img
          className={styles.stripPreview}
          src={printSheetResult.dataUrl}
          alt="Your photo strip"
        />
      )}

      <button className={styles.doneButton} onClick={goHome}>
        {t('thankyou.done')}
      </button>

      {remainingSeconds !== null && <IdleCountdown remainingSeconds={remainingSeconds} />}
    </div>
  )
}

export default ThankYouScreen
