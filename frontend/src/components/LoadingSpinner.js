import React from 'react';
import { Spinner } from 'react-bootstrap';

const LoadingSpinner = ({ size = 'lg', text = 'Yükleniyor...', variant = 'primary' }) => {
  return (
    <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '200px' }}>
      <Spinner animation="border" variant={variant} size={size} />
      {text && <p className="mt-3 text-muted">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;