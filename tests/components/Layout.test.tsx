import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import Layout from '@/components/Layout/Layout'
import { useNavigationStore } from '@/stores/navigationStore'

describe('Layout', () => {
  beforeEach(() => {
    useNavigationStore.getState().reset()
  })

  it('renders children', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    )
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('hides cursor on user-facing screens', () => {
    const { container } = render(
      <Layout>
        <div>Content</div>
      </Layout>
    )
    const layout = container.firstElementChild!
    expect(layout.className).toContain('cursorHidden')
  })

  it('shows cursor on admin screen', () => {
    useNavigationStore.getState().navigateTo('admin')
    const { container } = render(
      <Layout>
        <div>Content</div>
      </Layout>
    )
    const layout = container.firstElementChild!
    expect(layout.className).not.toContain('cursorHidden')
  })
})
