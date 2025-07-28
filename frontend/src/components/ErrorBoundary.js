import React from 'react';
import { Alert, Container } from 'react-bootstrap';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container className="py-4">
          <Alert variant="danger">
            <Alert.Heading>Bir hata oluştu!</Alert.Heading>
            <p>Sayfa yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.</p>
            <details style={{ whiteSpace: 'pre-wrap' }}>
              <summary>Hata detayları (geliştiriciler için)</summary>
              {this.state.error && this.state.error.toString()}
              <br />
              {this.state.errorInfo.componentStack}
            </details>
          </Alert>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;