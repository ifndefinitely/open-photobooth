import Layout from '@/components/Layout/Layout'
import ScreenRouter from '@/components/ScreenRouter/ScreenRouter'
import { useCameraLifecycle } from '@/hooks/useCameraLifecycle'
import { useMusicLifecycle } from '@/hooks/useMusicLifecycle'
import { useSettingsPersistence } from '@/hooks/useSettingsPersistence'

function App(): React.JSX.Element {
  const { ready } = useSettingsPersistence()
  useCameraLifecycle()
  useMusicLifecycle()

  if (!ready) {
    return <div />
  }

  return (
    <Layout>
      <ScreenRouter />
    </Layout>
  )
}

export default App
