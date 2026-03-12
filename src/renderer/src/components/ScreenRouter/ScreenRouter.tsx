import type { ComponentType } from 'react'
import { useNavigationStore } from '@/stores/navigationStore'
import type { ScreenName } from '@/stores/types'
import HomeScreen from '@/screens/HomeScreen/HomeScreen'
import SessionScreen from '@/screens/SessionScreen/SessionScreen'
import ReviewScreen from '@/screens/ReviewScreen/ReviewScreen'
import PrintScreen from '@/screens/PrintScreen/PrintScreen'
import ThankYouScreen from '@/screens/ThankYouScreen/ThankYouScreen'
import ErrorScreen from '@/screens/ErrorScreen/ErrorScreen'
import AdminScreen from '@/screens/AdminScreen/AdminScreen'
import styles from './ScreenRouter.module.css'

const screenMap: Record<ScreenName, ComponentType> = {
  home: HomeScreen,
  session: SessionScreen,
  review: ReviewScreen,
  print: PrintScreen,
  thankyou: ThankYouScreen,
  error: ErrorScreen,
  admin: AdminScreen
}

function ScreenRouter(): React.JSX.Element {
  const currentScreen = useNavigationStore((state) => state.currentScreen)
  const Screen = screenMap[currentScreen] ?? HomeScreen

  return (
    <div key={currentScreen} className={styles.screenTransition}>
      <Screen />
    </div>
  )
}

export default ScreenRouter
