import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaUser, FaLock, FaEye, FaEyeSlash, FaBoxes } from 'react-icons/fa';

const Login = () => {
  const { login, isAuthenticated, loading, error, clearErrors } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const { email, password } = formData;

  useEffect(() => {
    clearErrors();
  }, [clearErrors]);

  const validateForm = () => {
    const errors = {};
    
    if (!email.trim()) {
      errors.email = 'E-posta adresi gereklidir';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Geçerli bir e-posta adresi giriniz';
    }
    
    if (!password) {
      errors.password = 'Şifre gereklidir';
    } else if (password.length < 6) {
      errors.password = 'Şifre en az 6 karakter olmalıdır';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear validation error when user starts typing
    if (validationErrors[e.target.name]) {
      setValidationErrors({ ...validationErrors, [e.target.name]: '' });
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    const result = await login(formData);
    setIsSubmitting(false);
    
    if (!result.success) {
      // Error is handled in AuthContext
    }
  };

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-vh-100 d-flex align-items-center bg-light">
      <Container>
        <Row className="justify-content-center">
          <Col md={6} lg={5} xl={4}>
            <Card className="shadow-lg border-0">
              <Card.Body className="p-5">
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <FaBoxes size={48} className="text-primary" />
                  </div>
                  <h2 className="fw-bold text-dark">Yüceler Makine Stok Yönetimi</h2>
                  <p className="text-muted">Hesabınıza giriş yapın</p>
                </div>

                {error && (
                  <Alert variant="danger" className="mb-4">
                    {error}
                  </Alert>
                )}

                <Form onSubmit={onSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">
                      <FaUser className="me-2" />
                      E-posta Adresi
                    </Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={email}
                      onChange={onChange}
                      placeholder="E-posta adresinizi giriniz"
                      isInvalid={!!validationErrors.email}
                      disabled={isSubmitting}
                      className="py-2"
                    />
                    <Form.Control.Feedback type="invalid">
                      {validationErrors.email}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold">
                      <FaLock className="me-2" />
                      Şifre
                    </Form.Label>
                    <div className="position-relative">
                      <Form.Control
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={password}
                        onChange={onChange}
                        placeholder="Şifrenizi giriniz"
                        isInvalid={!!validationErrors.password}
                        disabled={isSubmitting}
                        className="py-2 pe-5"
                      />
                      <Button
                        variant="link"
                        className="position-absolute end-0 top-50 translate-middle-y border-0 text-muted"
                        style={{ zIndex: 10 }}
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isSubmitting}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </Button>
                      <Form.Control.Feedback type="invalid">
                        {validationErrors.password}
                      </Form.Control.Feedback>
                    </div>
                  </Form.Group>

                  <div className="d-grid">
                    <Button
                      variant="primary"
                      type="submit"
                      size="lg"
                      disabled={isSubmitting || loading}
                      className="py-2 fw-semibold"
                    >
                      {isSubmitting ? (
                        <>
                          <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                            className="me-2"
                          />
                          Giriş yapılıyor...
                        </>
                      ) : (
                        'Giriş Yap'
                      )}
                    </Button>
                  </div>
                </Form>

                <hr className="my-4" />

                <div className="text-center">
                  <small className="text-muted">
                    Demo hesaplar:
                    <br />
                    <strong>Admin:</strong> admin@example.com / admin123
                    <br />
                    <strong>Kullanıcı:</strong> user@example.com / user123
                  </small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Login;