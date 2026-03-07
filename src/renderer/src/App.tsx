import Layout from '@/components/Layout/Layout'
import ScreenRouter from '@/components/ScreenRouter/ScreenRouter'
import { useCameraLifecycle } from '@/hooks/useCameraLifecycle'

function App(): React.JSX.Element {
  useCameraLifecycle()

  return (
    <Layout>
      <ScreenRouter />
    </Layout>
  )
}

export default App
