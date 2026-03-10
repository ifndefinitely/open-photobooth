import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useErrorStore } from '@/stores/errorStore'
import { logger } from '@/services/loggerService'
import ErrorScreen from '@/screens/ErrorScreen/ErrorScreen'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/**
 * Global error boundary that catches unhandled React errors.
 * Renders the ErrorScreen as a fallback and logs the error.
 *
 * Must be a class component — React requires this for error boundaries.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const timestamp = new Date().toISOString()
    const debugInfo = [
      `Error: ${error.message}`,
      `Timestamp: ${timestamp}`,
      '',
      error.stack ?? '(no stack trace)',
      '',
      `Component stack:${errorInfo.componentStack ?? ' (unavailable)'}`
    ].join('\n')

    logger.error('ErrorBoundary', `Unhandled error: ${error.message}\n${error.stack ?? ''}`)

    useErrorStore.getState().showError({ debugInfo })
  }

  componentDidMount(): void {
    // Catch unhandled promise rejections (not caught by React error boundary)
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection)
    window.addEventListener('error', this.handleGlobalError)
  }

  componentWillUnmount(): void {
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection)
    window.removeEventListener('error', this.handleGlobalError)
  }

  handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason))
    const timestamp = new Date().toISOString()
    const debugInfo = [
      `Unhandled Promise Rejection: ${error.message}`,
      `Timestamp: ${timestamp}`,
      '',
      error.stack ?? '(no stack trace)'
    ].join('\n')

    logger.error(
      'ErrorBoundary',
      `Unhandled promise rejection: ${error.message}\n${error.stack ?? ''}`
    )

    useErrorStore.getState().showError({ debugInfo })
    this.setState({ hasError: true })
  }

  handleGlobalError = (event: ErrorEvent): void => {
    // Only handle errors not already caught by React's error boundary
    if (this.state.hasError) return

    const timestamp = new Date().toISOString()
    const debugInfo = [
      `Error: ${event.message}`,
      `Timestamp: ${timestamp}`,
      `Source: ${event.filename ?? 'unknown'}:${event.lineno ?? '?'}:${event.colno ?? '?'}`,
      '',
      event.error?.stack ?? '(no stack trace)'
    ].join('\n')

    logger.error('ErrorBoundary', `Global error: ${event.message}`)

    useErrorStore.getState().showError({ debugInfo })
    this.setState({ hasError: true })
  }

  /**
   * Reset the boundary so it can render children again.
   * Called by the ErrorScreen's recovery flow.
   */
  resetBoundary = (): void => {
    this.setState({ hasError: false })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorScreen onResetBoundary={this.resetBoundary} />
    }
    return this.props.children
  }
}

export default ErrorBoundary
